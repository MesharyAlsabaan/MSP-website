import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { completionRequestMail, teamSubmissionMail, VendorMailContext } from '../mail/templates/vendor-mails';
import {
  Vendor,
  VendorAccount,
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
import { DOCUMENT_STORAGE, DocumentStorage, storageKeyFor } from './storage/document-storage';
import { QualificationStatus, ReviewAction, VendorProfileData } from './vendor.enums';

/** A file as received from multer. */
export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}

/** What the vendor may edit on the draft: profile fields plus per-type expiry dates. */
export type DraftInput = Partial<VendorProfileData> & { expiries?: Record<string, string> };

export interface VendorsPublicConfig {
  publicUrl: string;
  /** Review-team inbox (supply@msp.sa in production); empty disables team mail. */
  reviewInbox: string;
}
export const VENDORS_PUBLIC_CONFIG = Symbol('VENDORS_PUBLIC_CONFIG');

export interface CategoryView {
  key: string;
  nameAr: string;
  nameEn: string;
  requirements: Pick<VendorDocumentRequirement, 'docTypeKey' | 'nameAr' | 'nameEn' | 'required' | 'requiresExpiry'>[];
}

export interface DocumentView {
  id: string;
  docTypeKey: string;
  originalFilename: string;
  expiresAt: string | null;
  sizeBytes: number;
  mime: string;
}

export interface RevisionView {
  id: string;
  revisionNo: number;
  data: Partial<VendorProfileData> & { expiries?: Record<string, string> };
  submittedAt: Date | null;
  decision: string | null;
  decidedAt: Date | null;
  decisionNote: string;
  documents: DocumentView[];
}

/** Everything the vendor's dashboard needs, and nothing that belongs to anyone else. */
export interface MyApplicationView {
  vendor: Pick<Vendor, 'id' | 'vendorNumber' | 'companyName' | 'primaryCategoryKey' | 'secondaryCategoryKeys'>;
  application: { id: string; requestNumber: string | null; status: QualificationStatus; currentRevisionNo: number };
  /** Editable revision, or null while the team is reviewing / after a final decision. */
  draft: RevisionView | null;
  /** Latest submitted revision (what the team sees), if any. */
  submitted: RevisionView | null;
  /** Latest reviewer message addressed to the vendor. */
  review: { action: string; missingItems: string[]; note: string; at: Date } | null;
  history: { action: string; note: string; missingItems: string[]; at: Date }[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const EDITABLE = [QualificationStatus.Draft, QualificationStatus.NeedsCompletion];

/**
 * The vendor's side of the office service. Every method takes the calling
 * account's id and only ever touches that account's vendor record: there is
 * no way to address another vendor's application, document or draft.
 *
 * Model: an application has revisions; the one with `submittedAt = null` is
 * the vendor's draft. Submitting freezes it. A completion round (opened by
 * staff) clones it into a new draft. Document bytes are content-addressed, so
 * a retried upload or a carried-over file never stores twice.
 */
@Injectable()
export class VendorsService {
  private readonly log = new Logger(VendorsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly numbering: NumberingService,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
    private readonly mail: MailService,
    @Inject(VENDORS_PUBLIC_CONFIG) private readonly cfg: VendorsPublicConfig,
  ) {}

  async listCategories(): Promise<CategoryView[]> {
    const cats = await this.dataSource.getRepository(VendorCategory).find({ where: { active: true }, order: { sortOrder: 'ASC' }, relations: { requirements: true } });
    return cats.map((c) => ({
      key: c.key,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      requirements: [...c.requirements].sort((a, b) => a.sortOrder - b.sortOrder).map(({ docTypeKey, nameAr, nameEn, required, requiresExpiry }) => ({ docTypeKey, nameAr, nameEn, required, requiresExpiry })),
    }));
  }

  // ---------------------------------------------------------------- read

  async getMyApplication(accountId: string): Promise<MyApplicationView> {
    const { vendor, app } = await this.ensureVendor(accountId);
    return this.view(vendor, app);
  }

  async openMyDocument(accountId: string, documentId: string): Promise<{ stream: Readable; filename: string; mime: string; sizeBytes: number }> {
    const { app } = await this.ensureVendor(accountId);
    const doc = await this.dataSource.getRepository(VendorRevisionDocument).findOne({ where: { id: documentId }, relations: { revision: true } });
    if (!doc || doc.revision.applicationId !== app.id) throw new NotFoundException('Document not found');
    return { stream: this.storage.get(doc.storedFile.storageKey), filename: doc.originalFilename, mime: doc.storedFile.mime, sizeBytes: Number(doc.storedFile.sizeBytes) };
  }

  // ---------------------------------------------------------------- draft

  async saveDraft(accountId: string, input: DraftInput): Promise<MyApplicationView> {
    const { vendor, app } = await this.ensureVendor(accountId);
    const draft = await this.requireDraft(app);
    const merged: Partial<VendorProfileData> = { ...draft.data, ...this.cleanPartial(input) };
    if (input.expiries) merged.expiries = { ...(draft.data.expiries ?? {}), ...this.cleanExpiries(input.expiries) };
    if (merged.primaryCategoryKey) await this.assertCategoriesExist([merged.primaryCategoryKey, ...(merged.secondaryCategoryKeys ?? [])]);
    draft.data = merged as VendorProfileData;
    await this.dataSource.getRepository(VendorApplicationRevision).save(draft);
    return this.view(vendor, app);
  }

  async addDraftDocument(accountId: string, docTypeKey: string, upload: UploadedFile, expiresAt?: string | null): Promise<DocumentView> {
    const { vendor, app } = await this.ensureVendor(accountId);
    const draft = await this.requireDraft(app);
    const category = draft.data.primaryCategoryKey || vendor.primaryCategoryKey;
    const allowed = category ? await this.dataSource.getRepository(VendorDocumentRequirement).findBy({ categoryKey: category }) : [];
    if (!/^[a-z0-9-]{1,64}$/.test(docTypeKey) || (allowed.length && !allowed.some((r) => r.docTypeKey === docTypeKey))) {
      throw new BadRequestException(`Document type "${docTypeKey}" is not accepted for this category.`);
    }
    const docRepo = this.dataSource.getRepository(VendorRevisionDocument);
    const existingDocs = await docRepo.find({ where: { revisionId: draft.id } });
    if (existingDocs.length >= UPLOAD_LIMITS.maxFilesPerRevision) throw new BadRequestException(`At most ${UPLOAD_LIMITS.maxFilesPerRevision} documents per application.`);
    const soFar = existingDocs.reduce((n, d) => n + Number(d.storedFile.sizeBytes), 0);
    const { mime } = validateUpload(upload, soFar);
    const exp = expiresAt && DATE_RE.test(expiresAt) ? expiresAt : null;

    const sha256 = createHash('sha256').update(upload.buffer).digest('hex');
    const same = existingDocs.find((d) => d.docTypeKey === docTypeKey && d.storedFile.sha256 === sha256);
    if (same) {
      if (exp && same.expiresAt !== exp) { same.expiresAt = exp; await docRepo.save(same); }
      return this.docView(same);
    }
    const key = storageKeyFor(sha256);
    await this.storage.put(key, upload.buffer);
    const fileRepo = this.dataSource.getRepository(VendorStoredFile);
    let stored = await fileRepo.findOneBy({ sha256 });
    if (!stored) {
      try { stored = await fileRepo.save({ sha256, sizeBytes: String(upload.size), mime, storageKey: key }); }
      catch { stored = await fileRepo.findOneByOrFail({ sha256 }); }
    }
    const saved = await docRepo.save({ revisionId: draft.id, docTypeKey, originalFilename: upload.originalname.slice(0, 255), storedFileId: stored.id, expiresAt: exp });
    return this.docView(await docRepo.findOneOrFail({ where: { id: saved.id } }));
  }

  async removeDraftDocument(accountId: string, documentId: string): Promise<void> {
    const { app } = await this.ensureVendor(accountId);
    const draft = await this.requireDraft(app).catch(() => null);
    const doc = await this.dataSource.getRepository(VendorRevisionDocument).findOne({ where: { id: documentId }, relations: { revision: true } });
    if (!doc || doc.revision.applicationId !== app.id) throw new NotFoundException('Document not found');
    if (!draft || doc.revisionId !== draft.id) throw new ConflictException('Only documents of the current draft can be removed.');
    await this.dataSource.getRepository(VendorRevisionDocument).delete(doc.id); // the stored bytes stay (content-addressed, may be shared)
  }

  // ---------------------------------------------------------------- submit

  /**
   * Validates the draft, issues the request number (first time only), freezes
   * the revision and notifies the team. Idempotent: if nothing is pending
   * (the previous call succeeded but the response was lost) it returns the
   * current numbers without creating anything.
   */
  async submit(accountId: string): Promise<{ requestNumber: string; vendorNumber: string; revisionNo: number }> {
    const { vendor, app } = await this.ensureVendor(accountId);
    const draft = await this.findDraft(app.id);
    if (!draft) {
      if (!app.requestNumber) throw new ConflictException('Nothing to submit.');
      return { requestNumber: app.requestNumber, vendorNumber: vendor.vendorNumber, revisionNo: app.currentRevisionNo };
    }
    if (!EDITABLE.includes(app.status)) throw new ConflictException(`Application is ${app.status} and cannot be submitted.`);

    const data = this.cleanProfile(draft.data);
    const category = await this.requireCategory(data.primaryCategoryKey);
    await this.assertCategoriesExist(data.secondaryCategoryKeys);
    const requirements = await this.dataSource.getRepository(VendorDocumentRequirement).find({ where: { categoryKey: category.key }, order: { sortOrder: 'ASC' } });
    const docs = await this.dataSource.getRepository(VendorRevisionDocument).find({ where: { revisionId: draft.id } });
    this.assertRequirements(requirements, docs, draft.data.expiries ?? {});

    const resubmitted = !!app.requestNumber;
    const result = await this.dataSource.transaction(async (m) => {
      const locked = await m.getRepository(VendorApplication).findOneOrFail({ where: { id: app.id }, lock: { mode: 'pessimistic_write' } });
      if (!EDITABLE.includes(locked.status)) throw new ConflictException('Application was already submitted.');
      if (!locked.requestNumber) locked.requestNumber = await this.numbering.nextRequestNumber(m);
      locked.status = QualificationStatus.UnderReview;
      locked.currentRevisionNo = draft.revisionNo;
      locked.submitterEmail = data.email;
      await m.getRepository(VendorApplication).save(locked);
      // expiry dates move from the draft's scratch space onto the documents
      for (const d of docs) {
        const exp = draft.data.expiries?.[d.docTypeKey];
        if (exp && d.expiresAt !== exp) await m.getRepository(VendorRevisionDocument).update(d.id, { expiresAt: exp });
      }
      draft.data = { ...data, expiries: draft.data.expiries } as VendorProfileData;
      draft.submittedAt = new Date();
      await m.getRepository(VendorApplicationRevision).save(draft);
      vendor.companyName = data.companyName;
      vendor.companyNameEn = data.companyNameEn ?? '';
      vendor.country = data.country;
      vendor.primaryCategoryKey = data.primaryCategoryKey;
      vendor.secondaryCategoryKeys = data.secondaryCategoryKeys;
      await m.getRepository(Vendor).save(vendor);
      await m.getRepository(VendorReviewEvent).save({ applicationId: app.id, revisionId: draft.id, action: resubmitted ? ReviewAction.Resubmitted : ReviewAction.Submitted, actorUserId: null, actorName: data.contactName });
      return locked;
    });

    await this.notifyTeam(result, vendor, draft, category, resubmitted);
    return { requestNumber: result.requestNumber!, vendorNumber: vendor.vendorNumber, revisionNo: draft.revisionNo };
  }

  // ---------------------------------------------------------------- staff-side helpers

  /**
   * Opens a completion/update round: status → needs_completion, a new draft
   * revision cloned from the current one (documents carried over by
   * reference), the reviewer's notes logged, and the vendor e-mailed.
   * Called inside the review transaction.
   */
  async openRevisionRound(m: EntityManager, applicationId: string, missingItems: string[], note: string, actor?: { id: string; name: string }, action: ReviewAction = ReviewAction.CompletionRequested): Promise<VendorApplicationRevision> {
    const app = await m.getRepository(VendorApplication).findOneOrFail({ where: { id: applicationId }, relations: { vendor: true } });
    const current = await m.getRepository(VendorApplicationRevision).findOneOrFail({ where: { applicationId, revisionNo: app.currentRevisionNo } });
    if (!current.submittedAt) throw new ConflictException('The current revision is still a draft.');
    const draft = await m.getRepository(VendorApplicationRevision).save({
      applicationId, revisionNo: current.revisionNo + 1, data: current.data, submittedAt: null, decision: null, decidedAt: null, decidedByUserId: null, decidedByName: '', decisionNote: '',
    });
    const docs = await m.getRepository(VendorRevisionDocument).find({ where: { revisionId: current.id } });
    if (docs.length) await m.getRepository(VendorRevisionDocument).save(docs.map((d) => ({ revisionId: draft.id, docTypeKey: d.docTypeKey, originalFilename: d.originalFilename, storedFileId: d.storedFileId, expiresAt: d.expiresAt })));
    app.status = QualificationStatus.NeedsCompletion;
    app.currentRevisionNo = draft.revisionNo;
    await m.getRepository(VendorApplication).save(app);
    await m.getRepository(VendorReviewEvent).save({ applicationId, revisionId: current.id, action, note, missingItems, actorUserId: actor?.id ?? null, actorName: actor?.name ?? '' });
    const ctx = await this.mailContext(app, app.vendor, current);
    await this.mail.send({ to: app.submitterEmail, ...completionRequestMail(ctx, `${this.base()}/vendors/login`, missingItems, note) });
    return draft;
  }

  async mailContext(app: VendorApplication, vendor: Vendor, revision: VendorApplicationRevision): Promise<VendorMailContext> {
    const cat = await this.dataSource.getRepository(VendorCategory).findOneBy({ key: vendor.primaryCategoryKey });
    return { requestNumber: app.requestNumber ?? '—', vendorNumber: vendor.vendorNumber, companyName: vendor.companyName, categoryName: cat?.nameAr ?? vendor.primaryCategoryKey, contactName: revision.data.contactName ?? '', revisionNo: revision.revisionNo };
  }

  // ---------------------------------------------------------------- internals

  /** The account's vendor + application, created (as a draft) on first use. */
  private async ensureVendor(accountId: string): Promise<{ vendor: Vendor; app: VendorApplication }> {
    const account = await this.dataSource.getRepository(VendorAccount).findOneBy({ id: accountId });
    if (!account || !account.active) throw new ForbiddenException('Account not found or disabled.');
    let vendor = await this.dataSource.getRepository(Vendor).findOneBy({ accountId });
    if (!vendor) {
      vendor = await this.dataSource.transaction(async (m) => {
        const again = await m.getRepository(Vendor).findOneBy({ accountId });
        if (again) return again;
        const created = await m.getRepository(Vendor).save({ accountId, vendorNumber: await this.numbering.nextVendorNumber(m), companyName: '', companyNameEn: '', primaryCategoryKey: '', secondaryCategoryKeys: [], approvedRevisionId: null });
        const app = await m.getRepository(VendorApplication).save({ vendorId: created.id, requestNumber: null, status: QualificationStatus.Draft, currentRevisionNo: 1, submitterEmail: account.email });
        await m.getRepository(VendorApplicationRevision).save({ applicationId: app.id, revisionNo: 1, data: { contactName: account.contactName, email: account.email } as VendorProfileData, submittedAt: null, decision: null, decidedAt: null, decidedByUserId: null, decidedByName: '', decisionNote: '' });
        return created;
      });
    }
    const app = await this.dataSource.getRepository(VendorApplication).findOneOrFail({ where: { vendorId: vendor.id }, order: { createdAt: 'DESC' } });
    return { vendor, app };
  }

  private findDraft(applicationId: string): Promise<VendorApplicationRevision | null> {
    return this.dataSource.getRepository(VendorApplicationRevision).findOne({ where: { applicationId, submittedAt: IsNull() }, order: { revisionNo: 'DESC' } });
  }

  private async requireDraft(app: VendorApplication): Promise<VendorApplicationRevision> {
    const draft = EDITABLE.includes(app.status) ? await this.findDraft(app.id) : null;
    if (!draft) throw new ConflictException(`Application is ${app.status.replace('_', ' ')} and not editable right now.`);
    return draft;
  }

  private async view(vendor: Vendor, app: VendorApplication): Promise<MyApplicationView> {
    const revisions = await this.dataSource.getRepository(VendorApplicationRevision).find({ where: { applicationId: app.id }, relations: { documents: true }, order: { revisionNo: 'DESC' } });
    const draft = EDITABLE.includes(app.status) ? revisions.find((r) => !r.submittedAt) ?? null : null;
    const submitted = revisions.find((r) => !!r.submittedAt) ?? null;
    const events = await this.dataSource.getRepository(VendorReviewEvent).find({ where: { applicationId: app.id }, order: { createdAt: 'ASC' } });
    const toVendor = [...events].reverse().find((e) => [ReviewAction.CompletionRequested, ReviewAction.UpdateRequested, ReviewAction.Approved, ReviewAction.Rejected].includes(e.action));
    const rv = (r: VendorApplicationRevision): RevisionView => ({ id: r.id, revisionNo: r.revisionNo, data: r.data, submittedAt: r.submittedAt, decision: r.decision, decidedAt: r.decidedAt, decisionNote: r.decisionNote, documents: r.documents.map((d) => this.docView(d)) });
    return {
      vendor: { id: vendor.id, vendorNumber: vendor.vendorNumber, companyName: vendor.companyName, primaryCategoryKey: vendor.primaryCategoryKey, secondaryCategoryKeys: vendor.secondaryCategoryKeys },
      application: { id: app.id, requestNumber: app.requestNumber, status: app.status, currentRevisionNo: app.currentRevisionNo },
      draft: draft ? rv(draft) : null,
      submitted: submitted ? rv(submitted) : null,
      review: toVendor ? { action: toVendor.action, missingItems: toVendor.missingItems, note: toVendor.note, at: toVendor.createdAt } : null,
      history: events.map((e) => ({ action: e.action, note: e.note, missingItems: e.missingItems, at: e.createdAt })),
    };
  }

  private docView(d: VendorRevisionDocument): DocumentView {
    return { id: d.id, docTypeKey: d.docTypeKey, originalFilename: d.originalFilename, expiresAt: d.expiresAt, sizeBytes: Number(d.storedFile.sizeBytes), mime: d.storedFile.mime };
  }

  private async requireCategory(key: string): Promise<VendorCategory> {
    const cat = key ? await this.dataSource.getRepository(VendorCategory).findOneBy({ key, active: true }) : null;
    if (!cat) throw new BadRequestException('Choose a category.');
    return cat;
  }

  private async assertCategoriesExist(keys: string[] | undefined): Promise<void> {
    const list = [...new Set((keys ?? []).filter(Boolean))];
    if (!list.length) return;
    const found = await this.dataSource.getRepository(VendorCategory).countBy({ key: In(list), active: true });
    if (found !== list.length) throw new BadRequestException('Unknown category.');
  }

  /** Trims and bounds whatever fields were sent; nothing is required at draft time. */
  private cleanPartial(input: DraftInput): Partial<VendorProfileData> {
    const s = (v: unknown, max = 200): string | undefined => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
    const out: Partial<VendorProfileData> = {};
    const set = <K extends keyof VendorProfileData>(k: K, v: VendorProfileData[K] | undefined) => { if (v !== undefined) out[k] = v; };
    set('companyName', s(input.companyName)); set('companyNameEn', s(input.companyNameEn)); set('specialty', s(input.specialty));
    set('contactName', s(input.contactName)); set('phone', s(input.phone, 32)); set('mobile', s(input.mobile, 32));
    set('email', s(input.email, 254)?.toLowerCase()); set('country', s(input.country, 2)?.toUpperCase()); set('city', s(input.city, 100)); set('address', s(input.address, 500));
    set('commercialRegistrationNo', s(input.commercialRegistrationNo, 32)); set('vatNo', s(input.vatNo, 32)); set('website', s(input.website));
    set('primaryCategoryKey', s(input.primaryCategoryKey, 64)); set('notes', s(input.notes, 2000));
    if (Array.isArray(input.secondaryCategoryKeys)) out.secondaryCategoryKeys = [...new Set(input.secondaryCategoryKeys.map((k) => s(k, 64) ?? '').filter(Boolean))];
    return out;
  }

  private cleanExpiries(e: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(e)) if (/^[a-z0-9-]{1,64}$/.test(k) && typeof v === 'string' && DATE_RE.test(v)) out[k] = v;
    return out;
  }

  /** Full validation at submit time. */
  private cleanProfile(input: Partial<VendorProfileData>): VendorProfileData {
    const required = (v: string | undefined, label: string): string => { if (!v) throw new BadRequestException(`${label} is required.`); return v; };
    const c = this.cleanPartial(input);
    const primary = required(c.primaryCategoryKey, 'Category');
    const email = required(c.email, 'Email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Enter a valid e-mail address.');
    if (c.country && !COUNTRY_RE.test(c.country)) throw new BadRequestException('Choose a country from the list.');
    return {
      companyName: required(c.companyName, 'Company name'), companyNameEn: c.companyNameEn, specialty: c.specialty,
      contactName: required(c.contactName, 'Contact name'), phone: c.phone, mobile: required(c.mobile, 'Mobile'), email,
      country: required(c.country, 'Country'), city: required(c.city, 'City'), address: c.address, commercialRegistrationNo: required(c.commercialRegistrationNo, 'Commercial registration number'),
      vatNo: c.vatNo, website: c.website, primaryCategoryKey: primary, secondaryCategoryKeys: (c.secondaryCategoryKeys ?? []).filter((k) => k !== primary), notes: c.notes,
    };
  }

  private assertRequirements(requirements: VendorDocumentRequirement[], docs: VendorRevisionDocument[], expiries: Record<string, string>): void {
    const byType = new Map(requirements.map((r) => [r.docTypeKey, r]));
    for (const d of docs) if (!byType.has(d.docTypeKey)) throw new BadRequestException(`Document type "${d.docTypeKey}" is not accepted for this category; remove it.`);
    for (const r of requirements) {
      const present = docs.filter((d) => d.docTypeKey === r.docTypeKey);
      if (r.required && present.length === 0) throw new BadRequestException(`Required document missing: ${r.nameAr} (${r.docTypeKey}).`);
      if (r.requiresExpiry && present.length && !(expiries[r.docTypeKey] ?? present[0].expiresAt)) throw new BadRequestException(`Expiry date (تاريخ الانتهاء) is required for ${r.nameAr} (${r.docTypeKey}).`);
    }
  }

  private async notifyTeam(app: VendorApplication, vendor: Vendor, revision: VendorApplicationRevision, category: VendorCategory, resubmitted: boolean): Promise<void> {
    if (!this.cfg.reviewInbox) { this.log.warn(`VENDOR_REVIEW_INBOX not set — no team notification for ${app.requestNumber}`); return; }
    const ctx: VendorMailContext = { requestNumber: app.requestNumber ?? '—', vendorNumber: vendor.vendorNumber, companyName: vendor.companyName, categoryName: category.nameAr, contactName: revision.data.contactName ?? '', revisionNo: revision.revisionNo };
    await this.mail.send({ to: this.cfg.reviewInbox, replyTo: app.submitterEmail, ...teamSubmissionMail(ctx, `${this.base()}/admin/vendors/${app.id}`, resubmitted) });
  }

  private base(): string {
    return this.cfg.publicUrl.replace(/\/$/, '');
  }
}
