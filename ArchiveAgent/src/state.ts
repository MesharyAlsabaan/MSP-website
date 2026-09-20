import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { join } from 'path';

/** Ordered steps of one archive job. The agent resumes from the step after the last recorded one. */
export enum JobStep {
  Leased = 'leased',
  Downloaded = 'downloaded',
  PreviousVersionArchived = 'previousVersionArchived',
  FilesPlaced = 'filesPlaced',
  VendorExcel = 'vendorExcel',
  DecisionSaved = 'decisionSaved',
  Shortcuts = 'shortcuts',
  Register = 'register',
  Completed = 'completed',
}

export const STEP_ORDER: JobStep[] = Object.values(JobStep);

export interface JobProgress {
  lastStep: JobStep;
  leaseToken?: string;
  vendorFolder?: string;
  updatedAt: string;
  [k: string]: unknown;
}

interface StateFile {
  jobs: Record<string, JobProgress>;
  completedJobIds: string[];
  lastSuccessAt?: string;
  recentErrors: { at: string; jobId: string; message: string }[];
}

const EMPTY: StateFile = { jobs: {}, completedJobIds: [], recentErrors: [] };

/**
 * Durable progress, written atomically (temp file + rename) after every step
 * so a crash mid-job leaves either the old or the new state, never a torn
 * file. A corrupt file is set aside, not deleted, and the agent starts clean —
 * every step is idempotent, so replaying is safe.
 */
export class AgentState {
  private constructor(private readonly dir: string, private data: StateFile) {}

  static async load(dir: string): Promise<AgentState> {
    await mkdir(dir, { recursive: true });
    const file = join(dir, 'state.json');
    try {
      const raw = await readFile(file, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StateFile>;
      return new AgentState(dir, { ...EMPTY, ...parsed, jobs: parsed.jobs ?? {}, recentErrors: parsed.recentErrors ?? [], completedJobIds: parsed.completedJobIds ?? [] });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        await rename(file, join(dir, `state.corrupt-${Date.now()}.json`)).catch(() => undefined);
      }
      return new AgentState(dir, { ...EMPTY, jobs: {}, recentErrors: [], completedJobIds: [] });
    }
  }

  job(jobId: string): JobProgress | undefined {
    return this.data.jobs[jobId];
  }

  isCompleted(jobId: string): boolean {
    return this.data.completedJobIds.includes(jobId);
  }

  async setStep(jobId: string, step: JobStep, extra: Record<string, unknown> = {}): Promise<void> {
    this.data.jobs[jobId] = { ...(this.data.jobs[jobId] ?? {}), ...extra, lastStep: step, updatedAt: new Date().toISOString() } as JobProgress;
    await this.save();
  }

  /** Updates bookkeeping fields (e.g. a fresh lease token) without moving the step back. */
  async touch(jobId: string, extra: Record<string, unknown>): Promise<void> {
    const current = this.data.jobs[jobId];
    if (!current) return this.setStep(jobId, JobStep.Leased, extra);
    this.data.jobs[jobId] = { ...current, ...extra, updatedAt: new Date().toISOString() };
    await this.save();
  }

  async recordSuccess(jobId: string): Promise<void> {
    delete this.data.jobs[jobId];
    this.data.completedJobIds = [...this.data.completedJobIds.filter((id) => id !== jobId), jobId].slice(-500);
    this.data.lastSuccessAt = new Date().toISOString();
    await this.save();
  }

  async recordError(jobId: string, message: string): Promise<void> {
    this.data.recentErrors = [{ at: new Date().toISOString(), jobId, message: message.slice(0, 500) }, ...this.data.recentErrors].slice(0, 20);
    await this.save();
  }

  /** Forget a job's progress (e.g. lease lost) so it restarts from the beginning next time. */
  async forget(jobId: string): Promise<void> {
    delete this.data.jobs[jobId];
    await this.save();
  }

  summary() {
    return {
      inProgress: Object.entries(this.data.jobs).map(([id, j]) => ({ jobId: id, lastStep: j.lastStep, updatedAt: j.updatedAt })),
      lastSuccessAt: this.data.lastSuccessAt,
      recentErrors: this.data.recentErrors,
    };
  }

  private async save(): Promise<void> {
    const file = join(this.dir, 'state.json');
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    await rename(tmp, file);
  }
}
