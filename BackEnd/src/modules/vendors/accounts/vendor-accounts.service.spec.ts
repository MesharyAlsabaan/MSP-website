import { ConflictException, ForbiddenException, GoneException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { openVendorTestDb } from '../../../test/test-db';
import { MailService } from '../../mail/mail.service';
import { VendorAccountsService } from './vendor-accounts.service';

/** Pulls the one-time token out of the last .eml in the outbox (base64 body). */
function tokenFromOutbox(dir: string, path: string): string {
  const files = readdirSync(dir).sort();
  const raw = readFileSync(join(dir, files[files.length - 1]), 'utf8');
  const text = raw.split(/\r?\n--[^\r\n]+\r?\n/).map((p) => {
    const [h, ...r] = p.split(/\r?\n\r?\n/);
    const b = r.join('\n\n');
    return /base64/i.test(h) ? Buffer.from(b.replace(/\s+/g, ''), 'base64').toString('utf8') : b;
  }).join('\n');
  const m = new RegExp(`${path}/([A-Za-z0-9_-]+)`).exec(text);
  if (!m) throw new Error(`no ${path} token in mail`);
  return m[1];
}

describe('VendorAccountsService', () => {
  let ds: DataSource;
  let close: () => Promise<void>;
  let tmp: string;
  let svc: VendorAccountsService;

  beforeAll(async () => {
    ({ ds, close } = await openVendorTestDb());
    tmp = mkdtempSync(join(tmpdir(), 'msp-acc-'));
    const mail = new MailService({ smtp: null, from: 'x@example.test', outboxDir: join(tmp, 'outbox') });
    svc = new VendorAccountsService(ds, mail, new JwtService({}), { jwtSecret: 'vendor-test-secret', publicUrl: 'http://localhost:4200', tokenTtl: '12h' });
  }, 60000);
  afterAll(async () => { await close(); rmSync(tmp, { recursive: true, force: true }); });

  it('registers an account, stores only a bcrypt hash, and emails a verification link', async () => {
    const a = await svc.register({ email: 'Vendor@Example.test', password: 'Str0ng-Pass!', contactName: 'أحمد' });
    expect(a.email).toBe('vendor@example.test');
    expect(a.emailVerifiedAt).toBeNull();
    const row = await ds.query(`SELECT password_hash FROM "${(ds.options as { schema?: string }).schema}".vendor_accounts WHERE id = $1`, [a.id]);
    expect(row[0].password_hash).toMatch(/^\$2[aby]\$/);
    expect(readdirSync(join(tmp, 'outbox')).some((f) => f.includes('تفعيل'))).toBe(true);
  });

  it('refuses a duplicate email (case-insensitively) and weak passwords', async () => {
    await expect(svc.register({ email: 'VENDOR@example.test', password: 'Str0ng-Pass!', contactName: 'x' })).rejects.toThrow(ConflictException);
    await expect(svc.register({ email: 'weak@example.test', password: 'short', contactName: 'x' })).rejects.toThrow(/8/);
  });

  it('blocks login until the email is verified, then issues a vendor-audience token', async () => {
    await expect(svc.login('vendor@example.test', 'Str0ng-Pass!')).rejects.toThrow(ForbiddenException);
    const token = tokenFromOutbox(join(tmp, 'outbox'), '/vendors/verify');
    await svc.verifyEmail(token);
    await expect(svc.verifyEmail(token)).rejects.toThrow(GoneException); // one-time
    const { accessToken, account } = await svc.login('vendor@example.test', 'Str0ng-Pass!');
    expect(account.contactName).toBe('أحمد');
    const claims = await svc.verifyToken(accessToken);
    expect(claims).toMatchObject({ sub: account.id, aud: 'vendor', iss: 'msp-vendor-service' });
    await expect(svc.login('vendor@example.test', 'wrong')).rejects.toThrow(UnauthorizedException);
  });

  it('does not accept a staff-style token or a token signed with another secret', async () => {
    const other = new JwtService({ secret: 'other' });
    const forged = await other.signAsync({ sub: 'x', aud: 'vendor', iss: 'msp-vendor-service' });
    await expect(svc.verifyToken(forged)).rejects.toThrow(UnauthorizedException);
    const staffLike = await new JwtService({ secret: 'vendor-test-secret' }).signAsync({ sub: 'x', role: 'SUPER_ADMIN', aud: 'msp-admin', iss: 'msp-website' });
    await expect(svc.verifyToken(staffLike)).rejects.toThrow(UnauthorizedException);
  });

  it('password reset: request always succeeds (no account enumeration), link is one-time, old password stops working', async () => {
    await expect(svc.requestPasswordReset('nobody@example.test')).resolves.toBeUndefined();
    await svc.requestPasswordReset('vendor@example.test');
    const token = tokenFromOutbox(join(tmp, 'outbox'), '/vendors/reset-password');
    await svc.resetPassword(token, 'N3w-Pass-Word!');
    await expect(svc.resetPassword(token, 'Again-Pass-2026!')).rejects.toThrow(GoneException);
    await expect(svc.login('vendor@example.test', 'Str0ng-Pass!')).rejects.toThrow(UnauthorizedException);
    await expect(svc.login('vendor@example.test', 'N3w-Pass-Word!')).resolves.toBeDefined();
  });
});
