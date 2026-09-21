import { BadRequestException, ConflictException, ForbiddenException, GoneException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { MailService } from '../../mail/mail.service';
import { passwordResetMail, verifyEmailMail } from '../../mail/templates/vendor-account-mails';
import { VendorAccount, VendorAccountToken, VendorTokenPurpose } from '../entities';

export interface VendorAccountsConfig {
  /** Secret for VENDOR tokens only — unrelated to staff tokens. */
  jwtSecret: string;
  publicUrl: string;
  tokenTtl: string;
}
export const VENDOR_ACCOUNTS_CONFIG = Symbol('VENDOR_ACCOUNTS_CONFIG');

export const VENDOR_TOKEN_ISSUER = 'msp-vendor-service';
export const VENDOR_TOKEN_AUDIENCE = 'vendor';
const VERIFY_TTL_H = 48;
const RESET_TTL_H = 2;
const MIN_PASSWORD = 8;

export interface VendorClaims { sub: string; email: string; aud: string; iss: string; iat: number; exp: number; }

const hash = (s: string): string => createHash('sha256').update(s).digest('hex');

/**
 * Vendor logins, kept apart from staff auth on purpose: their own table, a
 * separate signing secret, and tokens whose audience is `vendor` — a vendor
 * token can never be accepted where a staff token is expected, and vice
 * versa. Passwords are bcrypt-hashed; e-mail must be verified before login;
 * verification and reset links are one-time and short-lived.
 */
@Injectable()
export class VendorAccountsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    @Inject(VENDOR_ACCOUNTS_CONFIG) private readonly cfg: VendorAccountsConfig,
  ) {}

  async register(input: { email: string; password: string; contactName: string }): Promise<VendorAccount> {
    const email = this.normalizeEmail(input.email);
    this.assertPassword(input.password);
    const contactName = (input.contactName ?? '').trim().slice(0, 200);
    if (!contactName) throw new BadRequestException('Contact name is required.');
    const repo = this.dataSource.getRepository(VendorAccount);
    if (await repo.existsBy({ email })) throw new ConflictException('An account with this e-mail already exists.');
    const account = await repo.save({ email, contactName, passwordHash: await bcrypt.hash(input.password, 12), emailVerifiedAt: null, active: true, lastLoginAt: null });
    await this.sendVerification(account);
    return this.strip(account);
  }

  async resendVerification(email: string): Promise<void> {
    const account = await this.dataSource.getRepository(VendorAccount).findOneBy({ email: this.normalizeEmail(email) });
    if (account && !account.emailVerifiedAt) await this.sendVerification(account);
  }

  async verifyEmail(token: string): Promise<void> {
    const t = await this.consume(token, VendorTokenPurpose.VerifyEmail);
    await this.dataSource.getRepository(VendorAccount).update({ id: t.accountId }, { emailVerifiedAt: new Date() });
  }

  async login(email: string, password: string): Promise<{ accessToken: string; account: VendorAccount }> {
    const account = await this.dataSource.getRepository(VendorAccount).createQueryBuilder('a').addSelect('a.passwordHash').where('a.email = :email', { email: this.normalizeEmail(email) }).getOne();
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) throw new UnauthorizedException('Invalid e-mail or password.');
    if (!account.active) throw new ForbiddenException('This account is disabled.');
    if (!account.emailVerifiedAt) throw new ForbiddenException('Please verify your e-mail address first.');
    await this.dataSource.getRepository(VendorAccount).update(account.id, { lastLoginAt: new Date() });
    const accessToken = await this.jwt.signAsync({ sub: account.id, email: account.email }, { secret: this.cfg.jwtSecret, algorithm: 'HS256', issuer: VENDOR_TOKEN_ISSUER, audience: VENDOR_TOKEN_AUDIENCE, expiresIn: this.cfg.tokenTtl });
    return { accessToken, account: this.strip(account) };
  }

  async verifyToken(token: string): Promise<VendorClaims> {
    try {
      return await this.jwt.verifyAsync<VendorClaims>(token, { secret: this.cfg.jwtSecret, algorithms: ['HS256'], issuer: VENDOR_TOKEN_ISSUER, audience: VENDOR_TOKEN_AUDIENCE });
    } catch {
      throw new UnauthorizedException('Invalid or expired vendor session.');
    }
  }

  async findById(id: string): Promise<VendorAccount> {
    const a = await this.dataSource.getRepository(VendorAccount).findOneBy({ id });
    if (!a || !a.active) throw new UnauthorizedException('Account not found or disabled.');
    return a;
  }

  /** Always resolves — never reveals whether the address exists. */
  async requestPasswordReset(email: string): Promise<void> {
    const account = await this.dataSource.getRepository(VendorAccount).findOneBy({ email: this.normalizeEmail(email) });
    if (!account || !account.active) return;
    const token = await this.issue(account.id, VendorTokenPurpose.ResetPassword, RESET_TTL_H);
    await this.mail.send({ to: account.email, ...passwordResetMail(account.contactName, `${this.base()}/vendors/reset-password/${token}`, RESET_TTL_H) });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.assertPassword(newPassword);
    const t = await this.consume(token, VendorTokenPurpose.ResetPassword);
    await this.dataSource.getRepository(VendorAccount).update({ id: t.accountId }, { passwordHash: await bcrypt.hash(newPassword, 12), emailVerifiedAt: new Date() });
  }

  async changePassword(accountId: string, current: string, next: string): Promise<void> {
    this.assertPassword(next);
    const a = await this.dataSource.getRepository(VendorAccount).createQueryBuilder('a').addSelect('a.passwordHash').where('a.id = :id', { id: accountId }).getOne();
    if (!a || !(await bcrypt.compare(current, a.passwordHash))) throw new UnauthorizedException('Current password is incorrect.');
    await this.dataSource.getRepository(VendorAccount).update(a.id, { passwordHash: await bcrypt.hash(next, 12) });
  }

  // ---------------------------------------------------------------- internals

  private async sendVerification(account: VendorAccount): Promise<void> {
    const token = await this.issue(account.id, VendorTokenPurpose.VerifyEmail, VERIFY_TTL_H);
    await this.mail.send({ to: account.email, ...verifyEmailMail(account.contactName, `${this.base()}/vendors/verify/${token}`, VERIFY_TTL_H) });
  }

  private async issue(accountId: string, purpose: VendorTokenPurpose, ttlHours: number): Promise<string> {
    const repo = this.dataSource.getRepository(VendorAccountToken);
    await repo.update({ accountId, purpose, usedAt: null as unknown as Date }, { usedAt: new Date() });
    const token = randomBytes(32).toString('base64url');
    await repo.save({ accountId, purpose, tokenHash: hash(token), expiresAt: new Date(Date.now() + ttlHours * 3_600_000), usedAt: null });
    return token;
  }

  private async consume(token: string, purpose: VendorTokenPurpose): Promise<VendorAccountToken> {
    if (!token || token.length > 128) throw new NotFoundException('Unknown link.');
    const repo = this.dataSource.getRepository(VendorAccountToken);
    const t = await repo.findOneBy({ tokenHash: hash(token), purpose });
    if (!t) throw new NotFoundException('Unknown link.');
    if (t.usedAt) throw new GoneException('This link has already been used.');
    if (t.expiresAt.getTime() < Date.now()) throw new GoneException('This link has expired.');
    await repo.update(t.id, { usedAt: new Date() });
    return t;
  }

  private normalizeEmail(email: string): string {
    const e = (email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) throw new BadRequestException('Enter a valid e-mail address.');
    return e;
  }

  private assertPassword(p: string): void {
    if (typeof p !== 'string' || p.length < MIN_PASSWORD || p.length > 128) throw new BadRequestException(`Password must be at least ${MIN_PASSWORD} characters.`);
  }

  private base(): string {
    return this.cfg.publicUrl.replace(/\/$/, '');
  }

  private strip(a: VendorAccount): VendorAccount {
    const { passwordHash: _omit, ...rest } = a as VendorAccount & { passwordHash?: string };
    return rest as VendorAccount;
  }
}
