import { ConflictException } from '@nestjs/common';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { seedVendorCategories } from '../../database/seeds/vendor-categories.seed';
import { openVendorTestDb } from '../../test/test-db';
import { MailService } from '../mail/mail.service';
import { Vendor, VendorAccount, VendorApplication, VendorApplicationRevision, VendorArchiveJob, VendorReviewEvent } from './entities';
import { NumberingService } from './numbering.service';
import { ReviewService } from './review.service';
import { LocalDiskStorage } from './storage/local-disk.storage';
import { ArchiveStatus, QualificationStatus, ReviewAction, RevisionDecision } from './vendor.enums';
import { UploadedFile, VendorsService } from './vendors.service';

const PDF = (label: string): Buffer => Buffer.from(`%PDF-1.7\n% ${label}\n1 0 obj << >> endobj\n`);
const file = (name: string, body: Buffer): UploadedFile => ({ originalname: name, buffer: body, size: body.length });
const reviewer = { id: '11111111-1111-4111-8111-111111111111', name: 'م. منصور' };

describe('ReviewService', () => {
  let ds: DataSource;
  let close: () => Promise<void>;
  let tmp: string;
  let vendors: VendorsService;
  let review: ReviewService;
  let n = 0;

  /** A verified account with a complete, submitted application. Returns the application id. */
  const submitOne = async (): Promise<string> => {
    n += 1;
    const acc = await ds.getRepository(VendorAccount).save({ email: `v${n}@example.test`, contactName: 'سعد', passwordHash: 'x', emailVerifiedAt: new Date(), active: true, lastLoginAt: null });
    await vendors.saveDraft(acc.id, { companyName: `مؤسسة الرخام ${n}`, contactName: 'سعد', mobile: '0555555555', email: acc.email, city: 'جدة', commercialRegistrationNo: '4030303030', primaryCategoryKey: 'finishes-stone', secondaryCategoryKeys: [], expiries: { 'commercial-registration': '2027-01-31', 'vat-certificate': '2026-12-31' } });
    await vendors.addDraftDocument(acc.id, 'commercial-registration', file('cr.pdf', PDF(`cr${n}`)));
    await vendors.addDraftDocument(acc.id, 'vat-certificate', file('vat.pdf', PDF(`vat${n}`)));
    await vendors.addDraftDocument(acc.id, 'company-profile', file('profile.pdf', PDF(`profile${n}`)));
    await vendors.submit(acc.id);
    return (await vendors.getMyApplication(acc.id)).application.id;
  };

  const accountOf = async (applicationId: string): Promise<string> => {
    const app = await ds.getRepository(VendorApplication).findOneOrFail({ where: { id: applicationId }, relations: { vendor: true } });
    return app.vendor.accountId;
  };

  beforeAll(async () => {
    ({ ds, close } = await openVendorTestDb());
    await seedVendorCategories(ds);
    tmp = mkdtempSync(join(tmpdir(), 'msp-review-'));
    mkdirSync(join(tmp, 'outbox'));
    const mail = new MailService({ smtp: null, from: 'x@example.test', outboxDir: join(tmp, 'outbox') });
    const storage = new LocalDiskStorage(join(tmp, 'docs'));
    vendors = new VendorsService(ds, new NumberingService(), storage, mail, { publicUrl: 'http://localhost:4200', reviewInbox: 'team@example.test' });
    review = new ReviewService(ds, storage, mail, vendors);
  }, 60000);
  afterAll(async () => { await close(); rmSync(tmp, { recursive: true, force: true }); });

  it('approves in one transaction: decision, status, vendor pointer, event and archive job', async () => {
    const applicationId = await submitOne();
    const out = await review.approve(applicationId, reviewer, 'مستوفٍ');
    expect(out.status).toBe(QualificationStatus.Approved);
    const app = await ds.getRepository(VendorApplication).findOneByOrFail({ id: applicationId });
    const rev = await ds.getRepository(VendorApplicationRevision).findOneByOrFail({ applicationId, revisionNo: 1 });
    const vendor = await ds.getRepository(Vendor).findOneByOrFail({ id: app.vendorId });
    const job = await ds.getRepository(VendorArchiveJob).findOneByOrFail({ revisionId: rev.id });
    expect(rev.decision).toBe(RevisionDecision.Approved);
    expect(rev.decidedByName).toBe('م. منصور');
    expect(vendor.approvedRevisionId).toBe(rev.id);
    expect(job.status).toBe(ArchiveStatus.Pending);
    expect(job.sequenceNo).toBe(1);
    const events = await ds.getRepository(VendorReviewEvent).find({ where: { applicationId }, order: { createdAt: 'ASC' } });
    expect(events.map((e) => e.action)).toEqual([ReviewAction.Submitted, ReviewAction.Approved]);
    expect(events[1].actorUserId).toBe(reviewer.id);
  });

  it('refuses a second decision on an approved application', async () => {
    const applicationId = await submitOne();
    await review.approve(applicationId, reviewer, '');
    await expect(review.reject(applicationId, reviewer, 'x')).rejects.toThrow(ConflictException);
    await expect(review.approve(applicationId, reviewer, '')).rejects.toThrow(ConflictException);
  });

  it('rolls the whole approval back if the archive job cannot be written', async () => {
    const applicationId = await submitOne();
    const app = await ds.getRepository(VendorApplication).findOneByOrFail({ id: applicationId });
    const rev = await ds.getRepository(VendorApplicationRevision).findOneByOrFail({ applicationId, revisionNo: 1 });
    await ds.getRepository(VendorArchiveJob).save({ revisionId: rev.id, vendorId: app.vendorId, sequenceNo: 1, status: ArchiveStatus.Completed });
    await expect(review.approve(applicationId, reviewer, '')).rejects.toThrow();
    const after = await ds.getRepository(VendorApplication).findOneByOrFail({ id: applicationId });
    const revAfter = await ds.getRepository(VendorApplicationRevision).findOneByOrFail({ id: rev.id });
    const vendor = await ds.getRepository(Vendor).findOneByOrFail({ id: app.vendorId });
    expect(after.status).toBe(QualificationStatus.UnderReview);
    expect(revAfter.decision).toBeNull();
    expect(vendor.approvedRevisionId).toBeNull();
  });

  it('requesting completion opens a draft for the vendor, records the notes, emails them, and blocks approval until resubmitted', async () => {
    const applicationId = await submitOne();
    const before = readdirSync(join(tmp, 'outbox')).length;
    await review.requestCompletion(applicationId, reviewer, ['السجل التجاري غير واضح'], 'أعد رفع نسخة ملونة');
    const app = await ds.getRepository(VendorApplication).findOneByOrFail({ id: applicationId });
    expect(app.status).toBe(QualificationStatus.NeedsCompletion);
    expect(app.currentRevisionNo).toBe(2);
    const v1 = await ds.getRepository(VendorApplicationRevision).findOneByOrFail({ applicationId, revisionNo: 1 });
    expect(v1.decision).toBe(RevisionDecision.NeedsCompletion);
    const ev = await ds.getRepository(VendorReviewEvent).findOneByOrFail({ applicationId, action: ReviewAction.CompletionRequested });
    expect(ev.missingItems).toEqual(['السجل التجاري غير واضح']);
    expect(readdirSync(join(tmp, 'outbox')).length).toBe(before + 1);
    await expect(review.approve(applicationId, reviewer, '')).rejects.toThrow(/completion/);

    // the vendor sees the notes in their dashboard and resubmits from the draft
    const accountId = await accountOf(applicationId);
    const mine = await vendors.getMyApplication(accountId);
    expect(mine.review?.missingItems).toEqual(['السجل التجاري غير واضح']);
    expect(mine.draft?.revisionNo).toBe(2);
    await vendors.submit(accountId);
    await expect(review.approve(applicationId, reviewer, 'ok')).resolves.toMatchObject({ status: QualificationStatus.Approved });
    const job = await ds.getRepository(VendorArchiveJob).findOneByOrFail({ revisionId: mine.draft!.id });
    expect(job.sequenceNo).toBe(2);
  });

  it('rejects with a reason and never creates an archive job', async () => {
    const applicationId = await submitOne();
    const jobsBefore = await ds.getRepository(VendorArchiveJob).count();
    await review.reject(applicationId, reviewer, 'خارج نطاق الأعمال');
    expect((await ds.getRepository(VendorApplication).findOneByOrFail({ id: applicationId })).status).toBe(QualificationStatus.Rejected);
    expect(await ds.getRepository(VendorArchiveJob).count()).toBe(jobsBefore);
    const accountId = await accountOf(applicationId);
    expect((await vendors.getMyApplication(accountId)).draft).toBeNull();
  });

  it('an approved vendor can be asked for an update; the approved record stays until v2 is approved', async () => {
    const applicationId = await submitOne();
    await review.approve(applicationId, reviewer, '');
    await expect(review.requestCompletion(applicationId, reviewer, ['x'], '')).rejects.toThrow(ConflictException);
    await review.requestUpdate(applicationId, reviewer, ['السجل التجاري تجدد'], 'يرجى رفع السجل الجديد');
    const app = await ds.getRepository(VendorApplication).findOneByOrFail({ id: applicationId });
    expect(app.status).toBe(QualificationStatus.NeedsCompletion);
    const vendorBefore = await ds.getRepository(Vendor).findOneByOrFail({ id: app.vendorId });
    expect(vendorBefore.approvedRevisionId).not.toBeNull();
    const accountId = await accountOf(applicationId);
    await vendors.addDraftDocument(accountId, 'commercial-registration', file('cr-2027.pdf', PDF('cr new')), '2028-01-01');
    await vendors.submit(accountId);
    await review.approve(applicationId, reviewer, 'تحديث');
    const rev2 = await ds.getRepository(VendorApplicationRevision).findOneByOrFail({ applicationId, revisionNo: 2 });
    expect((await ds.getRepository(VendorArchiveJob).findOneByOrFail({ revisionId: rev2.id })).sequenceNo).toBe(2);
    expect((await ds.getRepository(Vendor).findOneByOrFail({ id: app.vendorId })).approvedRevisionId).toBe(rev2.id);
  });

  it('list and detail show qualification and archive status, including drafts never submitted', async () => {
    const acc = await ds.getRepository(VendorAccount).save({ email: 'draft-only@example.test', contactName: 'x', passwordHash: 'x', emailVerifiedAt: new Date(), active: true, lastLoginAt: null });
    await vendors.getMyApplication(acc.id);
    const drafts = await review.list({ page: 1, pageSize: 50, status: QualificationStatus.Draft });
    expect(drafts.data.some((r) => r.requestNumber === null)).toBe(true);
    const approved = await review.list({ page: 1, pageSize: 50, status: QualificationStatus.Approved });
    expect(approved.data[0].archiveStatus).toBe('pending');
    const d = await review.detail(approved.data[0].id);
    expect(d.revisions[0].documents.length).toBeGreaterThan(0);
  });
});
