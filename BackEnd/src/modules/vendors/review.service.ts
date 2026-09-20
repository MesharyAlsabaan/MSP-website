import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { Brackets, DataSource, EntityManager } from 'typeorm';
import { paginate, Paginated } from '../../common/dto/paginated.dto';
import { MailService } from '../mail/mail.service';
import { decisionMail } from '../mail/templates/vendor-mails';
import {
  Vendor,
  VendorApplication,
  VendorApplicationRevision,
  VendorArchiveJob,
  VendorReviewEvent,
  VendorRevisionDocument,
} from './entities';
import { assertReviewerAction } from './qualification.rules';
import { DOCUMENT_STORAGE, DocumentStorage } from './storage/document-storage';
import { ArchiveStatus, QualificationStatus, ReviewAction, RevisionDecision } from './vendor.enums';
import { VendorsService } from './vendors.service';

/** The staff member performing an action (from the JWT + users table). */
export interface Actor {
  id: string;
  name: string;
}

export interface ListQuery {
  page: number;
  pageSize: number;
  status?: QualificationStatus;
  archiveStatus?: ArchiveStatus;
  q?: string;
}

export interface ApplicationRow {
  id: string;
  requestNumber: string;
  vendorNumber: string;
  companyName: string;
  primaryCategoryKey: string;
  status: QualificationStatus;
  currentRevisionNo: number;
  submitterEmail: string;
  createdAt: Date;
  updatedAt: Date;
  archiveStatus: ArchiveStatus | null;
}

/**
 * Staff-side operations. Decisions act on the application's CURRENT revision
 * only and are guarded by the state machine in qualification.rules. Approval
 * writes the decision, the status, the vendor's approved pointer, the audit
 * event and the archive job in ONE transaction.
 */
@Injectable()
export class ReviewService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
    private readonly mail: MailService,
    private readonly vendors: VendorsService,
  ) {}

  // ---------------------------------------------------------------- read

  async list(query: ListQuery): Promise<Paginated<ApplicationRow>> {
    const { page, pageSize } = query;
    const qb = this.dataSource
      .getRepository(VendorApplication)
      .createQueryBuilder('a')
      .innerJoin(Vendor, 'v', 'v.id = a.vendor_id')
      .leftJoin(
        (sub) =>
          sub
            .select('j.vendor_id', 'vendor_id')
            .addSelect('j.status', 'status')
            .addSelect('ROW_NUMBER() OVER (PARTITION BY j.vendor_id ORDER BY j.sequence_no DESC)', 'rn')
            .from(VendorArchiveJob, 'j'),
        'lj',
        'lj.vendor_id = v.id AND lj.rn = 1',
      )
      .select([
        'a.id AS "id"',
        'a.request_number AS "requestNumber"',
        'v.vendor_number AS "vendorNumber"',
        'v.company_name AS "companyName"',
        'v.primary_category_key AS "primaryCategoryKey"',
        'a.status AS "status"',
        'a.current_revision_no AS "currentRevisionNo"',
        'a.submitter_email AS "submitterEmail"',
        'a.created_at AS "createdAt"',
        'a.updated_at AS "updatedAt"',
        'lj.status AS "archiveStatus"',
      ])
      .orderBy('a.updated_at', 'DESC');

    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.archiveStatus) qb.andWhere('lj.status = :as', { as: query.archiveStatus });
    if (query.q) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('v.company_name ILIKE :q', { q: `%${query.q}%` })
            .orWhere('v.vendor_number ILIKE :q')
            .orWhere('a.request_number ILIKE :q')
            .orWhere('a.submitter_email ILIKE :q'),
        ),
      );
    }
    const total = await qb.getCount();
    const data = await qb.offset((page - 1) * pageSize).limit(pageSize).getRawMany<ApplicationRow>();
    return paginate(data, total, page, pageSize);
  }

  async detail(applicationId: string) {
    const app = await this.dataSource.getRepository(VendorApplication).findOne({ where: { id: applicationId }, relations: { vendor: true } });
    if (!app) throw new NotFoundException('Application not found');
    const revisions = await this.dataSource.getRepository(VendorApplicationRevision).find({
      where: { applicationId },
      relations: { documents: true },
      order: { revisionNo: 'DESC' },
    });
    const events = await this.dataSource.getRepository(VendorReviewEvent).find({ where: { applicationId }, order: { createdAt: 'ASC' } });
    const archiveJobs = await this.dataSource.getRepository(VendorArchiveJob).find({ where: { vendorId: app.vendorId }, order: { sequenceNo: 'DESC' } });
    return {
      application: app,
      vendor: app.vendor,
      revisions: revisions.map((r) => ({
        ...r,
        documents: r.documents.map((d) => ({
          id: d.id,
          docTypeKey: d.docTypeKey,
          originalFilename: d.originalFilename,
          expiresAt: d.expiresAt,
          sizeBytes: Number(d.storedFile.sizeBytes),
          mime: d.storedFile.mime,
          sha256: d.storedFile.sha256,
        })),
      })),
      events,
      archiveJobs,
    };
  }

  /** Authenticated download of one document (never served statically). */
  async openDocument(documentId: string): Promise<{ stream: Readable; filename: string; mime: string; sizeBytes: number; sha256: string }> {
    const d = await this.dataSource.getRepository(VendorRevisionDocument).findOne({ where: { id: documentId } });
    if (!d) throw new NotFoundException('Document not found');
    return {
      stream: this.storage.get(d.storedFile.storageKey),
      filename: d.originalFilename,
      mime: d.storedFile.mime,
      sizeBytes: Number(d.storedFile.sizeBytes),
      sha256: d.storedFile.sha256,
    };
  }

  // ---------------------------------------------------------------- decisions

  async requestCompletion(applicationId: string, actor: Actor, missingItems: string[], note: string) {
    const items = missingItems.map((s) => String(s).trim().slice(0, 300)).filter(Boolean);
    const out = await this.dataSource.transaction(async (m) => {
      const { app, revision } = await this.lockCurrent(m, applicationId);
      assertReviewerAction(app.status, ReviewAction.CompletionRequested);
      await this.decide(m, app, revision, RevisionDecision.NeedsCompletion, QualificationStatus.NeedsCompletion, actor, note);
      await m.getRepository(VendorReviewEvent).save({
        applicationId, revisionId: revision.id, action: ReviewAction.CompletionRequested, note, missingItems: items, actorUserId: actor.id, actorName: actor.name,
      });
      await this.vendors.sendCompletionRequest(m, app, app.vendor, revision, items, note);
      return app;
    });
    return { id: out.id, status: out.status };
  }

  async approve(applicationId: string, actor: Actor, note: string) {
    const out = await this.dataSource.transaction(async (m) => {
      const { app, revision } = await this.lockCurrent(m, applicationId);
      assertReviewerAction(app.status, ReviewAction.Approved);
      await this.decide(m, app, revision, RevisionDecision.Approved, QualificationStatus.Approved, actor, note);
      app.vendor.approvedRevisionId = revision.id;
      await m.getRepository(Vendor).save(app.vendor);
      await m.getRepository(VendorReviewEvent).save({
        applicationId, revisionId: revision.id, action: ReviewAction.Approved, note, actorUserId: actor.id, actorName: actor.name,
      });
      // The archive job is part of the same transaction: no approval without one.
      await m.getRepository(VendorArchiveJob).insert({
        revisionId: revision.id, vendorId: app.vendorId, sequenceNo: revision.revisionNo, status: ArchiveStatus.Pending,
      });
      return { app, revision };
    });
    const ctx = await this.vendors.mailContext(out.app, out.app.vendor, out.revision);
    await this.mail.send({ to: out.app.submitterEmail, ...decisionMail(ctx, 'approved', note) });
    return { id: out.app.id, status: out.app.status };
  }

  async reject(applicationId: string, actor: Actor, reason: string) {
    const out = await this.dataSource.transaction(async (m) => {
      const { app, revision } = await this.lockCurrent(m, applicationId);
      assertReviewerAction(app.status, ReviewAction.Rejected);
      await this.decide(m, app, revision, RevisionDecision.Rejected, QualificationStatus.Rejected, actor, reason);
      await m.getRepository(VendorReviewEvent).save({
        applicationId, revisionId: revision.id, action: ReviewAction.Rejected, note: reason, actorUserId: actor.id, actorName: actor.name,
      });
      return { app, revision };
    });
    const ctx = await this.vendors.mailContext(out.app, out.app.vendor, out.revision);
    await this.mail.send({ to: out.app.submitterEmail, ...decisionMail(ctx, 'rejected', reason) });
    return { id: out.app.id, status: out.app.status };
  }

  /** Puts a failed archive job back in the queue. */
  async retryArchive(jobId: string, actor: Actor) {
    const repo = this.dataSource.getRepository(VendorArchiveJob);
    const job = await repo.findOne({ where: { id: jobId }, relations: { revision: true } });
    if (!job) throw new NotFoundException('Archive job not found');
    if (job.status === ArchiveStatus.Completed) return job;
    await repo.update(job.id, { status: ArchiveStatus.Pending, leaseOwner: null, leaseToken: null, leaseExpiresAt: null, lastError: '' });
    await this.dataSource.getRepository(VendorReviewEvent).save({
      applicationId: job.revision.applicationId, revisionId: job.revisionId, action: ReviewAction.ArchiveRetried, actorUserId: actor.id, actorName: actor.name,
    });
    return repo.findOneByOrFail({ id: job.id });
  }

  // ---------------------------------------------------------------- internals

  private async lockCurrent(m: EntityManager, applicationId: string) {
    const app = await m.getRepository(VendorApplication).findOne({
      where: { id: applicationId },
      relations: { vendor: true },
      lock: { mode: 'pessimistic_write', tables: ['vendor_applications'] },
    });
    if (!app) throw new NotFoundException('Application not found');
    const revision = await m.getRepository(VendorApplicationRevision).findOneOrFail({
      where: { applicationId, revisionNo: app.currentRevisionNo },
    });
    return { app, revision };
  }

  private async decide(m: EntityManager, app: VendorApplication, revision: VendorApplicationRevision, decision: RevisionDecision, status: QualificationStatus, actor: Actor, note: string) {
    revision.decision = decision;
    revision.decidedAt = new Date();
    revision.decidedByUserId = actor.id;
    revision.decidedByName = actor.name;
    revision.decisionNote = note ?? '';
    await m.getRepository(VendorApplicationRevision).save(revision);
    app.status = status;
    await m.getRepository(VendorApplication).save(app);
  }
}
