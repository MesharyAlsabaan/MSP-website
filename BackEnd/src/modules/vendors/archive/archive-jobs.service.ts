import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { Readable } from 'stream';
import { DataSource, In, LessThan } from 'typeorm';
import {
  ArchiveAgentKey,
  Vendor,
  VendorApplication,
  VendorApplicationRevision,
  VendorArchiveJob,
  VendorCategory,
  VendorDocumentRequirement,
  VendorRevisionDocument,
} from '../entities';
import { DOCUMENT_STORAGE, DocumentStorage } from '../storage/document-storage';
import { ArchiveStatus, VendorProfileData } from '../vendor.enums';

export const ARCHIVE_MAX_ATTEMPTS = 10;
const hash = (s: string): string => createHash('sha256').update(s).digest('hex');

/** Everything the office agent needs to lay out one approved revision. */
export interface ArchiveManifest {
  jobId: string;
  sequenceNo: number;
  vendor: {
    id: string;
    vendorNumber: string;
    companyName: string;
    companyNameEn: string;
    primaryCategory: { key: string; nameAr: string; nameEn: string };
    secondaryCategories: { key: string; nameAr: string; nameEn: string }[];
  };
  application: { id: string; requestNumber: string; submitterEmail: string };
  revision: { id: string; revisionNo: number; submittedAt: Date; data: VendorProfileData };
  decision: { decidedAt: Date | null; decidedByName: string; note: string };
  documents: {
    id: string;
    docTypeKey: string;
    docTypeNameAr: string;
    archiveFolder: string;
    originalFilename: string;
    sizeBytes: number;
    mime: string;
    sha256: string;
    expiresAt: string | null;
  }[];
}

export interface PendingJobRow {
  id: string;
  sequenceNo: number;
  status: ArchiveStatus;
  attempts: number;
  vendorNumber: string;
  companyName: string;
  requestNumber: string;
  revisionNo: number;
  createdAt: Date;
}

/**
 * Server side of the archive hand-off. Jobs are leased (not taken): a lease
 * has an owner, a secret token and an expiry, so a crashed agent's job frees
 * itself and two agents can never work the same job. Per vendor, jobs must be
 * completed in `sequenceNo` order.
 */
@Injectable()
export class ArchiveJobsService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
  ) {}

  // ---------------------------------------------------------------- keys

  async createKey(name: string): Promise<{ id: string; name: string; key: string }> {
    const key = `msparch_${randomBytes(32).toString('base64url')}`;
    const row = await this.dataSource.getRepository(ArchiveAgentKey).save({ name: name.trim().slice(0, 128) || 'agent', keyHash: hash(key), active: true });
    return { id: row.id, name: row.name, key };
  }

  listKeys(): Promise<ArchiveAgentKey[]> {
    return this.dataSource.getRepository(ArchiveAgentKey).find({ order: { createdAt: 'ASC' } });
  }

  async revokeKey(id: string): Promise<void> {
    const r = await this.dataSource.getRepository(ArchiveAgentKey).update({ id }, { active: false });
    if (!r.affected) throw new NotFoundException('Key not found');
  }

  async authenticate(key: string): Promise<ArchiveAgentKey> {
    if (!key || key.length > 200) throw new UnauthorizedException('Invalid archive key');
    const row = await this.dataSource.getRepository(ArchiveAgentKey).findOne({ where: { keyHash: hash(key), active: true } });
    if (!row) throw new UnauthorizedException('Invalid archive key');
    return row;
  }

  async heartbeat(key: string, stats: Record<string, unknown>): Promise<void> {
    const k = await this.authenticate(key);
    await this.dataSource.getRepository(ArchiveAgentKey).save({ id: k.id, lastSeenAt: new Date(), lastHeartbeat: stats });
  }

  // ---------------------------------------------------------------- queue

  /**
   * Jobs an agent may work on now: pending, leased-but-expired, or leased by
   * this very agent (so a restart resumes its own half-done job instead of
   * waiting for the lease to lapse). Oldest sequence first per vendor.
   */
  async listPending(agentId?: string): Promise<PendingJobRow[]> {
    return this.dataSource
      .getRepository(VendorArchiveJob)
      .createQueryBuilder('j')
      .innerJoin(Vendor, 'v', 'v.id = j.vendor_id')
      .innerJoin(VendorApplicationRevision, 'r', 'r.id = j.revision_id')
      .innerJoin(VendorApplication, 'a', 'a.id = r.application_id')
      .where('j.status = :pending', { pending: ArchiveStatus.Pending })
      .orWhere('(j.status = :transferring AND j.lease_expires_at < now())', { transferring: ArchiveStatus.Transferring })
      .orWhere('(j.status = :transferring AND :agentId::text IS NOT NULL AND j.lease_owner = :agentId)', { agentId: agentId ?? null })
      .select([
        'j.id AS "id"', 'j.sequence_no AS "sequenceNo"', 'j.status AS "status"', 'j.attempts AS "attempts"',
        'v.vendor_number AS "vendorNumber"', 'v.company_name AS "companyName"',
        'a.request_number AS "requestNumber"', 'r.revision_no AS "revisionNo"', 'j.created_at AS "createdAt"',
      ])
      .orderBy('v.vendor_number', 'ASC')
      .addOrderBy('j.sequence_no', 'ASC')
      .getRawMany<PendingJobRow>();
  }

  async jobForApplication(applicationId: string): Promise<VendorArchiveJob> {
    const app = await this.dataSource.getRepository(VendorApplication).findOneByOrFail({ id: applicationId });
    const rev = await this.dataSource.getRepository(VendorApplicationRevision).findOneByOrFail({ applicationId, revisionNo: app.currentRevisionNo });
    return this.dataSource.getRepository(VendorArchiveJob).findOneByOrFail({ revisionId: rev.id });
  }

  async lease(jobId: string, agentId: string, ttlSec: number): Promise<{ leaseToken: string; leaseExpiresAt: Date; manifest: ArchiveManifest }> {
    const ttl = Math.min(Math.max(ttlSec || 300, 30), 3600);
    const owner = agentId.trim().slice(0, 128) || 'agent';
    const token = randomBytes(32).toString('hex');

    const job = await this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(VendorArchiveJob);
      const j = await repo.findOne({ where: { id: jobId }, lock: { mode: 'pessimistic_write' } });
      if (!j) throw new NotFoundException('Job not found');
      if (j.status === ArchiveStatus.Completed) throw new ConflictException('Job is already completed');
      if (j.status === ArchiveStatus.Failed) throw new ConflictException('Job is parked as failed; an admin must retry it');
      const now = Date.now();
      const leaseLive = j.status === ArchiveStatus.Transferring && j.leaseExpiresAt && j.leaseExpiresAt.getTime() > now;
      if (leaseLive && j.leaseOwner !== owner) throw new ConflictException(`Job is leased by ${j.leaseOwner}`);

      const older = await repo.count({ where: { vendorId: j.vendorId, sequenceNo: LessThan(j.sequenceNo), status: In([ArchiveStatus.Pending, ArchiveStatus.Transferring, ArchiveStatus.Failed]) } });
      if (older > 0) throw new ConflictException('An older revision of this vendor is not archived yet; it must be completed first');

      await repo.update(j.id, { status: ArchiveStatus.Transferring, leaseOwner: owner, leaseToken: token, leaseExpiresAt: new Date(now + ttl * 1000) });
      return j;
    });

    return { leaseToken: token, leaseExpiresAt: new Date(Date.now() + ttl * 1000), manifest: await this.manifest(job) };
  }

  async renew(jobId: string, agentId: string, leaseToken: string, ttlSec: number): Promise<{ leaseExpiresAt: Date }> {
    const ttl = Math.min(Math.max(ttlSec || 300, 30), 3600);
    await this.assertLease(jobId, agentId, leaseToken);
    const leaseExpiresAt = new Date(Date.now() + ttl * 1000);
    await this.dataSource.getRepository(VendorArchiveJob).update(jobId, { leaseExpiresAt });
    return { leaseExpiresAt };
  }

  async reportStep(jobId: string, agentId: string, leaseToken: string, step: string): Promise<void> {
    await this.assertLease(jobId, agentId, leaseToken);
    await this.dataSource.getRepository(VendorArchiveJob).update(jobId, { lastStep: step.slice(0, 64) });
  }

  async openDocument(jobId: string, documentId: string, agentId: string, leaseToken: string): Promise<{ stream: Readable; filename: string; mime: string; sizeBytes: number; sha256: string }> {
    const job = await this.assertLease(jobId, agentId, leaseToken);
    const d = await this.dataSource.getRepository(VendorRevisionDocument).findOne({ where: { id: documentId, revisionId: job.revisionId } });
    if (!d) throw new NotFoundException('Document not in this job');
    return { stream: this.storage.get(d.storedFile.storageKey), filename: d.originalFilename, mime: d.storedFile.mime, sizeBytes: Number(d.storedFile.sizeBytes), sha256: d.storedFile.sha256 };
  }

  async complete(jobId: string, agentId: string, leaseToken: string, archivePath: string): Promise<void> {
    const repo = this.dataSource.getRepository(VendorArchiveJob);
    const j = await repo.createQueryBuilder('j').addSelect('j.leaseToken').where('j.id = :id', { id: jobId }).getOne();
    if (!j) throw new NotFoundException('Job not found');
    if (j.status === ArchiveStatus.Completed && j.leaseOwner === agentId && j.leaseToken === leaseToken) return; // idempotent repeat
    if (j.leaseOwner !== agentId || j.leaseToken !== leaseToken) throw new ForbiddenException('Not the lease holder');
    await repo.update(jobId, { status: ArchiveStatus.Completed, completedAt: new Date(), archivePath: archivePath.slice(0, 1000), lastError: '', lastStep: 'completed', leaseExpiresAt: null });
  }

  async fail(jobId: string, agentId: string, leaseToken: string, error: string): Promise<void> {
    const j = await this.assertLease(jobId, agentId, leaseToken);
    const attempts = j.attempts + 1;
    const parked = attempts >= ARCHIVE_MAX_ATTEMPTS;
    await this.dataSource.getRepository(VendorArchiveJob).update(jobId, {
      attempts,
      status: parked ? ArchiveStatus.Failed : ArchiveStatus.Pending,
      lastError: (error ?? '').slice(0, 2000),
      leaseOwner: null,
      leaseToken: null,
      leaseExpiresAt: null,
    });
  }

  // ---------------------------------------------------------------- internals

  private async assertLease(jobId: string, agentId: string, leaseToken: string): Promise<VendorArchiveJob> {
    const j = await this.dataSource.getRepository(VendorArchiveJob).createQueryBuilder('j').addSelect('j.leaseToken').where('j.id = :id', { id: jobId }).getOne();
    if (!j) throw new NotFoundException('Job not found');
    if (j.status !== ArchiveStatus.Transferring || j.leaseOwner !== agentId || !leaseToken || j.leaseToken !== leaseToken) {
      throw new ForbiddenException('Not the lease holder');
    }
    if (j.leaseExpiresAt && j.leaseExpiresAt.getTime() < Date.now()) throw new ForbiddenException('Lease expired; lease the job again');
    return j;
  }

  private async manifest(job: VendorArchiveJob): Promise<ArchiveManifest> {
    const revision = await this.dataSource.getRepository(VendorApplicationRevision).findOneOrFail({ where: { id: job.revisionId }, relations: { documents: true, application: { vendor: true } } });
    const vendor = revision.application.vendor;
    const catRepo = this.dataSource.getRepository(VendorCategory);
    const primary = await catRepo.findOneByOrFail({ key: vendor.primaryCategoryKey });
    const secondaries = vendor.secondaryCategoryKeys.length ? await catRepo.findBy({ key: In(vendor.secondaryCategoryKeys) }) : [];
    const reqs = await this.dataSource.getRepository(VendorDocumentRequirement).findBy({ categoryKey: vendor.primaryCategoryKey });
    const reqByType = new Map(reqs.map((r) => [r.docTypeKey, r]));
    const term = (c: VendorCategory) => ({ key: c.key, nameAr: c.nameAr, nameEn: c.nameEn });
    return {
      jobId: job.id,
      sequenceNo: job.sequenceNo,
      vendor: {
        id: vendor.id,
        vendorNumber: vendor.vendorNumber,
        companyName: vendor.companyName,
        companyNameEn: vendor.companyNameEn,
        primaryCategory: term(primary),
        secondaryCategories: vendor.secondaryCategoryKeys.map((k) => secondaries.find((c) => c.key === k)).filter((c): c is VendorCategory => !!c).map(term),
      },
      application: { id: revision.application.id, requestNumber: revision.application.requestNumber ?? '', submitterEmail: revision.application.submitterEmail },
      revision: { id: revision.id, revisionNo: revision.revisionNo, submittedAt: revision.submittedAt ?? revision.createdAt, data: revision.data },
      decision: { decidedAt: revision.decidedAt, decidedByName: revision.decidedByName, note: revision.decisionNote },
      documents: revision.documents
        .sort((a, b) => a.docTypeKey.localeCompare(b.docTypeKey) || a.originalFilename.localeCompare(b.originalFilename))
        .map((d) => ({
          id: d.id,
          docTypeKey: d.docTypeKey,
          docTypeNameAr: reqByType.get(d.docTypeKey)?.nameAr ?? d.docTypeKey,
          archiveFolder: reqByType.get(d.docTypeKey)?.archiveFolder ?? 'مستندات أخرى',
          originalFilename: d.originalFilename,
          sizeBytes: Number(d.storedFile.sizeBytes),
          mime: d.storedFile.mime,
          sha256: d.storedFile.sha256,
          expiresAt: d.expiresAt,
        })),
    };
  }
}
