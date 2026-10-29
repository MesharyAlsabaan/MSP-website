import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { generateVariants } from '../uploads/image-variants';
import { IMAGE_FILE, SourceFile } from './source';

/**
 * Project images: checked, de-duplicated and re-encoded for the web, never
 * altered. The only transforms are EXIF rotation and a proportional downscale
 * so the long edge is at most MAX_EDGE — no crop, no fill, no retouching, so
 * geometry, proportions and composition are exactly the source's. The
 * responsive copies are then made by the same code as manual uploads.
 */

export const MIN_EDGE = 1200;
const MAX_EDGE = 2560;
const MAX_SOURCE_BYTES = 60 * 1024 * 1024;
const WEBP_QUALITY = 86;

export interface PreparedImage {
  sourceId: string;
  sourcePath: string;
  md5: string;
  data: Buffer;
  width: number;
  height: number;
}

export interface ImageIssue {
  file: string;
  problem: string;
}

/**
 * Render passes the 3D software writes beside the finished image (lighting,
 * texture and mask layers, e.g. `001_CoronaLight1886.jpg`, `02_VRayLight.jpg`,
 * `00_CMasking_WireColor.jpg`). They are images, but not pictures of the
 * project: listed in the draft, never selected by default.
 */
const RENDER_PASS = /(corona\s*(light|sun)|vray\s*ligh|ctexmap|cmasking|wire\s*colou?r|zdepth|render\s*element|raw\s*lighting|_alpha\b)/i;
export const isRenderPass = (path: string) => RENDER_PASS.test(path.split('/').pop() ?? path);

/** Natural order (2 before 10), cover first when the register names one. */
export function orderImages(files: SourceFile[], cover: string, exclude: string[]): SourceFile[] {
  const excluded = new Set(exclude.map((e) => e.toLowerCase()));
  const name = (f: SourceFile) => f.path.split('/').pop()!.toLowerCase();
  const usable = files
    .filter((f) => IMAGE_FILE.test(f.path))
    .filter((f) => !excluded.has(name(f)) && !excluded.has(f.path.toLowerCase()))
    .sort((a, b) => a.path.localeCompare(b.path, 'en', { numeric: true }));
  const c = cover.toLowerCase();
  const i = c ? usable.findIndex((f) => name(f) === c || f.path.toLowerCase() === c) : -1;
  if (i > 0) usable.unshift(...usable.splice(i, 1));
  return usable;
}

/** Admin preview copies: big enough to judge an image, small enough to page through. */
const PREVIEW = { maxEdge: 1600, quality: 80 };

export async function prepareImage(
  file: SourceFile,
  raw: Buffer,
  size: { maxEdge: number; quality: number } = { maxEdge: MAX_EDGE, quality: WEBP_QUALITY },
): Promise<PreparedImage | ImageIssue> {
  if (raw.length > MAX_SOURCE_BYTES) return { file: file.path, problem: `larger than ${MAX_SOURCE_BYTES >> 20} MB` };
  let meta: sharp.Metadata;
  try {
    meta = await sharp(raw).metadata();
  } catch {
    return { file: file.path, problem: 'not a readable image (corrupted or unsupported)' };
  }
  const sideways = (meta.orientation ?? 1) >= 5;
  const width = (sideways ? meta.height : meta.width) ?? 0;
  const height = (sideways ? meta.width : meta.height) ?? 0;
  if (Math.max(width, height) < MIN_EDGE) {
    return { file: file.path, problem: `too small (${width}×${height}; long edge must be at least ${MIN_EDGE}px)` };
  }
  try {
    const { data, info } = await sharp(raw)
      .rotate()
      .resize({ width: size.maxEdge, height: size.maxEdge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: size.quality, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    return {
      sourceId: file.id,
      sourcePath: file.path,
      md5: file.md5 ?? createHash('md5').update(raw).digest('hex'),
      data,
      // The source's own size: what the reviewer judges and the checks apply to.
      width,
      height,
    };
  } catch (err) {
    return { file: file.path, problem: `could not be converted: ${(err as Error).message}` };
  }
}

/**
 * Writes one prepared image into the uploads folder under a clean SEO name
 * (`<slug>-03.webp`, suffixed only on collision — an existing upload is never
 * overwritten) and creates its responsive copies. Returns the public URL.
 */
export async function storeImage(uploadDir: string, apiPrefix: string, slug: string, index: number, image: PreparedImage): Promise<string> {
  mkdirSync(uploadDir, { recursive: true });
  const base = `${slug}-${String(index + 1).padStart(2, '0')}`;
  let name = `${base}.webp`;
  for (let n = 2; existsSync(join(uploadDir, name)); n++) name = `${base}-${n}.webp`;
  const tmp = join(uploadDir, `.${name}.tmp`);
  writeFileSync(tmp, image.data);
  renameSync(tmp, join(uploadDir, name));
  await generateVariants(uploadDir, name);
  return `/${apiPrefix}/uploads/${name}`;
}

/**
 * Private preview copies for the admin, kept OUTSIDE the public uploads folder
 * so unapproved images are never reachable from the website. Served only by
 * the authenticated admin API. Losing the folder is harmless: previews are
 * remade from the source on demand.
 */
export class PreviewStore {
  constructor(private readonly dir: string) {}

  private path(folderId: string, md5: string): string {
    const key = createHash('sha1').update(folderId).digest('hex').slice(0, 16);
    if (!/^[a-f0-9]{32}$/.test(md5)) throw new Error('Invalid image id');
    return join(this.dir, key, `${md5}.webp`);
  }

  has(folderId: string, md5: string): boolean {
    return existsSync(this.path(folderId, md5));
  }

  read(folderId: string, md5: string): Buffer | null {
    const p = this.path(folderId, md5);
    return existsSync(p) ? readFileSync(p) : null;
  }

  write(folderId: string, md5: string, data: Buffer): void {
    const p = this.path(folderId, md5);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(`${p}.tmp`, data);
    renameSync(`${p}.tmp`, p);
  }

  /** Checks one source image and stores its preview; returns its size or the reason it is unusable. */
  async add(folderId: string, file: SourceFile, raw: Buffer): Promise<PreparedImage | ImageIssue> {
    const r = await prepareImage(file, raw, PREVIEW);
    if (!('problem' in r)) this.write(folderId, r.md5, r.data);
    return r;
  }
}

/** A preview re-encoded as a small JPEG for the AI (vision input). */
export function forModel(preview: Buffer): Promise<Buffer> {
  return sharp(preview).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
}
