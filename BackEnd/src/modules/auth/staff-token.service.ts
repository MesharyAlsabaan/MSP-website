import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface StaffTokenOptions {
  /** HS256 fallback for local development only (ignored when a private key is set). */
  hsSecret?: string;
  /** PEM PKCS#8 private key — only the website (issuer) has it. */
  privateKey?: string;
  /** PEM SPKI public key — the office vendor service holds only this. */
  publicKey?: string;
  issuer: string;
  audience: string[];
  expiresIn: string;
}

export interface StaffClaims {
  sub: string;
  email: string;
  role: string;
  /** Display name, so services without the users table can attribute actions. */
  name?: string;
}

export interface VerifiedStaffToken extends StaffClaims {
  iss: string;
  aud: string | string[];
  iat: number;
  exp: number;
}

export const STAFF_TOKEN_OPTIONS = Symbol('STAFF_TOKEN_OPTIONS');

/**
 * Issues and verifies staff access tokens.
 *
 * Production: RS256. The website signs with a private key; any other service
 * (the office vendor service) verifies with the PUBLIC key only, so no signing
 * secret is ever shared. Every token carries `iss` and an `aud` list, and a
 * verifier names the audience it expects, so a token minted for the admin CMS
 * cannot be replayed elsewhere and vice versa. The algorithm is pinned on
 * verification: an HS256 token is rejected where RS256 is configured.
 *
 * Development: HS256 with a shared dev secret when no key pair is configured.
 */
@Injectable()
export class StaffTokenService {
  constructor(private readonly jwt: JwtService, private readonly opts: StaffTokenOptions) {}

  get usesKeyPair(): boolean {
    return !!(this.opts.privateKey || this.opts.publicKey);
  }

  async signAccess(claims: StaffClaims): Promise<string> {
    const common = { issuer: this.opts.issuer, audience: this.opts.audience, expiresIn: this.opts.expiresIn };
    if (this.opts.privateKey) {
      return this.jwt.signAsync(claims, { ...common, algorithm: 'RS256', privateKey: this.opts.privateKey });
    }
    if (!this.opts.hsSecret) throw new Error('No signing key configured (JWT_PRIVATE_KEY or JWT_SECRET)');
    return this.jwt.signAsync(claims, { ...common, algorithm: 'HS256', secret: this.opts.hsSecret });
  }

  /** Verifies signature, issuer, audience (defaults to the first configured one) and expiry. */
  async verifyAccess(token: string, audience: string = this.opts.audience[0]): Promise<VerifiedStaffToken> {
    try {
      if (this.usesKeyPair) {
        const publicKey = this.opts.publicKey ?? this.opts.privateKey;
        return await this.jwt.verifyAsync<VerifiedStaffToken>(token, {
          algorithms: ['RS256'],
          publicKey,
          issuer: this.opts.issuer,
          audience,
        });
      }
      if (!this.opts.hsSecret) throw new Error('No verification key configured');
      return await this.jwt.verifyAsync<VerifiedStaffToken>(token, {
        algorithms: ['HS256'],
        secret: this.opts.hsSecret,
        issuer: this.opts.issuer,
        audience,
      });
    } catch (err) {
      throw new UnauthorizedException(`Invalid staff token: ${(err as Error).message}`);
    }
  }
}

/** Reads the key material from the environment; `\n` escapes are accepted for single-line env vars. */
export function staffTokenOptionsFromEnv(env: NodeJS.ProcessEnv = process.env, fallbackSecret?: string): StaffTokenOptions {
  const pem = (v?: string) => (v ? v.replace(/\\n/g, '\n').trim() : undefined);
  return {
    hsSecret: fallbackSecret,
    privateKey: pem(env.JWT_PRIVATE_KEY),
    publicKey: pem(env.JWT_PUBLIC_KEY),
    issuer: env.JWT_ISSUER ?? 'msp-website',
    audience: (env.JWT_AUDIENCE ?? 'msp-admin,vendor-service').split(',').map((s) => s.trim()).filter(Boolean),
    expiresIn: env.JWT_EXPIRES_IN ?? '15m',
  };
}
