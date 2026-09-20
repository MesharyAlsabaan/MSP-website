import { BadRequestException, GoneException } from '@nestjs/common';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { seedVendorCategories } from '../../database/seeds/vendor-categories.seed';
import { openTestDb } from '../../test/test-db';
import { MailService } from '../mail/mail.service';
import { CompletionTokenService } from './completion-token.service';
import { VendorApplicationRevision, VendorArchiveJob, VendorReviewEvent, VendorRevisionDocument } from './entities';
import { NumberingService } from './numbering.service';
import { LocalDiskStorage } from './storage/local-disk.storage';
import { QualificationStatus, ReviewAction } from './vendor.enums';
import { UploadedDoc, VendorsService } from './vendors.service';

const PDF = (label: string): Buffer => Buffer.from(`%PDF-1.7\n% ${label}\n1 0 obj << >> endobj\n`);

const doc = (type: string, name: string, body: Buffer): UploadedDoc => ({
  docTypeKey: type,
  originalname: name,
  buffer: body,
  size: body.length,
});

const profile = {
  companyName: 'شركة البناء الحديث',
  contactName: 'أحمد',
  mobile: '0500000000',
  email: 'vendor@example.test',
  city: 'الرياض',
  commercialRegistrationNo: '1010101010',
  primaryCategoryKey: 'building-materials',
  secondaryCategoryKeys: ['finishes-stone'],
};

const fullDocs = () => [
  doc('commercial-registration', 'السجل التجاري.pdf', PDF('cr')),
  doc('vat-certificate', 'vat.pdf', PDF('vat')),
  doc('company-profile', 'profile.pdf', PDF('profile')),
];

describe('VendorsService', () => {
  let ds: DataSource;
  let close: () => Promise<void>;
  let tmp: string;
  let svc: VendorsService;
  let tokens: CompletionTokenService;

  beforeAll(async () => {
    ({ ds, close } = await openTestDb());
    await seedVendorCategories(ds);
    tmp = mkdtempSync(join(tmpdir(), 'msp-vendors-'));
    const mail = new MailService({ smtp: null, from: 'x@example.test', outboxDir: join(tmp, 'outbox') });
    tokens = new CompletionTokenService(ds);
    svc = new VendorsService(ds, new NumberingService(), new LocalDiskStorage(join(tmp, 'docs')), mail, tokens, {
      publicUrl: 'http://localhost:4200',
      reviewInbox: 'team@example.test',
    });
  }, 60000);
  afterAll(async () => {
    await close();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('lists active categories with their document requirements', async () => {
    const cats = await svc.listCategories();
    expect(cats.length).toBe(8);
    const bm = cats.find((c) => c.key === 'building-materials')!;
    expect(bm.requirements.filter((r) => r.required).map((r) => r.docTypeKey)).toEqual([
      'commercial-registration',
      'vat-certificate',
      'company-profile',
    ]);
  });

  it('refuses a submission missing a required document', async () => {
    await expect(svc.submit(profile, fullDocs().slice(0, 2))).rejects.toThrow(BadRequestException);
  });

  it('refuses a document type the category does not know', async () => {
    await expect(svc.submit(profile, [...fullDocs(), doc('passport', 'p.pdf', PDF('x'))])).rejects.toThrow(
      /passport/,
    );
  });

  it('requires an expiry date where the requirement demands one', async () => {
    await expect(svc.submit(profile, fullDocs())).rejects.toThrow(/expiry|انتهاء/i);
  });

  describe('a complete submission', () => {
    let result: { requestNumber: string; vendorNumber: string; applicationId: string };
    const expiries = { 'commercial-registration': '2027-01-31', 'vat-certificate': '2026-12-31' };

    beforeAll(async () => {
      result = await svc.submit({ ...profile, expiries }, fullDocs());
    });

    it('issues both numbers and stores one revision with three documents', async () => {
      expect(result.vendorNumber).toBe('SUP-000001');
      expect(result.requestNumber).toMatch(/^REQ-\d{4}-0001$/);
      const revs = await ds.getRepository(VendorApplicationRevision).find({ where: { applicationId: result.applicationId } });
      expect(revs).toHaveLength(1);
      expect(revs[0].revisionNo).toBe(1);
      expect(revs[0].data.companyName).toBe(profile.companyName);
      const docs = await ds.getRepository(VendorRevisionDocument).find({ where: { revisionId: revs[0].id } });
      expect(docs).toHaveLength(3);
      expect(docs.find((d) => d.docTypeKey === 'commercial-registration')!.expiresAt).toBe('2027-01-31');
    });

    it('logs a "submitted" event without an actor', async () => {
      const events = await ds.getRepository(VendorReviewEvent).find({ where: { applicationId: result.applicationId } });
      expect(events.map((e) => e.action)).toEqual([ReviewAction.Submitted]);
      expect(events[0].actorUserId).toBeNull();
    });

    it('does not create an archive job before approval', async () => {
      expect(await ds.getRepository(VendorArchiveJob).count()).toBe(0);
    });

    it('rejects a resume token for an application that is still under review', async () => {
      const token = await tokens.issue(ds.manager, result.applicationId);
      await expect(svc.getResumeContext(token)).rejects.toThrow(/under review|قيد/i);
    });

    describe('completion round', () => {
      let token: string;

      beforeAll(async () => {
        await ds.getRepository('vendor_applications').update(result.applicationId, { status: QualificationStatus.NeedsCompletion });
        token = await tokens.issue(ds.manager, result.applicationId);
      });

      it('returns the last revision prefilled for the vendor', async () => {
        const ctx = await svc.getResumeContext(token);
        expect(ctx.requestNumber).toBe(result.requestNumber);
        expect(ctx.data.companyName).toBe(profile.companyName);
        expect(ctx.documents).toHaveLength(3);
      });

      it('creates v2, reuses unchanged files, replaces the changed one and spends the token', async () => {
        const before = await ds.getRepository(VendorRevisionDocument).find({ where: { docTypeKey: 'vat-certificate' } });
        const r2 = await svc.resubmit(
          token,
          { ...profile, contactName: 'أحمد المحدث', expiries: { ...expiries, 'vat-certificate': '2027-06-30' } },
          [doc('vat-certificate', 'vat-new.pdf', PDF('vat-2027'))],
        );
        expect(r2.requestNumber).toBe(result.requestNumber);
        expect(r2.revisionNo).toBe(2);

        const revs = await ds.getRepository(VendorApplicationRevision).find({
          where: { applicationId: result.applicationId },
          order: { revisionNo: 'ASC' },
        });
        expect(revs).toHaveLength(2);
        expect(revs[1].data.contactName).toBe('أحمد المحدث');

        const v1 = await ds.getRepository(VendorRevisionDocument).find({ where: { revisionId: revs[0].id } });
        const v2 = await ds.getRepository(VendorRevisionDocument).find({ where: { revisionId: revs[1].id } });
        expect(v2).toHaveLength(3);
        const same = (t: string) => v1.find((d) => d.docTypeKey === t)!.storedFileId === v2.find((d) => d.docTypeKey === t)!.storedFileId;
        expect(same('commercial-registration')).toBe(true);
        expect(same('company-profile')).toBe(true);
        expect(same('vat-certificate')).toBe(false);
        expect(v2.find((d) => d.docTypeKey === 'vat-certificate')!.expiresAt).toBe('2027-06-30');
        expect(before).toHaveLength(1);

        const app = await ds.getRepository('vendor_applications').findOneBy({ id: result.applicationId }) as { status: string; currentRevisionNo: number };
        expect(app.status).toBe(QualificationStatus.UnderReview);
        expect(app.currentRevisionNo).toBe(2);

        await expect(svc.getResumeContext(token)).rejects.toThrow(GoneException);
      });
    });
  });
});
