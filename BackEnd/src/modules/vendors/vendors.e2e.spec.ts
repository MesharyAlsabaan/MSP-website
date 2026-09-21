/**
 * Boots the real OFFICE VENDOR SERVICE (all guards, interceptors, multer)
 * against a throw-away schema and drives the approved journey over HTTP:
 *   account → verify → login → draft → documents → submit → team mail
 *   → staff request-completion → vendor sees notes, fixes draft, resubmits
 *   → staff approve → archive job leased (loopback only), documents
 *   hash-verified, completed → status; plus isolation and token-mixing checks.
 */
import { E2E_SCHEMA, E2E_TMP } from '../../test/e2e-env';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import { readdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { AllExceptionsFilter } from '../../common/filters/http-exception.filter';
import { SafeLoggingInterceptor } from '../../common/interceptors/safe-logging.interceptor';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { vendorDataSourceOptions } from '../../database/vendor-data-source';
import { seedVendorCategories } from '../../database/seeds/vendor-categories.seed';
import { VendorServiceModule } from '../../vendor-service/vendor-service.module';
import { StaffTokenService, staffTokenOptionsFromEnv } from '../auth/staff-token.service';
import { ArchiveJobsService } from './archive/archive-jobs.service';

const PDF = (label: string): Buffer => Buffer.from(`%PDF-1.7\n% ${label}\n1 0 obj << >> endobj\n`);
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

function emlText(raw: string): string {
  return raw.split(/\r?\n--[^\r\n]+\r?\n/).map((p) => {
    const [head, ...rest] = p.split(/\r?\n\r?\n/);
    const body = rest.join('\n\n');
    if (/base64/i.test(head)) return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8');
    if (/quoted-printable/i.test(head)) return body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    return body;
  }).join('\n');
}
function lastMailToken(outbox: string, path: string): string {
  const files = readdirSync(outbox).sort();
  for (const f of [...files].reverse()) {
    const m = new RegExp(`${path}/([A-Za-z0-9_-]+)`).exec(emlText(readFileSync(join(outbox, f), 'utf8')));
    if (m) return m[1];
  }
  throw new Error(`no ${path} link in outbox`);
}

describe('Office vendor service — journey over HTTP', () => {
  let app: INestApplication;
  let ds: DataSource;
  let tmp: string;
  let outbox: string;
  let staffToken: string;
  let editorToken: string;
  let vendorToken: string;
  let otherVendorToken: string;
  let agentKey: string;
  let applicationId: string;
  let requestNumber: string;
  const http = () => request(app.getHttpServer());
  const asVendor = (t = vendorToken) => ({ Authorization: `Bearer ${t}` });
  const asStaff = () => ({ Authorization: `Bearer ${staffToken}` });

  const profile = {
    companyName: 'شركة الإنشاءات المتحدة', contactName: 'خالد', mobile: '0501234567', email: 'khalid@example.test', city: 'الرياض',
    commercialRegistrationNo: '1010999999', vatNo: '300000000000003', primaryCategoryKey: 'general-contractor', secondaryCategoryKeys: ['mep-subcontractor'],
    expiries: { 'commercial-registration': '2027-05-01', 'vat-certificate': '2026-12-31', 'contractor-classification': '2027-03-01' },
  };

  beforeAll(async () => {
    tmp = E2E_TMP;
    outbox = join(tmp, 'outbox');
    const admin = new DataSource({ ...(vendorDataSourceOptions as PostgresConnectionOptions), schema: 'public', logging: false });
    await admin.initialize();
    await admin.query(`CREATE SCHEMA "${E2E_SCHEMA}"`);
    await admin.destroy();

    const moduleRef = await Test.createTestingModule({ imports: [VendorServiceModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalInterceptors(new SafeLoggingInterceptor(), new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    ds = app.get(DataSource);
    await ds.runMigrations();
    await seedVendorCategories(ds);

    // Staff tokens exactly as the website would mint them (dev HS256 here; RS256 with the public key in production).
    const staff = new StaffTokenService(new JwtService({}), staffTokenOptionsFromEnv(process.env, process.env.JWT_SECRET ?? 'dev-secret-change-me'));
    staffToken = await staff.signAccess({ sub: '11111111-1111-4111-8111-111111111111', email: 'reviewer@msp.test', role: 'VENDOR_REVIEWER' });
    editorToken = await staff.signAccess({ sub: '22222222-2222-4222-8222-222222222222', email: 'editor@msp.test', role: 'EDITOR' });
    agentKey = (await app.get(ArchiveJobsService).createKey('e2e-agent')).key;
  }, 120000);

  afterAll(async () => {
    await app?.close();
    const cleaner = new DataSource({ ...(vendorDataSourceOptions as PostgresConnectionOptions), schema: 'public', logging: false });
    await cleaner.initialize();
    await cleaner.query(`DROP SCHEMA IF EXISTS "${E2E_SCHEMA}" CASCADE`);
    await cleaner.destroy();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('every response is uncacheable and categories are public', async () => {
    const res = await http().get('/api/vendor/categories').expect(200);
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.body.data).toHaveLength(8);
  });

  it('account: register → cannot log in unverified → verify (one-time) → login', async () => {
    await http().post('/api/vendor/auth/register').send({ email: 'khalid@example.test', password: 'Vendor-Pass-1!', contactName: 'خالد' }).expect(201);
    await http().post('/api/vendor/auth/register').send({ email: 'khalid@example.test', password: 'Vendor-Pass-1!', contactName: 'خالد' }).expect(409);
    await http().post('/api/vendor/auth/login').send({ email: 'khalid@example.test', password: 'Vendor-Pass-1!' }).expect(403);
    const token = lastMailToken(outbox, '/vendors/verify');
    await http().post('/api/vendor/auth/verify').send({ token }).expect(200);
    await http().post('/api/vendor/auth/verify').send({ token }).expect(410);
    const login = await http().post('/api/vendor/auth/login').send({ email: 'khalid@example.test', password: 'Vendor-Pass-1!' }).expect(200);
    vendorToken = login.body.data.accessToken;
    await http().post('/api/vendor/auth/login').send({ email: 'khalid@example.test', password: 'nope-nope' }).expect(401);
  });

  it('draft: created on first access, saved incrementally, documents attached one by one (retry-safe)', async () => {
    const mine = await http().get('/api/vendor/me/application').set(asVendor()).expect(200);
    expect(mine.body.data.application.status).toBe('draft');
    expect(mine.body.data.vendor.vendorNumber).toBe('SUP-000001');
    await http().put('/api/vendor/me/application/draft').set(asVendor()).send(profile).expect(200);
    const up = (type: string, name: string, body: Buffer, expiresAt?: string) => {
      const r = http().post('/api/vendor/me/application/draft/documents').set(asVendor()).field('docTypeKey', type).attach('file', body, name);
      return expiresAt ? r.field('expiresAt', expiresAt) : r;
    };
    const d1 = await up('commercial-registration', 'السجل التجاري.pdf', PDF('cr'), '2027-05-01').expect(201);
    const d1again = await up('commercial-registration', 'السجل التجاري.pdf', PDF('cr'), '2027-05-01').expect(201);
    expect(d1again.body.data.id).toBe(d1.body.data.id);
    expect(d1.body.data.originalFilename).toBe('السجل التجاري.pdf');
    await up('vat-certificate', 'vat.pdf', PDF('vat'), '2026-12-31').expect(201);
    await up('contractor-classification', 'class.pdf', PDF('class'), '2027-03-01').expect(201);
    await up('company-profile', 'evil.pdf', Buffer.from('MZ\x90\x00 not a pdf')).expect(400);
    await up('company-profile', 'profile.pdf', PDF('profile')).expect(201);
    const after = await http().get('/api/vendor/me/application').set(asVendor()).expect(200);
    expect(after.body.data.draft.documents).toHaveLength(4);
  });

  it('submit issues the request number, notifies the team, and a retried submit returns the same numbers', async () => {
    const r = await http().post('/api/vendor/me/application/submit').set(asVendor()).expect(200);
    ({ requestNumber } = r.body.data);
    expect(requestNumber).toMatch(/^REQ-\d{4}-0001$/);
    const again = await http().post('/api/vendor/me/application/submit').set(asVendor()).expect(200);
    expect(again.body.data).toEqual(r.body.data);
    expect(readdirSync(outbox).filter((f) => f.includes('جديد'))).toHaveLength(1);
    await http().put('/api/vendor/me/application/draft').set(asVendor()).send({ city: 'x' }).expect(409);
    const mine = await http().get('/api/vendor/me/application').set(asVendor()).expect(200);
    applicationId = mine.body.data.application.id;
    expect(mine.body.data.application.status).toBe('under_review');
    expect(mine.body.data.draft).toBeNull();
  });

  it('tokens do not cross over: vendor token on staff routes, staff token on vendor routes, wrong role', async () => {
    await http().get('/api/admin/vendors').set(asVendor()).expect(401);
    await http().get('/api/vendor/me/application').set(asStaff()).expect(401);
    await http().get('/api/admin/vendors').set({ Authorization: `Bearer ${editorToken}` }).expect(403);
    await http().get('/api/admin/vendors').expect(401);
    const list = await http().get('/api/admin/vendors').set(asStaff()).expect(200);
    expect(list.body.data[0]).toMatchObject({ requestNumber, status: 'under_review', archiveStatus: null });
  });

  it('staff request completion → vendor sees the notes in the dashboard, fixes the draft and resubmits v2', async () => {
    await http().post(`/api/admin/vendors/${applicationId}/request-completion`).set(asStaff()).send({ missingItems: ['شهادة الضريبة منتهية'], note: 'أرفق شهادة سارية' }).expect(201);
    const mine = await http().get('/api/vendor/me/application').set(asVendor()).expect(200);
    expect(mine.body.data.application.status).toBe('needs_completion');
    expect(mine.body.data.review).toMatchObject({ action: 'completion_requested', missingItems: ['شهادة الضريبة منتهية'], note: 'أرفق شهادة سارية' });
    expect(mine.body.data.draft.revisionNo).toBe(2);
    expect(mine.body.data.draft.documents).toHaveLength(4);
    const oldVat = mine.body.data.draft.documents.find((d: { docTypeKey: string }) => d.docTypeKey === 'vat-certificate');
    await http().delete(`/api/vendor/me/application/draft/documents/${oldVat.id}`).set(asVendor()).expect(200);
    await http().post('/api/vendor/me/application/draft/documents').set(asVendor()).field('docTypeKey', 'vat-certificate').field('expiresAt', '2027-12-31').attach('file', PDF('vat-2027'), 'vat-2027.pdf').expect(201);
    const r2 = await http().post('/api/vendor/me/application/submit').set(asVendor()).expect(200);
    expect(r2.body.data).toMatchObject({ requestNumber, revisionNo: 2 });
    expect(readdirSync(outbox).some((f) => f.includes('إعادة'))).toBe(true);
  });

  it('approval creates the archive job; the local agent leases it, verifies files, completes; the tunnel cannot reach the archive API', async () => {
    await http().post(`/api/admin/vendors/${applicationId}/approve`).set(asStaff()).send({ note: 'مستوفٍ' }).expect(201);
    await http().get('/api/archive/jobs').set('X-Archive-Key', agentKey).set('CF-Connecting-IP', '203.0.113.9').expect(403);
    await http().get('/api/archive/jobs').expect(401);
    const pending = await http().get('/api/archive/jobs?agentId=office-1').set('X-Archive-Key', agentKey).expect(200);
    expect(pending.body.data).toHaveLength(1);
    const jobId = pending.body.data[0].id;
    const lease = await http().post(`/api/archive/jobs/${jobId}/lease`).set('X-Archive-Key', agentKey).send({ agentId: 'office-1', ttlSec: 120 }).expect(201);
    const { leaseToken, manifest } = lease.body.data;
    expect(manifest.revision.revisionNo).toBe(2);
    expect(manifest.documents).toHaveLength(4);
    for (const d of manifest.documents) {
      const dl = await http().get(`/api/archive/jobs/${jobId}/documents/${d.id}`).query({ agentId: 'office-1', leaseToken }).set('X-Archive-Key', agentKey)
        .buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (x: Buffer) => c.push(x)); res.on('end', () => cb(null, Buffer.concat(c))); }).expect(200);
      expect(sha(dl.body as Buffer)).toBe(d.sha256);
    }
    expect(manifest.documents.find((d: { docTypeKey: string }) => d.docTypeKey === 'vat-certificate').originalFilename).toBe('vat-2027.pdf');
    await http().post(`/api/archive/jobs/${jobId}/complete`).set('X-Archive-Key', agentKey).send({ agentId: 'office-1', leaseToken, archivePath: 'T:\\archive\\SUP-000001' }).expect(201);
    const list = await http().get('/api/admin/vendors').set(asStaff()).expect(200);
    expect(list.body.data[0]).toMatchObject({ status: 'approved', archiveStatus: 'completed' });
    const mine = await http().get('/api/vendor/me/application').set(asVendor()).expect(200);
    expect(mine.body.data.review.action).toBe('approved');
  });

  it('a second vendor sees only their own data', async () => {
    await http().post('/api/vendor/auth/register').send({ email: 'other@example.test', password: 'Other-Pass-1!', contactName: 'بدر' }).expect(201);
    await http().post('/api/vendor/auth/verify').send({ token: lastMailToken(outbox, '/vendors/verify') }).expect(200);
    otherVendorToken = (await http().post('/api/vendor/auth/login').send({ email: 'other@example.test', password: 'Other-Pass-1!' }).expect(200)).body.data.accessToken;
    const mine = await http().get('/api/vendor/me/application').set(asVendor(otherVendorToken)).expect(200);
    expect(mine.body.data.vendor.vendorNumber).toBe('SUP-000002');
    expect(mine.body.data.application.requestNumber).toBeNull();
    const first = await http().get('/api/vendor/me/application').set(asVendor()).expect(200);
    const docId = first.body.data.submitted.documents[0].id;
    await http().get(`/api/vendor/me/documents/${docId}`).set(asVendor(otherVendorToken)).expect(404);
    await http().delete(`/api/vendor/me/application/draft/documents/${docId}`).set(asVendor(otherVendorToken)).expect(404);
    await http().get(`/api/vendor/me/documents/${docId}`).set(asVendor()).expect(200);
  });

  it('password reset works and the old password stops working', async () => {
    await http().post('/api/vendor/auth/forgot-password').send({ email: 'nobody@example.test' }).expect(200);
    await http().post('/api/vendor/auth/forgot-password').send({ email: 'other@example.test' }).expect(200);
    const token = lastMailToken(outbox, '/vendors/reset-password');
    await http().post('/api/vendor/auth/reset-password').send({ token, password: 'Fresh-Pass-2!' }).expect(200);
    await http().post('/api/vendor/auth/login').send({ email: 'other@example.test', password: 'Other-Pass-1!' }).expect(401);
    await http().post('/api/vendor/auth/login').send({ email: 'other@example.test', password: 'Fresh-Pass-2!' }).expect(200);
  });
});
