/** Mirrors ArchiveManifest in BackEnd/src/modules/vendors/archive/archive-jobs.service.ts */
export interface Manifest {
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
  revision: { id: string; revisionNo: number; submittedAt: string; data: Record<string, string | string[] | undefined> };
  decision: { decidedAt: string | null; decidedByName: string; note: string };
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

export interface PendingJob {
  id: string;
  sequenceNo: number;
  status: string;
  attempts: number;
  vendorNumber: string;
  companyName: string;
  requestNumber: string;
  revisionNo: number;
}

export interface Lease {
  leaseToken: string;
  leaseExpiresAt: string;
  manifest: Manifest;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Minimal client for the /archive endpoints. Every call carries the key header; nothing is logged here. */
export class ArchiveApi {
  constructor(private readonly baseUrl: string, private readonly key: string, private readonly agentId: string) {}

  private headers(): Record<string, string> {
    return { 'X-Archive-Key': this.key, 'Content-Type': 'application/json', Accept: 'application/json' };
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { method, headers: this.headers(), body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let json: { data?: T; message?: string | string[] } = {};
    try { json = text ? JSON.parse(text) : {}; } catch { /* non-JSON error body */ }
    if (!res.ok) {
      const msg = Array.isArray(json.message) ? json.message.join('; ') : json.message ?? text.slice(0, 200);
      throw new ApiError(res.status, `${method} ${path} → ${res.status}: ${msg}`);
    }
    return (json.data ?? (json as unknown)) as T;
  }

  pending(): Promise<PendingJob[]> { return this.call('GET', `/archive/jobs?agentId=${encodeURIComponent(this.agentId)}`); }
  lease(jobId: string, ttlSec: number): Promise<Lease> { return this.call('POST', `/archive/jobs/${jobId}/lease`, { agentId: this.agentId, ttlSec }); }
  renew(jobId: string, leaseToken: string, ttlSec: number): Promise<{ leaseExpiresAt: string }> { return this.call('POST', `/archive/jobs/${jobId}/renew`, { agentId: this.agentId, leaseToken, ttlSec }); }
  step(jobId: string, leaseToken: string, step: string): Promise<void> { return this.call('POST', `/archive/jobs/${jobId}/step`, { agentId: this.agentId, leaseToken, step }); }
  complete(jobId: string, leaseToken: string, archivePath: string): Promise<void> { return this.call('POST', `/archive/jobs/${jobId}/complete`, { agentId: this.agentId, leaseToken, archivePath }); }
  fail(jobId: string, leaseToken: string, error: string): Promise<void> { return this.call('POST', `/archive/jobs/${jobId}/fail`, { agentId: this.agentId, leaseToken, error }); }
  heartbeat(stats: Record<string, unknown>): Promise<void> { return this.call('POST', '/archive/heartbeat', { agentId: this.agentId, stats }); }

  documentUrl(jobId: string, docId: string, leaseToken: string): string {
    return `${this.baseUrl}/archive/jobs/${jobId}/documents/${docId}?agentId=${encodeURIComponent(this.agentId)}&leaseToken=${encodeURIComponent(leaseToken)}`;
  }
  documentHeaders(): Record<string, string> {
    return { 'X-Archive-Key': this.key };
  }
}
