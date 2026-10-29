/** Shapes of the /api/project-sync endpoints (see BackEnd/src/modules/project-sync). */

export type ItemState =
  | 'draft'
  | 'approved'
  | 'postponed'
  | 'awaiting_verification'
  | 'published'
  | 'failed'
  | 'linked'
  | 'missing_from_source';

export type FactSource = 'owner' | 'site' | 'folder' | 'ai' | 'template';

export interface Fact<T> {
  value: T;
  source: FactSource;
  basis?: string;
}

export interface DraftImage {
  sourceId: string;
  path: string;
  md5: string;
  width: number;
  height: number;
  included: boolean;
  problem?: string;
}

export interface ProjectDraft {
  facts: {
    titleEn: Fact<string>;
    titleAr: Fact<string>;
    locationEn: Fact<string>;
    locationAr: Fact<string>;
    year: Fact<string>;
    statusEn: Fact<string>;
    statusAr: Fact<string>;
    sectors: Fact<string[]>;
    designCategories: Fact<string[]>;
    disciplines: Fact<string[]>;
  };
  content: {
    summaryEn: Fact<string>;
    summaryAr: Fact<string>;
    descriptionEn: Fact<string[]>;
    descriptionAr: Fact<string[]>;
  };
  visualNotes: string[];
  images: DraftImage[];
  cover: string;
  ai: { model: string; at: string } | null;
  notes: string[];
}

export type FactKey = keyof ProjectDraft['facts'];
export type ContentKey = keyof ProjectDraft['content'];

export interface SyncItem {
  id: string;
  sourceFolderId: string;
  folderName: string;
  slug: string;
  mode: 'owned' | 'linked';
  state: ItemState;
  projectId: string | null;
  issues: string[];
  attempts: number;
  lastPublishedAt: string | null;
  lastVerifiedAt: string | null;
  decidedBy: string;
  decidedAt: string | null;
  decisionNote: string;
  updatedAt: string;
  title: string;
  titleAr: string;
  cover: string;
  imageCount: number;
  blocking: string[];
  missing: string[];
  aiText: boolean;
  canUndo: boolean;
  urlEn: string;
  urlAr: string;
}

export interface SyncItemDetail extends SyncItem {
  draft: ProjectDraft | null;
  readiness: { blocking: string[]; missing: string[]; warnings: string[] } | null;
  minImages: number;
}

export interface SyncStatus {
  enabled: boolean;
  scheduleActive: boolean;
  times: string;
  timezone: string;
  nextRun: string | null;
  source: 'configured' | 'missing';
  ai: string;
  frontendRebuild: 'railway' | 'webhook' | 'missing';
  notifications: 'configured' | 'missing';
  minImages: number;
  counts: Partial<Record<ItemState, number>>;
  running: boolean;
  lastRun: { id: string; status: string; createdAt: string; finishedAt: string | null } | null;
}

export interface SyncRun {
  id: string;
  trigger: string;
  dryRun: boolean;
  status: string;
  createdAt: string;
  finishedAt: string | null;
  requestedBy: string;
  error: string;
}

export interface SyncReport {
  summary: Partial<Record<string, number>>;
  notPublished: { folder: string; name: string; reasons: string[] }[];
  attention: { folder: string; reasons: string[] }[];
  failed: { folder: string; error: string }[];
  issues: string[];
  ownerActions: string[];
}

export interface SyncRunDetail extends SyncRun {
  report: SyncReport | null;
  reportText: string;
}

export const STATE_LABEL: Record<ItemState, string> = {
  draft: 'Not publishable yet',
  approved: 'Publishing in the next run',
  postponed: 'On hold',
  awaiting_verification: 'Awaiting live check',
  published: 'Published',
  failed: 'Failed',
  linked: 'Existing project',
  missing_from_source: 'Missing from Drive',
};

export function stateTone(state: ItemState): string {
  if (state === 'published') return 'text-accent';
  if (state === 'failed' || state === 'missing_from_source' || state === 'draft') return 'text-red-600';
  if (state === 'linked' || state === 'postponed') return 'text-muted';
  return 'text-ink';
}

export const SOURCE_LABEL: Record<FactSource, string> = {
  owner: 'Edited in the admin',
  site: 'From the site',
  folder: 'From the folder name',
  ai: 'AI · Arabic rendering',
  template: 'Factual summary',
};

/** Published as it is (the AI only renders the title and location in Arabic). */
export const isVerified = (s: FactSource) => s === 'owner' || s === 'site' || s === 'folder';

export const RUN_LABEL: Record<string, string> = {
  succeeded: 'Succeeded',
  attention: 'Needs attention',
  failed: 'Failed',
  skipped: 'Skipped',
  running: 'Running',
};

export function runTone(status: string): string {
  return status === 'failed' ? 'text-red-600' : status === 'succeeded' ? 'text-accent' : 'text-ink';
}

export function triggerLabel(r: SyncRun): string {
  const what = r.dryRun
    ? 'Rehearsal'
    : ({ schedule: 'Scheduled', 'catch-up': 'Catch-up', manual: 'Manual', retry: 'Retry', 'publish-now': 'Publish now' } as Record<string, string>)[r.trigger] ?? r.trigger;
  return r.requestedBy ? `${what} · ${r.requestedBy}` : what;
}
