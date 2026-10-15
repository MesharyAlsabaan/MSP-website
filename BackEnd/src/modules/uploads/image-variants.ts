import { existsSync, mkdirSync, renameSync, statSync } from 'fs';
import { extname, join } from 'path';
import sharp from 'sharp';

/**
 * Responsive web copies of uploaded images.
 *
 * The original upload is never touched. Beside it, under `<uploads>/_w/`, we
 * write downscaled WebP copies at a few fixed widths, named
 * `<original-base>.<width>.webp`. The widths match how the site displays
 * images (phone cards ≈ 640, tablet/half-width ≈ 1024, desktop showcase and
 * 2× phones ≈ 1600, full-bleed 2× desktop ≈ 2400).
 *
 * A width is only generated when it is meaningfully smaller than the original
 * (below 90% of its width): a copy that is nearly as large saves nothing, so
 * for those sizes the server falls back to the original instead (see
 * `variantFallback`). Nothing is ever upscaled, so storage grows only by the
 * copies that actually save bytes.
 */
export const VARIANT_WIDTHS = [640, 1024, 1600, 2400] as const;
export const VARIANT_DIR = '_w';

/** WebP quality for the copies — visually lossless for renders and photos at web sizes. */
const WEBP_QUALITY = 82;
/** Only generate a width below this fraction of the original's width. */
const MIN_SAVING_RATIO = 0.9;

const RASTER = /\.(jpe?g|png|webp)$/i;

export function isRaster(filename: string): boolean {
  return RASTER.test(filename);
}

/** `name.jpg` + 1024 → `name.1024.webp` */
export function variantName(filename: string, width: number): string {
  const base = filename.slice(0, filename.length - extname(filename).length);
  return `${base}.${width}.webp`;
}

export interface VariantResult {
  created: { width: number; bytes: number }[];
  /** Widths left to the original because the image isn't wide enough to benefit. */
  skipped: number[];
  /** Widths whose copy already existed (idempotent re-runs). */
  existing: number[];
}

/**
 * Writes the missing responsive copies of one upload. Safe to call repeatedly:
 * existing copies are kept, and each copy is written to a temp file first so
 * a crash never leaves a truncated image behind. `dryRun` reports what would
 * be created without writing anything.
 */
export async function generateVariants(
  uploadDir: string,
  filename: string,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<VariantResult> {
  const result: VariantResult = { created: [], skipped: [], existing: [] };
  if (!isRaster(filename)) return result;

  const source = join(uploadDir, filename);
  // EXIF orientation is applied below, so measure the image as it will be displayed.
  const meta = await sharp(source).metadata();
  const sideways = (meta.orientation ?? 1) >= 5;
  const width = (sideways ? meta.height : meta.width) ?? 0;
  if (!width) return result;

  const outDir = join(uploadDir, VARIANT_DIR);
  if (!dryRun) mkdirSync(outDir, { recursive: true });

  for (const target of VARIANT_WIDTHS) {
    if (target >= width * MIN_SAVING_RATIO) {
      result.skipped.push(target);
      continue;
    }
    const out = join(outDir, variantName(filename, target));
    if (existsSync(out)) {
      result.existing.push(target);
      continue;
    }
    if (dryRun) {
      result.created.push({ width: target, bytes: 0 });
      continue;
    }
    const tmp = `${out}.tmp`;
    await sharp(source)
      .rotate()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 5, smartSubsample: true })
      .toFile(tmp);
    renameSync(tmp, out);
    result.created.push({ width: target, bytes: statSync(out).size });
  }
  return result;
}

/**
 * Resolves a requested copy (`name.1024.webp`) to the file to send: the copy
 * itself when it exists, otherwise the original upload (the image is too
 * narrow for that width, or hasn't been processed yet). Returns null for
 * anything that isn't a well-formed copy name, so callers 404.
 */
export function variantFallback(
  uploadDir: string,
  requested: string,
): { path: string; isCopy: boolean } | null {
  const match = /^([a-z0-9][a-z0-9-]*)\.(\d{3,4})\.webp$/.exec(requested);
  if (!match || !VARIANT_WIDTHS.includes(Number(match[2]) as (typeof VARIANT_WIDTHS)[number])) {
    return null;
  }
  const copy = join(uploadDir, VARIANT_DIR, requested);
  if (existsSync(copy)) return { path: copy, isCopy: true };
  for (const ext of ['.webp', '.jpg', '.jpeg', '.png']) {
    const original = join(uploadDir, `${match[1]}${ext}`);
    if (existsSync(original)) return { path: original, isCopy: false };
  }
  return null;
}
