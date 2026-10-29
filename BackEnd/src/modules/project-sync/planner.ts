import { createHash } from 'crypto';
import { RegisterRow } from './register';
import { orderImages } from './images';
import { parseFolderName, SourceFile, SourceFolder } from './source';

/**
 * Change detection, kept free of I/O so every rule is unit-tested. Given the
 * source (folders + optional register), what the sync recorded last time and
 * the projects on the site, decides one action per folder.
 *
 * Lifecycle of a folder the sync owns:
 *
 *   new folder ─► draft prepared ─► pending_review ─► approved ─► published (verified live)
 *                                      │    ▲             │
 *                     postponed/rejected    └─ source or draft changed: needs approval again
 *
 * Safety rules encoded here:
 *  - Nothing is published without an approval of the exact draft (approvedHash).
 *  - A folder is matched by its Drive ID; a name change is not a new project.
 *  - A folder that matches a project already on the site (site_slug, slug or
 *    number) is LINKED and never modified: the CMS stays its owner.
 *  - A project edited in the CMS after the sync published it is not overwritten.
 *  - Nothing is ever deleted. A folder that disappears is flagged.
 */

export type ItemMode = 'owned' | 'linked';
export type ItemState =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'postponed'
  | 'rejected'
  | 'awaiting_verification'
  | 'published'
  | 'failed'
  | 'linked'
  | 'missing_from_source';

export interface KnownItem {
  sourceFolderId: string;
  slug: string;
  mode: ItemMode;
  state: ItemState;
  sourceHash: string;
  projectId: string | null;
  attempts: number;
  lastPublishedAt: Date | null;
}

export interface SiteProject {
  id: string;
  slug: string;
  no: string;
  updatedAt: Date;
}

export type Action =
  /** Build or refresh the draft (new folder, or its source changed). */
  | { kind: 'prepare'; reason: 'new' | 'source-changed' | 'retry-draft'; project?: SiteProject }
  /** Approved: create the project, or apply the approved update. */
  | { kind: 'publish'; project?: SiteProject }
  | { kind: 'verify'; project: SiteProject }
  | { kind: 'unchanged' }
  | { kind: 'link'; project: SiteProject; how: string }
  | { kind: 'review'; reasons: string[] };

export interface FolderPlan {
  folder: SourceFolder;
  row?: RegisterRow;
  slug: string;
  no: string;
  hash: string;
  images: SourceFile[];
  action: Action;
}

export interface Plan {
  folders: FolderPlan[];
  /** Known items whose folder is no longer in the source. */
  missing: KnownItem[];
}

/** Retries after this many consecutive failures stop until the owner retries by hand. */
export const MAX_ATTEMPTS = 5;
/** CMS edits within this window of our own save are our save, not a person's. */
const OWN_SAVE_SLACK_MS = 10_000;

/** Identity of a folder's source: its images (by content) and its register row. */
export function sourceHash(row: RegisterRow | undefined, images: SourceFile[]): string {
  return createHash('sha256')
    .update(JSON.stringify({ row: row ?? null, images: images.map((f) => [f.id, f.md5 ?? f.modifiedTime, f.path]) }))
    .digest('hex');
}

/** True when a person changed the project in the CMS after the sync last saved it. */
export function editedInCms(project: SiteProject, known: KnownItem): boolean {
  return !!known.lastPublishedAt && project.updatedAt.getTime() > known.lastPublishedAt.getTime() + OWN_SAVE_SLACK_MS;
}

export function plan(input: { folders: SourceFolder[]; rows: Map<string, RegisterRow>; items: KnownItem[]; projects: SiteProject[] }): Plan {
  const items = new Map(input.items.map((i) => [i.sourceFolderId, i]));
  const bySlug = new Map(input.projects.map((p) => [p.slug.toLowerCase(), p]));
  const byId = new Map(input.projects.map((p) => [p.id, p]));
  const byNo = new Map<string, SiteProject[]>();
  for (const p of input.projects) byNo.set(p.no, [...(byNo.get(p.no) ?? []), p]);
  // Slugs already taken by another folder the sync knows about.
  const claimed = new Map<string, string>(input.items.filter((i) => i.slug).map((i) => [i.slug, i.sourceFolderId]));

  const folders: FolderPlan[] = input.folders.map((folder) => {
    const parsed = parseFolderName(folder.name);
    const row = input.rows.get(folder.name);
    const slug = (row?.siteSlug || parsed?.slug || '').toLowerCase();
    const no = parsed?.no ?? '';
    const images = orderImages(folder.files, row?.cover ?? '', row?.exclude ?? []);
    const hash = sourceHash(row, images);
    const base = { folder, row, slug, no, hash, images };
    const known = items.get(folder.id);
    const review = (...reasons: string[]): FolderPlan => ({ ...base, action: { kind: 'review', reasons } });

    if (!parsed) return review('Folder name is not "NN_slug" (e.g. 16_rihana-plaza) — rename it in Drive');

    const other = claimed.get(slug);
    if (other && other !== folder.id) return review(`Slug "${slug}" is also used by another folder — rename one of them`);
    claimed.set(slug, folder.id);

    // Linked projects belong to the CMS: report source changes, apply nothing.
    if (known?.mode === 'linked') {
      const project = known.projectId ? byId.get(known.projectId) : undefined;
      if (!project) return review('The linked site project no longer exists');
      if (known.sourceHash !== hash) return review('New or changed images for a project managed in the CMS — not applied; add them in the admin if wanted');
      return { ...base, action: { kind: 'unchanged' } };
    }

    if (!known) {
      const existing =
        (row?.siteSlug && bySlug.get(row.siteSlug.toLowerCase())) ||
        bySlug.get(parsed.slug) ||
        ((byNo.get(no)?.length ?? 0) === 1 ? byNo.get(no)![0] : undefined);
      if (existing) {
        const how = row?.siteSlug ? 'site_slug' : existing.slug.toLowerCase() === parsed.slug ? 'slug' : `number ${no}`;
        return { ...base, action: { kind: 'link', project: existing, how } };
      }
      return { ...base, action: { kind: 'prepare', reason: 'new' } };
    }

    const project = known.projectId ? byId.get(known.projectId) : undefined;
    if (known.projectId && !project) return review('The project was deleted from the site after publishing — it is not recreated');

    if (known.sourceHash !== hash) return { ...base, action: { kind: 'prepare', reason: 'source-changed', project } };

    switch (known.state) {
      case 'draft':
        return { ...base, action: { kind: 'prepare', reason: 'retry-draft' } };
      case 'approved':
        if (project && editedInCms(project, known)) {
          return review('Edited in the CMS since the sync published it — the approved update was not applied, to keep those edits');
        }
        return { ...base, action: { kind: 'publish', project } };
      case 'failed':
        if (known.attempts >= MAX_ATTEMPTS) return review(`Publishing failed ${known.attempts} times — fix the cause, then press Retry in the admin`);
        return { ...base, action: { kind: 'publish', project } };
      case 'awaiting_verification':
        return project ? { ...base, action: { kind: 'verify', project } } : review('Saved project is missing');
      default:
        return { ...base, action: { kind: 'unchanged' } };
    }
  });

  const seen = new Set(input.folders.map((f) => f.id));
  const missing = input.items.filter((i) => !seen.has(i.sourceFolderId) && i.state !== 'missing_from_source');
  return { folders, missing };
}
