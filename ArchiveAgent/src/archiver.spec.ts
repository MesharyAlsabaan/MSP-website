import { createHash } from 'crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ApiError, Lease, Manifest, PendingJob } from './api-client';
import { Archiver, ArchiverConfig, ArchiverDeps } from './archiver';
import { FileLockedError, RegisterRow, upsertRegisterRow } from './excel/register';
import { AgentState, JobStep } from './state';

const bytes = (s: string) => Buffer.from(`%PDF-1.7 ${s}`);
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/** In-memory stand-in for the server: one job, its manifest, its document bytes. */
class FakeApi {
  calls: string[] = [];
  jobs = new Map<string, { job: PendingJob; manifest: Manifest; docs: Map<string, Buffer>; status: string }>();
  leaseCount = 0;
  failLease = false;

  add(vendorNumber: string, companyName: string, revisionNo: number, docs: { type: string; folder: string; name: string; body: Buffer }[], secondary: string[] = ['كهرباء وميكانيكا']) {
    const id = `job-${vendorNumber}-${revisionNo}`;
    const docMap = new Map(docs.map((d, i) => [`doc-${i}`, d.body]));
    const manifest: Manifest = {
      jobId: id,
      sequenceNo: revisionNo,
      vendor: {
        id: 'v', vendorNumber, companyName, companyNameEn: '',
        primaryCategory: { key: 'gc', nameAr: 'مقاولون عامون', nameEn: 'GC' },
        secondaryCategories: secondary.map((n) => ({ key: n, nameAr: n, nameEn: n })),
      },
      application: { id: 'a', requestNumber: 'REQ-2026-0007', submitterEmail: 'v@example.test' },
      revision: { id: `r${revisionNo}`, revisionNo, submittedAt: '2026-09-01T00:00:00Z', data: { companyName, contactName: 'أحمد', mobile: '05', email: 'v@example.test', city: 'الرياض', commercialRegistrationNo: '1010', secondaryCategoryKeys: [] } },
      decision: { decidedAt: '2026-09-20T10:00:00Z', decidedByName: 'م. منصور', note: `اعتماد v${revisionNo}` },
      documents: docs.map((d, i) => ({ id: `doc-${i}`, docTypeKey: d.type, docTypeNameAr: d.type, archiveFolder: d.folder, originalFilename: d.name, sizeBytes: d.body.length, mime: 'application/pdf', sha256: sha(d.body), expiresAt: '2027-01-01' })),
    };
    this.jobs.set(id, { job: { id, sequenceNo: revisionNo, status: 'pending', attempts: 0, vendorNumber, companyName, requestNumber: 'REQ-2026-0007', revisionNo }, manifest, docs: docMap, status: 'pending' });
    return id;
  }

  async pending(): Promise<PendingJob[]> { return [...this.jobs.values()].filter((j) => j.status !== 'completed').map((j) => j.job); }
  async lease(jobId: string): Promise<Lease> {
    this.calls.push(`lease:${jobId}`);
    if (this.failLease) throw new ApiError(409, 'leased by someone else');
    this.leaseCount++;
    return { leaseToken: `tok-${this.leaseCount}`, leaseExpiresAt: new Date(Date.now() + 60000).toISOString(), manifest: this.jobs.get(jobId)!.manifest };
  }
  async renew(): Promise<{ leaseExpiresAt: string }> { this.calls.push('renew'); return { leaseExpiresAt: '' }; }
  async step(jobId: string, _t: string, step: string): Promise<void> { this.calls.push(`step:${step}`); }
  async complete(jobId: string, _t: string, path: string): Promise<void> { this.calls.push(`complete:${jobId}:${path}`); this.jobs.get(jobId)!.status = 'completed'; }
  async fail(jobId: string, _t: string, error: string): Promise<void> { this.calls.push(`fail:${jobId}:${error}`); }
  async heartbeat(): Promise<void> { this.calls.push('heartbeat'); }
}

describe('Archiver', () => {
  let root: string;
  let stateDir: string;
  let api: FakeApi;
  let downloads = 0;
  let registerLockedTimes = 0;
  let lastError = '';

  const cfg = (): ArchiverConfig => ({
    archiveRoot: root,
    leaseTtlSec: 60,
    registerFileName: 'سجل الموردين.xlsx',
    vendorFileName: 'بيانات المورد.xlsx',
    previousVersionsFolder: '_إصدارات سابقة',
    decisionFolder: 'سجل الاعتماد',
    shortcutFileName: 'افتح مجلد المورد.url',
  });

  const deps = (over: Partial<ArchiverDeps> = {}): ArchiverDeps => ({
    api: api as unknown as ArchiverDeps['api'],
    download: async (jobId, _token, doc, targetBase) => {
      downloads++;
      const body = api.jobs.get(jobId)!.docs.get(doc.id)!;
      writeFileSync(`${targetBase}.ok`, body);
      return `${targetBase}.ok`;
    },
    upsertRegister: async (file: string, row: RegisterRow) => {
      if (registerLockedTimes > 0) { registerLockedTimes--; throw new FileLockedError(file, new Error('EBUSY')); }
      return upsertRegisterRow(file, row);
    },
    log: { info: async () => undefined, warn: async () => undefined, error: async (m: string) => { lastError = m; } },
    now: () => new Date('2026-09-20T12:00:00Z'),
    ...over,
  });

  const docs = () => [
    { type: 'commercial-registration', folder: 'السجل التجاري', name: 'السجل التجاري.pdf', body: bytes('cr') },
    { type: 'vat-certificate', folder: 'الشهادات والتراخيص', name: 'vat.pdf', body: bytes('vat') },
    { type: 'company-profile', folder: 'بروفايل الشركة', name: 'profile.pdf', body: bytes('profile') },
  ];

  const vendorDir = () => join(root, 'مقاولون عامون', 'SUP-000001 - شركة البناء');

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'msp-arch-'));
    stateDir = mkdtempSync(join(tmpdir(), 'msp-arch-state-'));
    api = new FakeApi();
    downloads = 0;
    registerLockedTimes = 0;
    lastError = '';
  });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); rmSync(stateDir, { recursive: true, force: true }); });

  it('archives an approved revision into the category folder, writes Excel, decision, shortcut and register, then completes', async () => {
    const jobId = api.add('SUP-000001', 'شركة البناء', 1, docs());
    const state = await AgentState.load(stateDir);
    const result = await new Archiver(cfg(), state, deps()).runOnce();
    expect(lastError).toBe('');
    expect(result).toEqual({ completed: 1, retryLater: 0, failed: 0, skipped: 0 });

    const v = vendorDir();
    expect(readFileSync(join(v, 'السجل التجاري', 'السجل التجاري.pdf')).equals(bytes('cr'))).toBe(true);
    expect(existsSync(join(v, 'الشهادات والتراخيص', 'vat.pdf'))).toBe(true);
    expect(existsSync(join(v, 'بروفايل الشركة', 'profile.pdf'))).toBe(true);
    expect(existsSync(join(v, 'بيانات المورد.xlsx'))).toBe(true);
    expect(existsSync(join(v, 'سجل الاعتماد', 'قرار v1.json'))).toBe(true);
    expect(readFileSync(join(v, 'سجل الاعتماد', 'قرار v1.txt'), 'utf8')).toContain('م. منصور');
    const marker = JSON.parse(readFileSync(join(v, '.msp-archive.json'), 'utf8'));
    expect(marker).toMatchObject({ vendorNumber: 'SUP-000001', revisionNo: 1, jobId });
    const shortcut = readFileSync(join(root, 'كهرباء وميكانيكا', 'SUP-000001 - شركة البناء', 'افتح مجلد المورد.url'), 'utf8');
    expect(shortcut).toContain('[InternetShortcut]');
    expect(shortcut).toContain('SUP-000001');
    expect(existsSync(join(root, 'سجل الموردين.xlsx'))).toBe(true);
    expect(existsSync(join(root, '_incoming', jobId))).toBe(false);
    expect(api.calls.at(-1)).toBe(`complete:${jobId}:${v}`);
    expect(state.job(jobId)).toBeUndefined();
    expect(downloads).toBe(3);
  });

  it('resumes after a crash without downloading again, and never leaves a .part behind', async () => {
    const jobId = api.add('SUP-000001', 'شركة البناء', 1, docs());
    let state = await AgentState.load(stateDir);
    const crashing = new Archiver(cfg(), state, deps({ failAt: JobStep.VendorExcel }));
    expect(await crashing.runOnce()).toMatchObject({ failed: 0, completed: 0 });
    expect(state.job(jobId)?.lastStep).toBe(JobStep.FilesPlaced);
    expect(api.calls.some((c) => c.startsWith('fail:'))).toBe(false); // an internal crash keeps the job leased for retry
    expect(readdirSync(vendorDir(), { recursive: true }).some((f) => String(f).endsWith('.part'))).toBe(false);

    state = await AgentState.load(stateDir); // "process restart"
    expect(await new Archiver(cfg(), state, deps()).runOnce()).toMatchObject({ completed: 1 });
    expect(downloads).toBe(3);
    expect(api.jobs.get(jobId)!.status).toBe('completed');
  });

  it('keeps the job open while the register is locked and finishes it later without duplicates', async () => {
    const jobId = api.add('SUP-000001', 'شركة البناء', 1, docs());
    registerLockedTimes = 2;
    const state = await AgentState.load(stateDir);
    const a = new Archiver(cfg(), state, deps());
    expect(await a.runOnce()).toMatchObject({ retryLater: 1, completed: 0 });
    expect(state.job(jobId)?.lastStep).toBe(JobStep.Shortcuts);
    expect(api.calls.filter((c) => c.startsWith('fail:'))).toHaveLength(0);
    expect(await a.runOnce()).toMatchObject({ retryLater: 1 });
    expect(await a.runOnce()).toMatchObject({ completed: 1 });
    expect(downloads).toBe(3);
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(join(root, 'سجل الموردين.xlsx'));
    expect(wb.worksheets[0].rowCount).toBe(2);
  });

  it('running the same completed job again changes nothing', async () => {
    const jobId = api.add('SUP-000001', 'شركة البناء', 1, docs());
    const state = await AgentState.load(stateDir);
    await new Archiver(cfg(), state, deps()).runOnce();
    api.jobs.get(jobId)!.status = 'pending'; // pretend the server never got the completion
    const before = readdirSync(vendorDir(), { recursive: true }).length;
    expect(await new Archiver(cfg(), state, deps()).runOnce()).toMatchObject({ completed: 1 });
    expect(downloads).toBe(3);
    expect(readdirSync(vendorDir(), { recursive: true }).length).toBe(before);
    expect(api.calls.filter((c) => c.startsWith('complete:'))).toHaveLength(2);
  });

  it('a newer approved revision moves the previous one aside and updates the same register row', async () => {
    api.add('SUP-000001', 'شركة البناء', 1, docs());
    const state = await AgentState.load(stateDir);
    await new Archiver(cfg(), state, deps()).runOnce();

    const newDocs = docs().map((d) => (d.type === 'vat-certificate' ? { ...d, name: 'vat-2027.pdf', body: bytes('vat 2027') } : d));
    api.add('SUP-000001', 'شركة البناء', 2, newDocs);
    expect(await new Archiver(cfg(), state, deps()).runOnce()).toMatchObject({ completed: 1 });

    const v = vendorDir();
    const prev = readdirSync(join(v, '_إصدارات سابقة'));
    expect(prev).toHaveLength(1);
    expect(prev[0]).toMatch(/^v1 - 2026-09-20/);
    expect(existsSync(join(v, '_إصدارات سابقة', prev[0], 'الشهادات والتراخيص', 'vat.pdf'))).toBe(true);
    expect(existsSync(join(v, 'الشهادات والتراخيص', 'vat.pdf'))).toBe(false);
    expect(existsSync(join(v, 'الشهادات والتراخيص', 'vat-2027.pdf'))).toBe(true);
    expect(existsSync(join(v, 'سجل الاعتماد', 'قرار v1.json'))).toBe(true);
    expect(existsSync(join(v, 'سجل الاعتماد', 'قرار v2.json'))).toBe(true);
    expect(JSON.parse(readFileSync(join(v, '.msp-archive.json'), 'utf8')).revisionNo).toBe(2);
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(join(root, 'سجل الموردين.xlsx'));
    expect(wb.worksheets[0].rowCount).toBe(2);
    expect(String(wb.worksheets[0].getRow(2).getCell(3).value)).toBe('2');
  });

  it('reuses the existing vendor folder when the company was renamed', async () => {
    api.add('SUP-000001', 'شركة البناء', 1, docs());
    const state = await AgentState.load(stateDir);
    await new Archiver(cfg(), state, deps()).runOnce();
    api.add('SUP-000001', 'شركة البناء الجديدة', 2, docs());
    await new Archiver(cfg(), state, deps()).runOnce();
    expect(readdirSync(join(root, 'مقاولون عامون'))).toEqual(['SUP-000001 - شركة البناء']);
  });

  it('a job another agent holds is skipped, a corrupt document fails the job on the server', async () => {
    api.add('SUP-000001', 'شركة البناء', 1, docs());
    api.failLease = true;
    const state = await AgentState.load(stateDir);
    expect(await new Archiver(cfg(), state, deps()).runOnce()).toMatchObject({ skipped: 1 });
    api.failLease = false;
    const bad = deps({ download: async () => { throw new Error('sha256 mismatch'); } });
    expect(await new Archiver(cfg(), state, bad).runOnce()).toMatchObject({ failed: 1 });
    expect(api.calls.at(-1)).toMatch(/^fail:.*sha256 mismatch/);
    expect(state.job('job-SUP-000001-1')).toBeUndefined();
  });
});
