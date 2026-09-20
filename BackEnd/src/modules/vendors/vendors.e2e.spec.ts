/**
 * Boots the real Nest application (all guards, interceptors, multer) against a
 * throw-away schema and drives the vendor journey over HTTP:
 *   register → team mail → request completion → resume link → resubmit (v2)
 *   → approve → archive job leased by an "agent" → documents downloaded and
 *   hash-verified → complete → admin sees archive status.
 */
import { E2E_SCHEMA, E2E_TMP } from '../../test/e2e-env';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { readdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { AppModule } from '../../app.module';
import { Role } from '../../common/enums/role.enum';
import { AllExceptionsFilter } from '../../common/filters/http-exception.filter';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { dataSourceOptions } from '../../database/data-source';
import { seedVendorCategories } from '../../database/seeds/vendor-categories.seed';
import { User } from '../users/entities/user.entity';
import { ArchiveJobsService } from './archive/archive-jobs.service';
import { VendorCompletionToken } from './entities';

const PDF = (label: string): Buffer => Buffer.from(`%PDF-1.7\n% ${label}\n1 0 obj << >> endobj\n`);
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/** Decodes every MIME part of a nodemailer .eml (base64 / quoted-printable) into searchable text. */
function emlText(raw: string): string {
  const parts = raw.split(/\r?\n--[^\r\n]+\r?\n/);
  return parts
    .map((p) => {
      const [head, ...rest] = p.split(/\r?\n\r?\n/);
      const body = rest.join('\n\n');
      if (/base64/i.test(head)) return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8');
      if (/quoted-printable/i.test(head)) {
        return body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      }
      return body;
    })
    .join('\n');
}

describe('Vendor journey over HTTP', () => {
  let app: INestApplication;
  let ds: DataSource;
  let schema: string;
  let tmp: string;
  let adminToken: string;
  let agentKey: string;
  let applicationId: string;
  let requestNumber: string;
  let vendorNumber: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    schema = E2E_SCHEMA;
    tmp = E2E_TMP;

    const admin = new DataSource({ ...(dataSourceOptions as PostgresConnectionOptions), schema: 'public', logging: false });
    await admin.initialize();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await admin.destroy();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    ds = app.get(DataSource);
    await ds.runMigrations();
    await seedVendorCategories(ds);
    await ds.getRepository(User).save({ email: 'admin@example.test', name: 'المدير', role: Role.SuperAdmin, active: true, passwordHash: await bcrypt.hash('Passw0rd!', 4) });
    const login = await http().post('/api/auth/login').send({ email: 'admin@example.test', password: 'Passw0rd!' }).expect(200);
    adminToken = login.body.data.accessToken;
    agentKey = (await app.get(ArchiveJobsService).createKey('e2e-agent')).key;
  }, 120000);

  afterAll(async () => {
    await app?.close();
    const cleaner = new DataSource({ ...(dataSourceOptions as PostgresConnectionOptions), schema: 'public', logging: false });
    await cleaner.initialize();
    await cleaner.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await cleaner.destroy();
    rmSync(tmp, { recursive: true, force: true });
  });

  const profile = {
    companyName: 'شركة الإنشاءات المتحدة',
    contactName: 'خالد',
    mobile: '0501234567',
    email: 'khalid@example.test',
    city: 'الرياض',
    commercialRegistrationNo: '1010999999',
    vatNo: '300000000000003',
    primaryCategoryKey: 'general-contractor',
    secondaryCategoryKeys: ['mep-subcontractor'],
    expiries: { 'commercial-registration': '2027-05-01', 'vat-certificate': '2026-12-31', 'contractor-classification': '2027-03-01' },
  };

  it('GET /api/vendors/categories is public and lists requirements', async () => {
    const res = await http().get('/api/vendors/categories').expect(200);
    expect(res.body.data).toHaveLength(8);
    expect(res.body.data[0].requirements[0]).toHaveProperty('docTypeKey');
  });

  it('rejects a bot that filled the honeypot', async () => {
    await http().post('/api/vendors/applications').field('data', JSON.stringify(profile)).field('company_website', 'http://spam').expect(400);
  });

  it('rejects a disguised executable', async () => {
    await http()
      .post('/api/vendors/applications')
      .field('data', JSON.stringify(profile))
      .attach('doc__commercial-registration', Buffer.from('MZ\x90\x00 not a pdf'), 'cr.pdf')
      .attach('doc__vat-certificate', PDF('vat'), 'vat.pdf')
      .attach('doc__contractor-classification', PDF('class'), 'class.pdf')
      .attach('doc__company-profile', PDF('profile'), 'profile.pdf')
      .expect(400);
  });

  it('registers a vendor and notifies the team', async () => {
    const res = await http()
      .post('/api/vendors/applications')
      .field('data', JSON.stringify(profile))
      .attach('doc__commercial-registration', PDF('cr'), 'السجل التجاري.pdf')
      .attach('doc__vat-certificate', PDF('vat'), 'vat.pdf')
      .attach('doc__contractor-classification', PDF('class'), 'class.pdf')
      .attach('doc__company-profile', PDF('profile'), 'profile.pdf')
      .expect(201);
    ({ applicationId, requestNumber, vendorNumber } = res.body.data);
    expect(vendorNumber).toBe('SUP-000001');
    expect(requestNumber).toMatch(/^REQ-\d{4}-0001$/);
    const mails = readdirSync(join(tmp, 'outbox'));
    expect(mails.some((f) => f.includes('جديد'))).toBe(true);
  });

  it('admin endpoints need a token and the reviewer role', async () => {
    await http().get('/api/admin/vendors').expect(401);
    const editorHash = await bcrypt.hash('Editor123!', 4);
    await ds.getRepository(User).save({ email: 'editor@example.test', name: 'محرر', role: Role.Editor, active: true, passwordHash: editorHash });
    const login = await http().post('/api/auth/login').send({ email: 'editor@example.test', password: 'Editor123!' }).expect(200);
    await http().get('/api/admin/vendors').set('Authorization', `Bearer ${login.body.data.accessToken}`).expect(403);
    const ok = await http().get('/api/admin/vendors').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(ok.body.total).toBe(1);
    expect(ok.body.data[0]).toMatchObject({ requestNumber, vendorNumber, status: 'under_review', archiveStatus: null });
  });

  it('reviewer requests completion; the vendor gets a one-time link and resubmits v2', async () => {
    await http()
      .post(`/api/admin/vendors/${applicationId}/request-completion`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ missingItems: ['شهادة الضريبة منتهية'], note: 'أرفق شهادة سارية' })
      .expect(201);

    // The token exists only in the email: read it from the outbox.
    const mail = readdirSync(join(tmp, 'outbox'))
      .map((f) => emlText(readFileSync(join(tmp, 'outbox', f), 'utf8')))
      .find((m) => m.includes('/vendors/resume/'))!;
    expect(mail).toBeDefined();
    const token = /\/vendors\/resume\/([A-Za-z0-9_-]+)/.exec(mail)![1];
    expect(await ds.getRepository(VendorCompletionToken).countBy({ applicationId })).toBe(1);

    const ctx = await http().get(`/api/vendors/applications/resume/${token}`).expect(200);
    expect(ctx.body.data.missingItems).toEqual(['شهادة الضريبة منتهية']);
    expect(ctx.body.data.documents).toHaveLength(4);

    const r2 = await http()
      .post(`/api/vendors/applications/resume/${token}`)
      .field('data', JSON.stringify({ ...profile, expiries: { ...profile.expiries, 'vat-certificate': '2027-12-31' } }))
      .attach('doc__vat-certificate', PDF('vat-2027'), 'vat-2027.pdf')
      .expect(201);
    expect(r2.body.data).toEqual({ requestNumber, revisionNo: 2 });
    await http().get(`/api/vendors/applications/resume/${token}`).expect(410);
  });

  it('approval creates the archive job; the agent leases it, verifies files and completes', async () => {
    await http().post(`/api/admin/vendors/${applicationId}/approve`).set('Authorization', `Bearer ${adminToken}`).send({ note: 'مستوفٍ' }).expect(201);

    await http().get('/api/archive/jobs').expect(401);
    await http().get('/api/archive/jobs').set('X-Archive-Key', 'bad').expect(401);
    const pending = await http().get('/api/archive/jobs').set('X-Archive-Key', agentKey).expect(200);
    expect(pending.body.data).toHaveLength(1);
    const jobId = pending.body.data[0].id;

    const lease = await http().post(`/api/archive/jobs/${jobId}/lease`).set('X-Archive-Key', agentKey).send({ agentId: 'office-1', ttlSec: 120 }).expect(201);
    const { leaseToken, manifest } = lease.body.data;
    expect(manifest.revision.revisionNo).toBe(2);
    expect(manifest.vendor.primaryCategory.nameAr).toBe('مقاولون عامون');
    expect(manifest.documents).toHaveLength(4);

    for (const d of manifest.documents) {
      const dl = await http()
        .get(`/api/archive/jobs/${jobId}/documents/${d.id}`)
        .query({ agentId: 'office-1', leaseToken })
        .set('X-Archive-Key', agentKey)
        .buffer(true)
        .parse((res, cb) => { const chunks: Buffer[] = []; res.on('data', (c: Buffer) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks))); })
        .expect(200);
      expect(dl.headers['x-checksum-sha256']).toBe(d.sha256);
      expect(sha(dl.body as Buffer)).toBe(d.sha256);
      expect(Number(dl.headers['content-length'])).toBe(d.sizeBytes);
    }
    const vat = manifest.documents.find((d: { docTypeKey: string }) => d.docTypeKey === 'vat-certificate');
    expect(vat.originalFilename).toBe('vat-2027.pdf');

    await http().post(`/api/archive/jobs/${jobId}/step`).set('X-Archive-Key', agentKey).send({ agentId: 'office-1', leaseToken, step: 'filesPlaced' }).expect(201);
    await http().post(`/api/archive/jobs/${jobId}/complete`).set('X-Archive-Key', agentKey).send({ agentId: 'office-1', leaseToken, archivePath: 'T:\\test\\مقاولون عامون\\SUP-000001 - شركة الإنشاءات المتحدة' }).expect(201);
    await http().post('/api/archive/heartbeat').set('X-Archive-Key', agentKey).send({ agentId: 'office-1', stats: { pending: 0, lastSuccessAt: new Date().toISOString() } }).expect(201);

    const status = await http().get('/api/admin/vendors/archive/status').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(status.body.data.pending).toHaveLength(0);
    expect(status.body.data.agents[0].lastHeartbeat.agentId).toBe('office-1');
    const list = await http().get('/api/admin/vendors').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(list.body.data[0]).toMatchObject({ status: 'approved', archiveStatus: 'completed' });
  });

  it('vendor documents are never served from the public uploads route', async () => {
    const detail = await http().get(`/api/admin/vendors/${applicationId}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    const doc = detail.body.data.revisions[0].documents[0];
    await http().get(`/api/admin/vendors/documents/${doc.id}`).expect(401);
    await http().get(`/api/admin/vendors/documents/${doc.id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    await http().get(`/api/uploads/${doc.sha256}`).expect(404);
  });
});
