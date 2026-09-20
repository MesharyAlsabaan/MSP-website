import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { seedVendorCategories } from '../../../database/seeds/vendor-categories.seed';
import { openTestDb } from '../../../test/test-db';
import { MailService } from '../../mail/mail.service';
import { CompletionTokenService } from '../completion-token.service';
import { VendorApplication, VendorApplicationRevision, VendorArchiveJob } from '../entities';
import { NumberingService } from '../numbering.service';
import { ReviewService } from '../review.service';
import { LocalDiskStorage } from '../storage/local-disk.storage';
import { ArchiveStatus, QualificationStatus } from '../vendor.enums';
import { UploadedDoc, VendorsService } from '../vendors.service';
import { ArchiveJobsService } from './archive-jobs.service';

const PDF = (label: string): Buffer => Buffer.from(`%PDF-1.7\n% ${label}\n1 0 obj << >> endobj\n`);
const doc = (type: string, name: string, body: Buffer): UploadedDoc => ({ docTypeKey: type, originalname: name, buffer: body, size: body.length });
const reviewer = { id: '11111111-1111-4111-8111-111111111111', name: 'reviewer' };
const profile = (name: string) => ({
  companyName: name, contactName: 'x', mobile: '05', email: 'v@example.test', city: 'الرياض', commercialRegistrationNo: '1',
  primaryCategoryKey: 'general-contractor', secondaryCategoryKeys: ['mep-subcontractor'],
  expiries: { 'commercial-registration': '2027-01-01', 'vat-certificate': '2027-01-01', 'contractor-classification': '2027-01-01' },
});
const docs = () => [
  doc('commercial-registration', 'cr.pdf', PDF('cr')),
  doc('vat-certificate', 'vat.pdf', PDF('vat')),
  doc('contractor-classification', 'class.pdf', PDF('class')),
  doc('company-profile', 'profile.pdf', PDF('profile')),
];

describe('ArchiveJobsService', () => {
  let ds: DataSource;
  let close: () => Promise<void>;
  let tmp: string;
  let vendors: VendorsService;
  let review: ReviewService;
  let jobs: ArchiveJobsService;
  let keyPlain: string;

  beforeAll(async () => {
    ({ ds, close } = await openTestDb());
    await seedVendorCategories(ds);
    tmp = mkdtempSync(join(tmpdir(), 'msp-archive-'));
    const mail = new MailService({ smtp: null, from: 'x@example.test', outboxDir: join(tmp, 'outbox') });
    const storage = new LocalDiskStorage(join(tmp, 'docs'));
    vendors = new VendorsService(ds, new NumberingService(), storage, mail, new CompletionTokenService(ds), { publicUrl: 'http://x', reviewInbox: '' });
    review = new ReviewService(ds, storage, mail, vendors);
    jobs = new ArchiveJobsService(ds, storage);
    keyPlain = (await jobs.createKey('test-agent')).key;
  }, 60000);
  afterAll(async () => {
    await close();
    rmSync(tmp, { recursive: true, force: true });
  });

  const approvedApp = async (name: string) => {
    const { applicationId } = await vendors.submit(profile(name), docs());
    await review.approve(applicationId, reviewer, '');
    return applicationId;
  };

  it('authenticates agents by hashed key and rejects unknown or revoked keys', async () => {
    const k = await jobs.authenticate(keyPlain);
    expect(k.name).toBe('test-agent');
    await expect(jobs.authenticate('nope')).rejects.toThrow(UnauthorizedException);
    const other = await jobs.createKey('old');
    await jobs.revokeKey(other.id);
    await expect(jobs.authenticate(other.key)).rejects.toThrow(UnauthorizedException);
  });

  it('lists pending jobs with the vendor summary and leases one with a manifest', async () => {
    await approvedApp('شركة أ');
    const pending = await jobs.listPending();
    expect(pending.length).toBeGreaterThanOrEqual(1);
    const j = pending.find((p) => p.companyName === 'شركة أ')!;
    expect(j.vendorNumber).toMatch(/^SUP-/);

    const lease = await jobs.lease(j.id, 'agent-1', 60);
    expect(lease.leaseToken).toHaveLength(64);
    expect(lease.manifest.vendor.companyName).toBe('شركة أ');
    expect(lease.manifest.vendor.primaryCategory.nameAr).toBe('مقاولون عامون');
    expect(lease.manifest.vendor.secondaryCategories[0].key).toBe('mep-subcontractor');
    expect(lease.manifest.revision.revisionNo).toBe(1);
    expect(lease.manifest.decision.decidedByName).toBe('reviewer');
    expect(lease.manifest.documents).toHaveLength(4);
    expect(lease.manifest.documents[0]).toMatchObject({ archiveFolder: expect.any(String), sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });

    await expect(jobs.lease(j.id, 'agent-2', 60)).rejects.toThrow(ConflictException);
    // the same agent may re-lease (restart after crash) and gets a fresh token
    const again = await jobs.lease(j.id, 'agent-1', 60);
    expect(again.leaseToken).not.toBe(lease.leaseToken);
  });

  it('streams a document only to the lease holder and verifies the token', async () => {
    const appId = await approvedApp('شركة ب');
    const job = await jobs.jobForApplication(appId);
    const lease = await jobs.lease(job.id, 'agent-1', 60);
    const d = lease.manifest.documents[0];
    const file = await jobs.openDocument(job.id, d.id, 'agent-1', lease.leaseToken);
    expect(file.sha256).toBe(d.sha256);
    await expect(jobs.openDocument(job.id, d.id, 'agent-1', 'wrong-token')).rejects.toThrow(ForbiddenException);
    await expect(jobs.openDocument(job.id, d.id, 'agent-2', lease.leaseToken)).rejects.toThrow(ForbiddenException);
  });

  it('a lease that expired can be taken by another agent', async () => {
    const appId = await approvedApp('شركة ج');
    const job = await jobs.jobForApplication(appId);
    await jobs.lease(job.id, 'agent-1', 1);
    await ds.getRepository(VendorArchiveJob).update(job.id, { leaseExpiresAt: new Date(Date.now() - 1000) });
    await expect(jobs.lease(job.id, 'agent-2', 60)).resolves.toBeDefined();
  });

  it('complete marks the job done idempotently; a stale token cannot complete it', async () => {
    const appId = await approvedApp('شركة د');
    const job = await jobs.jobForApplication(appId);
    const lease = await jobs.lease(job.id, 'agent-1', 60);
    await jobs.complete(job.id, 'agent-1', lease.leaseToken, 'X:\\archive\\SUP');
    const done = await ds.getRepository(VendorArchiveJob).findOneByOrFail({ id: job.id });
    expect(done.status).toBe(ArchiveStatus.Completed);
    expect(done.archivePath).toBe('X:\\archive\\SUP');
    // idempotent: same call again is fine; a different token is refused but changes nothing
    await jobs.complete(job.id, 'agent-1', lease.leaseToken, 'X:\\archive\\SUP');
    await expect(jobs.complete(job.id, 'agent-1', 'stale', 'other')).rejects.toThrow(ForbiddenException);
    expect((await jobs.listPending()).find((p) => p.id === job.id)).toBeUndefined();
  });

  it('fail returns the job to the queue and counts attempts; the 10th failure parks it as failed', async () => {
    const appId = await approvedApp('شركة هـ');
    const job = await jobs.jobForApplication(appId);
    for (let i = 1; i <= 10; i++) {
      const lease = await jobs.lease(job.id, 'agent-1', 60);
      await jobs.fail(job.id, 'agent-1', lease.leaseToken, `network down ${i}`);
      const row = await ds.getRepository(VendorArchiveJob).findOneByOrFail({ id: job.id });
      expect(row.attempts).toBe(i);
      expect(row.status).toBe(i < 10 ? ArchiveStatus.Pending : ArchiveStatus.Failed);
      expect(row.lastError).toBe(`network down ${i}`);
    }
    await expect(jobs.lease(job.id, 'agent-1', 60)).rejects.toThrow(ConflictException);
  });

  it('refuses to lease a newer revision while an older one for the same vendor is unfinished', async () => {
    const appId = await approvedApp('شركة و');
    const app = await ds.getRepository(VendorApplication).findOneByOrFail({ id: appId });
    const job1 = await jobs.jobForApplication(appId);
    const rev2 = await ds.getRepository(VendorApplicationRevision).save({
      applicationId: appId, revisionNo: 2, data: profile('شركة و').valueOf() as never, submittedAt: new Date(), decision: null, decidedAt: null, decidedByUserId: null, decidedByName: '', decisionNote: '',
    });
    await ds.getRepository(VendorApplication).update(appId, { status: QualificationStatus.UnderReview, currentRevisionNo: 2 });
    await review.approve(appId, reviewer, 'v2');
    const job2 = await ds.getRepository(VendorArchiveJob).findOneByOrFail({ revisionId: rev2.id });
    expect(job2.vendorId).toBe(app.vendorId);

    await expect(jobs.lease(job2.id, 'agent-1', 60)).rejects.toThrow(/older/);
    const l1 = await jobs.lease(job1.id, 'agent-1', 60);
    await jobs.complete(job1.id, 'agent-1', l1.leaseToken, 'p');
    await expect(jobs.lease(job2.id, 'agent-1', 60)).resolves.toBeDefined();
  });

  it('records heartbeats on the agent key', async () => {
    await jobs.heartbeat(keyPlain, { pending: 3, lastSuccessAt: '2026-09-20T10:00:00Z', errors: [] });
    const k = await jobs.authenticate(keyPlain);
    expect(k.lastHeartbeat).toMatchObject({ pending: 3 });
    expect(k.lastSeenAt).toBeInstanceOf(Date);
  });
});
