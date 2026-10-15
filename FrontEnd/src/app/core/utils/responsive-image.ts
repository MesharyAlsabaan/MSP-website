import { assetUrl } from './asset-url';

/**
 * Widths of the responsive copies the backend writes beside each upload
 * (`/api/uploads/_w/<name>.<width>.webp`). Must match the backend's
 * VARIANT_WIDTHS. A width the backend skipped (image too narrow) is answered
 * with the original, so every candidate here always resolves.
 */
export const VARIANT_WIDTHS = [640, 1024, 1600, 2400] as const;

/** An uploaded raster image, with the name pattern the backend accepts for copies. */
const UPLOAD = /^(.*\/api\/uploads\/)([a-z0-9][a-z0-9-]*)\.(?:webp|jpe?g|png)$/;

/**
 * `srcset` for an uploaded image, or null for anything else (static assets,
 * SVGs, external URLs) so the attribute is simply omitted.
 */
export function responsiveSrcset(value: string | null | undefined): string | null {
  const match = UPLOAD.exec(assetUrl(value));
  if (!match) return null;
  const [, dir, base] = match;
  return VARIANT_WIDTHS.map((w) => `${dir}_w/${base}.${w}.webp ${w}w`).join(', ');
}
