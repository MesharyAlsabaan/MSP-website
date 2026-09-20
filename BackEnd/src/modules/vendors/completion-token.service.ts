import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { VendorCompletionToken } from './entities/vendor-completion-token.entity';

export const COMPLETION_TOKEN_TTL_DAYS = 14;

const hash = (token: string): string => createHash('sha256').update(token).digest('hex');

/**
 * One-time links for the vendor to fix and resubmit an application. The
 * plaintext token is returned once (to go in the email) and only its SHA-256
 * is stored. Issuing a new token for an application invalidates older
 * unused ones, so only the latest email works.
 */
@Injectable()
export class CompletionTokenService {
  constructor(private readonly dataSource: DataSource) {}

  async issue(manager: EntityManager, applicationId: string): Promise<string> {
    const repo = manager.getRepository(VendorCompletionToken);
    await repo.update({ applicationId, usedAt: null as unknown as Date }, { usedAt: new Date() });
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + COMPLETION_TOKEN_TTL_DAYS * 86_400_000);
    await repo.save(repo.create({ applicationId, tokenHash: hash(token), expiresAt, usedAt: null }));
    return token;
  }

  /** Resolves a token to its application id or throws (404 unknown, 410 used/expired). */
  async resolve(token: string, manager: EntityManager = this.dataSource.manager): Promise<VendorCompletionToken> {
    if (!token || token.length > 128) throw new NotFoundException('Unknown link.');
    const row = await manager.getRepository(VendorCompletionToken).findOne({ where: { tokenHash: hash(token) } });
    if (!row) throw new NotFoundException('Unknown link.');
    if (row.usedAt) throw new GoneException('This link has already been used.');
    if (row.expiresAt.getTime() < Date.now()) throw new GoneException('This link has expired.');
    return row;
  }

  /** Marks the token spent; call inside the resubmission transaction. */
  async consume(manager: EntityManager, id: string): Promise<void> {
    await manager.getRepository(VendorCompletionToken).update({ id }, { usedAt: new Date() });
  }
}
