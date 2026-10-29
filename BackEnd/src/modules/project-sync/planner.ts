import { createHash } from 'crypto';
import { orderImages } from './images';
import { parseFolderName, SourceFile, SourceFolder } from './source';

/**
 * Change detection, kept free of I/O so every rule is unit-tested. Given the
 * Drive folders, what the sync recorded last time and the projects on the
 * site, decides one action per folder. The folder is the owner's approval:
 * what is in it is published without a further decision.
 *
 *   new folder ─► prepared ─► published (verified live) ─► source changed ─► updated
 *
 * Safety rules encoded here and in the service:
 *  - A folder is matched by its Drive ID; a renamed folder is not a new project
 *    and keeps its page URL.
 *  - A folder that matches a project already on the site (slug or number) is
 *    LINKED to it, never duplicated: from then on its images are kept in step
 *    with the folder, and its text stays as the CMS has it.
 *  - Field by field, what a person edited in the CMS is never overwritten.
 *  - Nothing is ever deleted from the site. A folder that disappears is reported.
 */

export type ItemMode = 'owned' | 'linked';
export type ItemState =
  /** Cannot be published yet (no title or no usable image); retried every run. */
  | 'draft'
  /** Ready: published in this or the next run (an admin edit, publish-now, resume). */
  | 'approved'
  /** Held in the admin: not published, or a live page not updated. */
  | 'postponed'
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
}

export interface SiteProject {
  id: string;
  slug: string;
  no: string;
  updatedAt: Date;
}

export type Action =
  /** Read the folder (new, changed, or not publishable last time), then publish what it gives. */
  | { kind: 'prepare'; reason: 'new' | 'source-changed' | 'retry-draft'; project?: SiteProject }
  /** Publish the current draft (after an admin edit, or a retry after a failure). */
  | { kind: 'publish'; project?: SiteProject }
  | { kind: 'verify'; project: SiteProject }
  | { kind: 'unchanged'; held?: boolean }
  /** First sight of a folder for a project already on the site. */
  | { kind: 'link'; project: SiteProject; how: string }
  | { kind: 'review'; reasons: string[] };

export interface FolderPlan {
  folder: SourceFolder;
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

/** Retries after this many consecutive failures stop until someone presses Retry in the admin. */
export const MAX_ATTEMPTS = 5;

/** Identity of a folder's source: its name and its images (by content and place). */
export function sourceHash(name: string, images: SourceFile[]): string {
  return createHash('sha256')
    .update(JSON.stringify({ name, images: images.map((f) => [f.id, f.md5 ?? f.modifiedTime, f.path]) }))
    .digest('hex');
}

export function plan(input: { folders: SourceFolder[]; items: KnownItem[]; projects: SiteProject[] }): Plan {
  const items = new Map(input.items.map((i) => [i.sourceFolderId, i]));
  const bySlug = new Map(input.projects.map((p) => [p.slug.toLowerCase(), p]));
  const byId = new Map(input.projects.map((p) => [p.id, p]));
  const byNo = new Map<string, SiteProject[]>();
  for (const p of input.projects) byNo.set(p.no, [...(byNo.get(p.no) ?? []), p]);
  // Slugs already taken by a folder the sync knows about, and projects already linked to one.
  const claimed = new Map<string, string>(input.items.filter((i) => i.slug).map((i) => [i.slug, i.sourceFolderId]));
  const linkedProjects = new Set(input.items.filter((i) => i.projectId).map((i) => i.projectId!));

  const folders: FolderPlan[] = input.folders.map((folder) => {
    const parsed = parseFolderName(folder.name);
    const known = items.get(folder.id);
    // A published folder keeps its page URL even when renamed.
    const slug = (known?.projectId ? known.slug : parsed?.slug) || known?.slug || '';
    const no = parsed?.no ?? '';
    const images = orderImages(folder.files);
    const hash = sourceHash(folder.name, images);
    const base = { folder, slug, no, hash, images };
    const review = (...reasons: string[]): FolderPlan => ({ ...base, action: { kind: 'review', reasons } });

    if (!parsed) return review('Folder name is not "NN_project-name" (e.g. 16_rihana-plaza) — rename it in Drive');

    const other = claimed.get(slug);
    if (other && other !== folder.id) return review(`Another folder already publishes "${slug}" — rename one of them`);
    claimed.set(slug, folder.id);

    if (!known) {
      const sameNo = byNo.get(no) ?? [];
      const existing = bySlug.get(parsed.slug) || (sameNo.length === 1 ? sameNo[0] : undefined);
      if (existing && linkedProjects.has(existing.id)) return review(`The site project "${existing.slug}" is already kept in step with another folder`);
      if (existing) return { ...base, action: { kind: 'link', project: existing, how: existing.slug.toLowerCase() === parsed.slug ? 'slug' : `number ${no}` } };
      if (bySlug.has(slug)) return review(`A site project already uses "${slug}"`);
      return { ...base, action: { kind: 'prepare', reason: 'new' } };
    }

    const project = known.projectId ? byId.get(known.projectId) : undefined;
    if (known.projectId && !project) return review('The project was deleted from the site — it is not recreated; delete the folder or restore the project');
    if (known.state === 'postponed') return { ...base, action: { kind: 'unchanged', held: true } };

    if (known.sourceHash !== hash) return { ...base, action: { kind: 'prepare', reason: 'source-changed', project } };

    switch (known.state) {
      case 'draft':
        return { ...base, action: { kind: 'prepare', reason: 'retry-draft', project } };
      case 'approved':
        return { ...base, action: { kind: 'publish', project } };
      case 'failed':
        if (known.attempts >= MAX_ATTEMPTS) return review(`Publishing failed ${known.attempts} times — see the error, then press Retry in the admin`);
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
