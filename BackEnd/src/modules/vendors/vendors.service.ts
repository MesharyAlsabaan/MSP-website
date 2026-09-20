import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource, EntityManager, In } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { completionRequestMail, teamSubmissionMail, VendorMailContext } from '../mail/templates/vendor-mails';
import { CompletionTokenService } from './completion-token.service';
import {
  Vendor,
  VendorApplication,
  VendorApplicationRevision,
  VendorCategory,
  VendorDocumentRequirement,
  VendorReviewEvent,
  VendorRevisionDocument,
  VendorStoredFile,
} from './entities';
import { UPLOAD_LIMITS, validateUpload } from './file-validation';
import { NumberingService } from './numbering.service';
import { canVendorResubmit } from './qualification.rules';
import { DOCUMENT_STORAGE, DocumentStorage, storageKeyFor } from './storage/document-storage';
import { QualificationStatus, ReviewAction, VendorProfileData } from './vendor.enums';

/** A file as received from multer, tagged with the requirement it satisfies. */
export interface UploadedDoc {
  docTypeKey: string;
  originalname: string;
  buffer: Buffer;
  size: number;
}

/** Profile fields plus the expiry dates the form collected per document type. */
export type SubmitInput = VendorProfileData & { expiries?: Record<string, string> };

export interface VendorsPublicConfig {
  /** Base URL of the public site, for links in emails (e.g. https://www.msp.sa). */
  publicUrl: string;
  /** Review-team inbox; empty string disables team notifications. */
  reviewInbox: string;
}
export const VENDORS_PUBLIC_CONFIG = Symbol('VENDORS_PUBLIC_CONFIG');

export interface CategoryView {
  key: string;
  nameAr: string;
  nameEn: string;
  requirements: Pick<VendorDocumentRequirement, 'docTypeKey' | 'nameAr' | 'nameEn' | 'required' | 'requiresExpiry'>[];
}

export interface ResumeContext {
  requestNumber: string;
  vendorNumber: string;
  revisionNo: number;
  data: VendorProfileData;
  documents: { id: string; docTypeKey: string; originalFilename: string; expiresAt: string | null; sizeBytes: number }[];
  missingItems: string[];
  note: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The vendor-facing half of the module: registration, completion links and
 * resubmission. Every write is one transaction; document bytes are stored
 * (content-addressed) before the transaction, which is harmless if it fails.
 */
@Injectable()
export class VendorsService {
  private readonly log = new Logger(VendorsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly numbering: NumberingService,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
    private readonly mail: MailService,
    private readonly tokens: CompletionTokenService,
    @Inject(VENDORS_PUBLIC_CONFIG) private readonly cfg: VendorsPublicConfig,
  ) {}

  async listCategories(): Promise<CategoryView[]> {
    const cats = await this.dataSource.getRepository(VendorCategory).find({
      where: { active: true },
      order: { sortOrder: 'ASC' },
      relations: { requirements: true },
    });
    return cats.map((c) => ({
      key: c.key,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      requirements: [...c.requirements]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ docTypeKey, nameAr, nameEn, required, requiresExpiry }) => ({ docTypeKey, nameAr, nameEn, required, requiresExpiry })),
    }));
  }

  // ---------------------------------------------------------------- submit

  async submit(input: SubmitInput, files: UploadedDoc[]): Promise<{ requestNumber: string; vendorNumber: string; applicationId: string }> {
    const category = await this.requireCategory(input.primaryCategoryKey);
    await this.assertCategoriesExist(input.secondaryCategoryKeys);
    const data = this.cleanProfile(input);
    const uploads = await this.validateAndStore(files);
    const requirements = await this.requirementsFor(category.key);
    const docs = this.mergeDocuments(requirements, uploads, [], input.expiries ?? {});

    const created = await this.dataSource.transaction(async (m) => {
      const vendorNumber = await this.numbering.nextVendorNumber(m);
      const requestNumber = await this.numbering.nextRequestNumber(m);
      const vendor = await m.getRepository(Vendor).save({
        vendorNumber,
        companyName: data.companyName,
        companyNameEn: data.companyNameEn ?? '',
        primaryCategoryKey: data.primaryCategoryKey,
        secondaryCategoryKeys: data.secondaryCategoryKeys,
        approvedRevisionId: null,
      });
      const app = await m.getRepository(VendorApplication).save({
        requestNumber,
        vendorId: vendor.id,
        status: QualificationStatus.UnderReview,
        currentRevisionNo: 1,
        submitterEmail: data.email,
      });
      const revision = await this.writeRevision(m, app.id, 1, data, docs);
      await m.getRepository(VendorReviewEvent).save({
        applicationId: app.id,
        revisionId: revision.id,
        action: ReviewAction.Submitted,
        actorUserId: null,
        actorName: data.contactName,
      });
      return { app, vendor, revision };
    });

    await this.notifyTeam(created.app, created.vendor, created.revision, category, false);
    return { requestNumber: created.app.requestNumber, vendorNumber: created.vendor.vendorNumber, applicationId: created.app.id };
  }

  // ---------------------------------------------------------------- resume / resubmit

  async getResumeContext(token: string): Promise<ResumeContext> {
    const t = await this.tokens.resolve(token);
    const app = await this.dataSource.getRepository(VendorApplication).findOneOrFail({ where: { id: t.applicationId }, relations: { vendor: true } });
    if (!canVendorResubmit(app.status)) {
      throw new ConflictException(`This application is ${app.status.replace('_', ' ')} and cannot be edited.`);
    }
    const revision = await this.latestRevision(this.dataSource.manager, app.id);
    const documents = await this.dataSource.getRepository(VendorRevisionDocument).find({ where: { revisionId: revision.id } });
    const lastRequest = await this.dataSource.getRepository(VendorReviewEvent).findOne({
      where: { applicationId: app.id, action: In([ReviewAction.CompletionRequested, ReviewAction.UpdateRequested]) },
      order: { createdAt: 'DESC' },
    });
    return {
      requestNumber: app.requestNumber,
      vendorNumber: app.vendor.vendorNumber,
      revisionNo: revision.revisionNo,
      data: revision.data,
      documents: documents.map((d) => ({
        id: d.id,
        docTypeKey: d.docTypeKey,
        originalFilename: d.originalFilename,
        expiresAt: d.expiresAt,
        sizeBytes: Number(d.storedFile.sizeBytes),
      })),
      missingItems: lastRequest?.missingItems ?? [],
      note: lastRequest?.note ?? '',
    };
  }

  async resubmit(token: string, input: SubmitInput, files: UploadedDoc[]): Promise<{ requestNumber: string; revisionNo: number }> {
    const t = await this.tokens.resolve(token);
    const category = await this.requireCategory(input.primaryCategoryKey);
    await this.assertCategoriesExist(input.secondaryCategoryKeys);
    const data = this.cleanProfile(input);
    const uploads = await this.validateAndStore(files);
    const requirements = await this.requirementsFor(category.key);

    const result = await this.dataSource.transaction(async (m) => {
      const app = await m.getRepository(VendorApplication).findOneOrFail({
        where: { id: t.applicationId },
        relations: { vendor: true },
        lock: { mode: 'pessimistic_write', tables: ['vendor_applications'] },
      });
      if (!canVendorResubmit(app.status)) {
        throw new ConflictException(`This application is ${app.status.replace('_', ' ')} and cannot be edited.`);
      }
      const previous = await this.latestRevision(m, app.id);
      const carried = await m.getRepository(VendorRevisionDocument).find({ where: { revisionId: previous.id } });
      const docs = this.mergeDocuments(requirements, uploads, carried, input.expiries ?? {});

      const revisionNo = previous.revisionNo + 1;
      const revision = await this.writeRevision(m, app.id, revisionNo, data, docs);
      app.status = QualificationStatus.UnderReview;
      app.currentRevisionNo = revisionNo;
      app.submitterEmail = data.email;
      await m.getRepository(VendorApplication).save(app);
      app.vendor.companyName = data.companyName;
      app.vendor.companyNameEn = data.companyNameEn ?? '';
      app.vendor.primaryCategoryKey = data.primaryCategoryKey;
      app.vendor.secondaryCategoryKeys = data.secondaryCategoryKeys;
      await m.getRepository(Vendor).save(app.vendor);
      await m.getRepository(VendorReviewEvent).save({
        applicationId: app.id,
        revisionId: revision.id,
        action: ReviewAction.Resubmitted,
        actorUserId: null,
        actorName: data.contactName,
      });
      await this.tokens.consume(m, t.id);
      return { app, revision };
    });

    await this.notifyTeam(result.app, result.app.vendor, result.revision, category, true);
    return { requestNumber: result.app.requestNumber, revisionNo: result.revision.revisionNo };
  }

  /** Used by the review service: issue a link and email the vendor what is missing. */
  async sendCompletionRequest(manager: EntityManager, app: VendorApplication, vendor: Vendor, revision: VendorApplicationRevision, missingItems: string[], note: string): Promise<void> {
    const token = await this.tokens.issue(manager, app.id);
    const url = `${this.cfg.publicUrl.replace(/\/$/, '')}/vendors/resume/${token}`;
    const ctx = await this.mailContext(app, vendor, revision);
    await this.mail.send({ to: app.submitterEmail, ...completionRequestMail(ctx, url, missingItems, note) });
  }

  async mailContext(app: VendorApplication, vendor: Vendor, revision: VendorApplicationRevision): Promise<VendorMailContext> {
    const cat = await this.dataSource.getRepository(VendorCategory).findOneBy({ key: vendor.primaryCategoryKey });
    return {
      requestNumber: app.requestNumber,
      vendorNumber: vendor.vendorNumber,
      companyName: vendor.companyName,
      categoryName: cat?.nameAr ?? vendor.primaryCategoryKey,
      contactName: revision.data.contactName,
      revisionNo: revision.revisionNo,
    };
  }

  // ---------------------------------------------------------------- internals

  private async requireCategory(key: string): Promise<VendorCategory> {
    const cat = key ? await this.dataSource.getRepository(VendorCategory).findOneBy({ key, active: true }) : null;
    if (!cat) throw new BadRequestException('Unknown or inactive category.');
    return cat;
  }

  private async assertCategoriesExist(keys: string[] | undefined): Promise<void> {
    if (!keys?.length) return;
    const found = await this.dataSource.getRepository(VendorCategory).countBy({ key: In(keys), active: true });
    if (found !== new Set(keys).size) throw new BadRequestException('Unknown secondary category.');
  }

  private requirementsFor(categoryKey: string): Promise<VendorDocumentRequirement[]> {
    return this.dataSource.getRepository(VendorDocumentRequirement).find({ where: { categoryKey }, order: { sortOrder: 'ASC' } });
  }

  private cleanProfile(input: SubmitInput): VendorProfileData {
    const s = (v: unknown, max = 200): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const required = (v: unknown, label: string, max?: number): string => {
      const out = s(v, max);
      if (!out) throw new BadRequestException(`${label} is required.`);
      return out;
    };
    const secondary = Array.isArray(input.secondaryCategoryKeys) ? input.secondaryCategoryKeys.map((k) => s(k, 64)).filter(Boolean) : [];
    return {
      companyName: required(input.companyName, 'Company name'),
      companyNameEn: s(input.companyNameEn) || undefined,
      specialty: s(input.specialty) || undefined,
      contactName: required(input.contactName, 'Contact name'),
      phone: s(input.phone, 32) || undefined,
      mobile: required(input.mobile, 'Mobile', 32),
      email: required(input.email, 'Email', 254).toLowerCase(),
      city: required(input.city, 'City', 100),
      address: s(input.address, 500) || undefined,
      commercialRegistrationNo: required(input.commercialRegistrationNo, 'Commercial registration number', 32),
      vatNo: s(input.vatNo, 32) || undefined,
      website: s(input.website, 200) || undefined,
      primaryCategoryKey: required(input.primaryCategoryKey, 'Category', 64),
      secondaryCategoryKeys: [...new Set(secondary)].filter((k) => k !== input.primaryCategoryKey),
      notes: s(input.notes, 2000) || undefined,
    };
  }

  /** Validates every upload (type, size, totals) and stores the bytes content-addressed. */
  private async validateAndStore(files: UploadedDoc[]): Promise<(UploadedDoc & { sha256: string; mime: string; storedFileId: string })[]> {
    if (files.length > UPLOAD_LIMITS.maxFilesPerRevision) {
      throw new BadRequestException(`At most ${UPLOAD_LIMITS.maxFilesPerRevision} files per submission.`);
    }
    let total = 0;
    const out: (UploadedDoc & { sha256: string; mime: string; storedFileId: string })[] = [];
    for (const f of files) {
      const { mime } = validateUpload(f, total);
      total += f.size;
      const sha256 = createHash('sha256').update(f.buffer).digest('hex');
      const key = storageKeyFor(sha256);
      await this.storage.put(key, f.buffer);
      const repo = this.dataSource.getRepository(VendorStoredFile);
      let stored = await repo.findOneBy({ sha256 });
      if (!stored) {
        try {
          stored = await repo.save({ sha256, sizeBytes: String(f.size), mime, storageKey: key });
        } catch {
          stored = await repo.findOneByOrFail({ sha256 }); // lost a race with a concurrent identical upload
        }
      }
      out.push({ ...f, sha256, mime, storedFileId: stored.id });
    }
    return out;
  }

  /**
   * Decides the document set of a revision: new uploads replace carried-over
   * documents of the same type; types with no new upload keep the previous
   * revision's documents. Then checks required types and expiry dates.
   */
  private mergeDocuments(
    requirements: VendorDocumentRequirement[],
    uploads: (UploadedDoc & { storedFileId: string })[],
    carried: VendorRevisionDocument[],
    expiries: Record<string, string>,
  ): Omit<VendorRevisionDocument, 'id' | 'revisionId' | 'revision' | 'storedFile' | 'createdAt' | 'updatedAt'>[] {
    const byType = new Map(requirements.map((r) => [r.docTypeKey, r]));
    for (const u of uploads) {
      if (!byType.has(u.docTypeKey)) throw new BadRequestException(`Document type "${u.docTypeKey}" is not accepted for this category.`);
    }
    const uploadedTypes = new Set(uploads.map((u) => u.docTypeKey));
    const kept = carried.filter((c) => byType.has(c.docTypeKey) && !uploadedTypes.has(c.docTypeKey));
    const docs = [
      ...kept.map((c) => ({ docTypeKey: c.docTypeKey, originalFilename: c.originalFilename, storedFileId: c.storedFileId, expiresAt: expiries[c.docTypeKey] ?? c.expiresAt })),
      ...uploads.map((u) => ({ docTypeKey: u.docTypeKey, originalFilename: u.originalname.slice(0, 255), storedFileId: u.storedFileId, expiresAt: expiries[u.docTypeKey] ?? null })),
    ];
    for (const r of requirements) {
      const present = docs.filter((d) => d.docTypeKey === r.docTypeKey);
      if (r.required && present.length === 0) throw new BadRequestException(`Required document missing: ${r.nameAr} (${r.docTypeKey}).`);
      if (r.requiresExpiry) {
        for (const d of present) {
          if (!d.expiresAt || !DATE_RE.test(d.expiresAt)) {
            throw new BadRequestException(`Expiry date (تاريخ الانتهاء) is required for ${r.nameAr} (${r.docTypeKey}).`);
          }
        }
      }
    }
    return docs;
  }

  private async writeRevision(m: EntityManager, applicationId: string, revisionNo: number, data: VendorProfileData, docs: ReturnType<VendorsService['mergeDocuments']>): Promise<VendorApplicationRevision> {
    const revision = await m.getRepository(VendorApplicationRevision).save({
      applicationId,
      revisionNo,
      data,
      submittedAt: new Date(),
      decision: null,
      decidedAt: null,
      decidedByUserId: null,
      decidedByName: '',
      decisionNote: '',
    });
    await m.getRepository(VendorRevisionDocument).save(docs.map((d) => ({ ...d, revisionId: revision.id })));
    return revision;
  }

  private latestRevision(m: EntityManager, applicationId: string): Promise<VendorApplicationRevision> {
    return m.getRepository(VendorApplicationRevision).findOneOrFail({ where: { applicationId }, order: { revisionNo: 'DESC' } });
  }

  private async notifyTeam(app: VendorApplication, vendor: Vendor, revision: VendorApplicationRevision, category: VendorCategory, resubmitted: boolean): Promise<void> {
    if (!this.cfg.reviewInbox) {
      this.log.warn(`VENDOR_REVIEW_INBOX not set — no team notification for ${app.requestNumber}`);
      return;
    }
    const ctx: VendorMailContext = {
      requestNumber: app.requestNumber,
      vendorNumber: vendor.vendorNumber,
      companyName: vendor.companyName,
      categoryName: category.nameAr,
      contactName: revision.data.contactName,
      revisionNo: revision.revisionNo,
    };
    const url = `${this.cfg.publicUrl.replace(/\/$/, '')}/admin/vendors/${app.id}`;
    await this.mail.send({ to: this.cfg.reviewInbox, replyTo: app.submitterEmail, ...teamSubmissionMail(ctx, url, resubmitted) });
  }
}
