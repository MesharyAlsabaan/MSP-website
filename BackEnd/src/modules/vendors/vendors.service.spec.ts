import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { seedVendorCategories } from '../../database/seeds/vendor-categories.seed';
import { openVendorTestDb } from '../../test/test-db';
import { MailService } from '../mail/mail.service';
import { VendorAccount, VendorApplicationRevision, VendorArchiveJob, VendorReviewEvent, VendorRevisionDocument } from './entities';
import { NumberingService } from './numbering.service';
import { LocalDiskStorage } from './storage/local-disk.storage';
import { QualificationStatus, ReviewAction } from './vendor.enums';
import { UploadedFile, VendorsService } from './vendors.service';

const PDF = (label: string): Buffer => Buffer.from(`%PDF-1.7\n% ${label}\n1 0 obj << >> endobj\n`);
const file = (name: string, body: Buffer): UploadedFile => ({ originalname: name, buffer: body, size: body.length });

const profile = {
  companyName: 'شركة البناء الحديث',
  contactName: 'أحمد',
  mobile: '0500000000',
  email: 'vendor@example.test',
  city: 'الرياض',
  commercialRegistrationNo: '1010101010',
  primaryCategoryKey: 'building-materials',
  secondaryCategoryKeys: ['finishes-stone'],
  expiries: { 'commercial-registration': '2027-01-31', 'vat-certificate': '2026-12-31' },
};

describe('VendorsService (account + draft flow)', () => {
  let ds: DataSource;
  let close: () => Promise<void>;
  let tmp: string;
  let svc: VendorsService;
  let accountA: string;
  let accountB: string;

  beforeAll(async () => {
    ({ ds, close } = await openVendorTestDb());
    await seedVendorCategories(ds);
    tmp = mkdtempSync(join(tmpdir(), 'msp-vendors-'));
    mkdirSync(join(tmp, 'outbox'));
    const mail = new MailService({ smtp: null, from: 'x@example.test', outboxDir: join(tmp, 'outbox') });
    svc = new VendorsService(ds, new NumberingService(), new LocalDiskStorage(join(tmp, 'docs')), mail, { publicUrl: 'http://localhost:4200', reviewInbox: 'supply-test@example.test' });
    const repo = ds.getRepository(VendorAccount);
    accountA = (await repo.save({ email: 'a@example.test', contactName: 'أحمد', passwordHash: 'x', emailVerifiedAt: new Date(), active: true, lastLoginAt: null })).id;
    accountB = (await repo.save({ email: 'b@example.test', contactName: 'بدر', passwordHash: 'x', emailVerifiedAt: new Date(), active: true, lastLoginAt: null })).id;
  }, 60000);
  afterAll(async () => { await close(); rmSync(tmp, { recursive: true, force: true }); });

  it('creates the vendor record and an empty draft on first access; the vendor number is issued once', async () => {
    const v = await svc.getMyApplication(accountA);
    expect(v.vendor.vendorNumber).toBe('SUP-000001');
    expect(v.application.status).toBe(QualificationStatus.Draft);
    expect(v.application.requestNumber).toBeNull();
    expect(v.draft?.revisionNo).toBe(1);
    expect(v.draft?.documents).toEqual([]);
    const again = await svc.getMyApplication(accountA);
    expect(again.vendor.vendorNumber).toBe('SUP-000001');
  });

  it('saves the draft incrementally without validation of completeness', async () => {
    const v = await svc.saveDraft(accountA, { companyName: 'شركة البناء الحديث', city: 'الرياض' });
    expect(v.draft?.data.companyName).toBe('شركة البناء الحديث');
    expect(v.draft?.data.mobile).toBeUndefined();
  });

  it('refuses to submit an incomplete draft and names what is missing', async () => {
    await expect(svc.submit(accountA)).rejects.toThrow(BadRequestException);
    await svc.saveDraft(accountA, profile);
    await expect(svc.submit(accountA)).rejects.toThrow(/Required document missing/);
  });

  it('adds documents to the draft one by one; re-uploading the same file is a no-op', async () => {
    const d1 = await svc.addDraftDocument(accountA, 'commercial-registration', file('السجل التجاري.pdf', PDF('cr')), '2027-01-31');
    const d1again = await svc.addDraftDocument(accountA, 'commercial-registration', file('السجل التجاري.pdf', PDF('cr')), '2027-01-31');
    expect(d1again.id).toBe(d1.id);
    await svc.addDraftDocument(accountA, 'vat-certificate', file('vat.pdf', PDF('vat')), '2026-12-31');
    await svc.addDraftDocument(accountA, 'company-profile', file('profile.pdf', PDF('profile')));
    const v = await svc.getMyApplication(accountA);
    expect(v.draft?.documents).toHaveLength(3);
    await expect(svc.addDraftDocument(accountA, 'passport', file('p.pdf', PDF('x')))).rejects.toThrow(/passport/);
    await expect(svc.addDraftDocument(accountA, 'company-profile', file('evil.pdf', Buffer.from('MZ\x90\x00 exe')))).rejects.toThrow(BadRequestException);
  });

  it('a document can be removed from the draft', async () => {
    const extra = await svc.addDraftDocument(accountA, 'other', file('extra.pdf', PDF('extra')));
    await svc.removeDraftDocument(accountA, extra.id);
    expect((await svc.getMyApplication(accountA)).draft?.documents.map((d) => d.docTypeKey)).not.toContain('other');
  });

  it('submits: issues the request number, freezes the revision, notifies the team; a repeat is idempotent', async () => {
    const before = readdirSync(join(tmp, 'outbox')).length;
    const r = await svc.submit(accountA);
    expect(r.requestNumber).toMatch(/^REQ-\d{4}-0001$/);
    expect(r.vendorNumber).toBe('SUP-000001');
    expect(r.revisionNo).toBe(1);
    const again = await svc.submit(accountA); // network retry after a lost response
    expect(again).toEqual(r);
    expect(readdirSync(join(tmp, 'outbox')).length).toBe(before + 1);
    const v = await svc.getMyApplication(accountA);
    expect(v.application.status).toBe(QualificationStatus.UnderReview);
    expect(v.draft).toBeNull();
    expect(v.submitted?.revisionNo).toBe(1);
    const rev = await ds.getRepository(VendorApplicationRevision).findOneByOrFail({ id: v.submitted!.id });
    expect(rev.submittedAt).toBeInstanceOf(Date);
    expect(rev.data.contactName).toBe('أحمد');
    expect((await ds.getRepository(VendorReviewEvent).find({ where: { applicationId: v.application.id } })).map((e) => e.action)).toEqual([ReviewAction.Submitted]);
    expect(await ds.getRepository(VendorArchiveJob).count()).toBe(0);
  });

  it('a submitted application cannot be edited until a completion round is opened', async () => {
    await expect(svc.saveDraft(accountA, { city: 'جدة' })).rejects.toThrow(/not editable|قيد/i);
    await expect(svc.addDraftDocument(accountA, 'other', file('x.pdf', PDF('x')))).rejects.toThrow(/not editable|قيد/i);
  });

  it('a completion round opens a new draft revision that carries the previous documents', async () => {
    const v = await svc.getMyApplication(accountA);
    await ds.transaction(async (m) => svc.openRevisionRound(m, v.application.id, ['السجل التجاري غير واضح'], 'أعد رفع نسخة ملونة'));
    const after = await svc.getMyApplication(accountA);
    expect(after.application.status).toBe(QualificationStatus.NeedsCompletion);
    expect(after.draft?.revisionNo).toBe(2);
    expect(after.draft?.documents).toHaveLength(3);
    expect(after.review?.missingItems).toEqual(['السجل التجاري غير واضح']);
    const v1docs = await ds.getRepository(VendorRevisionDocument).find({ where: { revisionId: v.submitted!.id } });
    const v2docs = await ds.getRepository(VendorRevisionDocument).find({ where: { revisionId: after.draft!.id } });
    expect(v2docs.map((d) => d.storedFileId).sort()).toEqual(v1docs.map((d) => d.storedFileId).sort());

    await svc.addDraftDocument(accountA, 'commercial-registration', file('cr-color.pdf', PDF('cr colour')), '2027-01-31');
    const docs = (await svc.getMyApplication(accountA)).draft!.documents.filter((d) => d.docTypeKey === 'commercial-registration');
    expect(docs).toHaveLength(2); // old + new; the vendor removes the old one
    await svc.removeDraftDocument(accountA, docs.find((d) => d.originalFilename === 'السجل التجاري.pdf')!.id);
    const r2 = await svc.submit(accountA);
    expect(r2.requestNumber).toMatch(/0001$/); // same request number
    expect(r2.revisionNo).toBe(2);
    expect((await svc.getMyApplication(accountA)).application.status).toBe(QualificationStatus.UnderReview);
    expect(readdirSync(join(tmp, 'outbox')).some((f) => f.includes('إعادة'))).toBe(true);
  });

  it('never lets one account see or touch another account\'s data', async () => {
    const a = await svc.getMyApplication(accountA);
    const b = await svc.getMyApplication(accountB);
    expect(b.vendor.vendorNumber).toBe('SUP-000002');
    const aDoc = a.submitted!.documents[0].id;
    await expect(svc.openMyDocument(accountB, aDoc)).rejects.toThrow(NotFoundException);
    await expect(svc.removeDraftDocument(accountB, aDoc)).rejects.toThrow(NotFoundException);
    await expect(svc.openMyDocument(accountA, aDoc)).resolves.toBeDefined();
    await expect(svc.getMyApplication('00000000-0000-4000-8000-000000000000')).rejects.toThrow(ForbiddenException);
  });
});
