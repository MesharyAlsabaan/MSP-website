import { ConflictException } from '@nestjs/common';
import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { seedVendorCategories } from '../../database/seeds/vendor-categories.seed';
import { openTestDb } from '../../test/test-db';
import { MailService } from '../mail/mail.service';
import { CompletionTokenService } from './completion-token.service';
import { Vendor, VendorApplication, VendorApplicationRevision, VendorArchiveJob, VendorReviewEvent } from './entities';
import { NumberingService } from './numbering.service';
import { ReviewService } from './review.service';
import { LocalDiskStorage } from './storage/local-disk.storage';
import { ArchiveStatus, QualificationStatus, ReviewAction, RevisionDecision } from './vendor.enums';
import { UploadedDoc, VendorsService } from './vendors.service';

const PDF = (label: string): Buffer => Buffer.from(`%PDF-1.7\n% ${label}\n1 0 obj << >> endobj\n`);
const doc = (type: string, name: string, body: Buffer): UploadedDoc => ({ docTypeKey: type, originalname: name, buffer: body, size: body.length });
const reviewer = { id: '11111111-1111-4111-8111-111111111111', name: 'م. منصور' };

const profile = {
  companyName: 'مؤسسة الرخام الملكي',
  contactName: 'سعد',
  mobile: '0555555555',
  email: 'saad@example.test',
  city: 'جدة',
  commercialRegistrationNo: '4030303030',
  primaryCategoryKey: 'finishes-stone',
  secondaryCategoryKeys: [],
  expiries: { 'commercial-registration': '2027-01-31', 'vat-certificate': '2026-12-31' },
};
const docs = () => [
  doc('commercial-registration', 'cr.pdf', PDF('cr')),
  doc('vat-certificate', 'vat.pdf', PDF('vat')),
  doc('company-profile', 'profile.pdf', PDF('profile')),
];

describe('ReviewService', () => {
  let ds: DataSource;
  let close: () => Promise<void>;
  let tmp: string;
  let vendors: VendorsService;
  let review: ReviewService;

  const submitOne = () => vendors.submit(profile, docs());

  beforeAll(async () => {
    ({ ds, close } = await openTestDb());
    await seedVendorCategories(ds);
    tmp = mkdtempSync(join(tmpdir(), 'msp-review-'));
    const mail = new MailService({ smtp: null, from: 'x@example.test', outboxDir: join(tmp, 'outbox') });
    const tokens = new CompletionTokenService(ds);
    const storage = new LocalDiskStorage(join(tmp, 'docs'));
    vendors = new VendorsService(ds, new NumberingService(), storage, mail, tokens, { publicUrl: 'http://localhost:4200', reviewInbox: 'team@example.test' });
    review = new ReviewService(ds, storage, mail, vendors);
  }, 60000);
  afterAll(async () => {
    await close();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('approves in one transaction: decision, status, vendor pointer, event and archive job', async () => {
    const { applicationId } = await submitOne();
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
    const { applicationId } = await submitOne();
    await review.approve(applicationId, reviewer, '');
    await expect(review.reject(applicationId, reviewer, 'x')).rejects.toThrow(ConflictException);
    await expect(review.approve(applicationId, reviewer, '')).rejects.toThrow(ConflictException);
  });

  it('rolls the whole approval back if the archive job cannot be written', async () => {
    const { applicationId } = await submitOne();
    const app = await ds.getRepository(VendorApplication).findOneByOrFail({ id: applicationId });
    const rev = await ds.getRepository(VendorApplicationRevision).findOneByOrFail({ applicationId, revisionNo: 1 });
    // Poison: a job row already bound to this revision makes the unique index fire.
    await ds.getRepository(VendorArchiveJob).save({ revisionId: rev.id, vendorId: app.vendorId, sequenceNo: 1, status: ArchiveStatus.Completed });

    await expect(review.approve(applicationId, reviewer, '')).rejects.toThrow();

    const after = await ds.getRepository(VendorApplication).findOneByOrFail({ id: applicationId });
    const revAfter = await ds.getRepository(VendorApplicationRevision).findOneByOrFail({ id: rev.id });
    const vendor = await ds.getRepository(Vendor).findOneByOrFail({ id: app.vendorId });
    expect(after.status).toBe(QualificationStatus.UnderReview);
    expect(revAfter.decision).toBeNull();
    expect(vendor.approvedRevisionId).toBeNull();
    const events = await ds.getRepository(VendorReviewEvent).find({ where: { applicationId } });
    expect(events.map((e) => e.action)).toEqual([ReviewAction.Submitted]);
  });

  it('requesting completion records the missing items, emails a link and blocks approval until resubmitted', async () => {
    const { applicationId } = await submitOne();
    const before = readdirSync(join(tmp, 'outbox')).length;
    await review.requestCompletion(applicationId, reviewer, ['السجل التجاري غير واضح'], 'أعد رفع نسخة ملونة');
    const app = await ds.getRepository(VendorApplication).findOneByOrFail({ id: applicationId });
    expect(app.status).toBe(QualificationStatus.NeedsCompletion);
    const rev = await ds.getRepository(VendorApplicationRevision).findOneByOrFail({ applicationId, revisionNo: 1 });
    expect(rev.decision).toBe(RevisionDecision.NeedsCompletion);
    const ev = await ds.getRepository(VendorReviewEvent).findOneByOrFail({ applicationId, action: ReviewAction.CompletionRequested });
    expect(ev.missingItems).toEqual(['السجل التجاري غير واضح']);
    expect(readdirSync(join(tmp, 'outbox')).length).toBe(before + 1);
    await expect(review.approve(applicationId, reviewer, '')).rejects.toThrow(/completion/);
  });

  it('rejects with a reason and never creates an archive job', async () => {
    const { applicationId } = await submitOne();
    const jobsBefore = await ds.getRepository(VendorArchiveJob).count();
    await review.reject(applicationId, reviewer, 'خارج نطاق الأعمال');
    const app = await ds.getRepository(VendorApplication).findOneByOrFail({ id: applicationId });
    expect(app.status).toBe(QualificationStatus.Rejected);
    expect(await ds.getRepository(VendorArchiveJob).count()).toBe(jobsBefore);
  });

  it('a re-approval after a later revision creates a job with the next sequence number', async () => {
    const { applicationId } = await submitOne();
    await review.approve(applicationId, reviewer, '');
    // simulate a later revision being approved (the admin re-opens by requesting a new submission internally)
    const rev2 = await ds.getRepository(VendorApplicationRevision).save({
      applicationId, revisionNo: 2, data: { ...profile }, submittedAt: new Date(), decision: null, decidedAt: null, decidedByUserId: null, decidedByName: '', decisionNote: '',
    });
    await ds.getRepository(VendorApplication).update(applicationId, { status: QualificationStatus.UnderReview, currentRevisionNo: 2 });
    await review.approve(applicationId, reviewer, 'تحديث');
    const job = await ds.getRepository(VendorArchiveJob).findOneByOrFail({ revisionId: rev2.id });
    expect(job.sequenceNo).toBe(2);
  });
});
