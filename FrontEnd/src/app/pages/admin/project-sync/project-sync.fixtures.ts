import { ProjectDraft, SyncItem, SyncItemDetail, SyncStatus } from './project-sync.models';

/** Test data shaped like the API's responses. */

export const API = 'http://localhost:3000/api/project-sync';

export const status = (over: Partial<SyncStatus> = {}): SyncStatus => ({
  enabled: true,
  scheduleActive: true,
  times: '08:00,19:00',
  timezone: 'Asia/Riyadh',
  nextRun: '2026-10-30T05:00:00.000Z',
  source: 'configured',
  ai: 'claude-opus-5-5',
  frontendRebuild: 'railway',
  notifications: 'configured',
  minImages: 3,
  counts: {},
  running: false,
  lastRun: { id: 'r1', status: 'succeeded', createdAt: '2026-10-29T16:00:00.000Z', finishedAt: '2026-10-29T16:04:00.000Z' },
  ...over,
});

export const item = (over: Partial<SyncItem> = {}): SyncItem => ({
  id: 'i-16',
  sourceFolderId: 'F16',
  folderName: '16_rihana-plaza-commercial-building',
  slug: 'rihana-plaza-commercial-building',
  mode: 'owned',
  state: 'pending_review',
  projectId: null,
  issues: [],
  attempts: 0,
  lastPublishedAt: null,
  lastVerifiedAt: null,
  decidedBy: '',
  decidedAt: null,
  decisionNote: '',
  updatedAt: '2026-10-29T16:00:00.000Z',
  title: 'Rihana Plaza',
  titleAr: 'ريحانة بلازا',
  cover: 'a'.repeat(32),
  imageCount: 3,
  blocking: [],
  unconfirmed: ['Title (English)'],
  aiText: true,
  canUndo: false,
  urlEn: '',
  urlAr: '',
  ...over,
});

export function draft(): ProjectDraft {
  const s = (value: string, source: 'folder' | 'ai' | 'owner' = 'ai') => ({ value, source, basis: source === 'folder' ? 'folder name "16_…"' : undefined });
  return {
    facts: {
      titleEn: s('Rihana Plaza', 'folder'),
      titleAr: s('ريحانة بلازا'),
      locationEn: s('Maadi, Cairo, Egypt', 'owner'),
      locationAr: s('المعادي، القاهرة، مصر', 'owner'),
      year: s('', 'folder'),
      statusEn: s('', 'folder'),
      statusAr: s('', 'folder'),
      sectors: { value: ['commercial'], source: 'folder' },
      designCategories: { value: ['architecture'], source: 'folder' },
      disciplines: { value: [], source: 'folder' },
    },
    content: {
      summaryEn: { value: 'A commercial building whose facade steps back at the upper floors.', source: 'ai' },
      summaryAr: { value: 'مبنى تجاري تتراجع واجهته في الأدوار العليا.', source: 'ai' },
      descriptionEn: { value: ['First paragraph.', 'Second paragraph.'], source: 'ai' },
      descriptionAr: { value: ['الفقرة الأولى.', 'الفقرة الثانية.'], source: 'ai' },
    },
    visualNotes: ['Stepped glass facade'],
    images: [
      { sourceId: 's1', path: 'facade.jpg', md5: 'a'.repeat(32), width: 3000, height: 2000, included: true },
      { sourceId: 's2', path: 'street.jpg', md5: 'b'.repeat(32), width: 3000, height: 2000, included: true },
      { sourceId: 's3', path: 'INT/lobby.jpg', md5: 'c'.repeat(32), width: 3000, height: 2000, included: true },
      { sourceId: 's4', path: 'thumb.jpg', md5: 'd'.repeat(32), width: 0, height: 0, included: false, problem: 'too small (800×600; long edge must be at least 1200px)' },
    ],
    cover: 'a'.repeat(32),
    ai: { model: 'claude-opus-5-5', at: '2026-10-29T16:00:00.000Z' },
    notes: [],
  };
}

export const detail = (over: Partial<SyncItemDetail> = {}): SyncItemDetail => ({
  ...item(),
  draft: draft(),
  readiness: { blocking: [], unconfirmed: ['Title (English)', 'Title (Arabic)', 'Sectors', 'Design categories'], warnings: [] },
  minImages: 3,
  ...over,
});
