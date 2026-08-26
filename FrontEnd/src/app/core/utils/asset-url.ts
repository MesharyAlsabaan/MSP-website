import { environment } from '../../../environments/environment';

/**
 * Backend origin (apiUrl without the trailing `/api`). Used to resolve
 * admin-uploaded image URLs in development, where the frontend (`:4200`) and the
 * backend (`:3000`) are different origins. In production apiUrl is `/api`, so this
 * resolves to `''` and uploads stay same-origin (served by nginx).
 */
const API_ORIGIN = environment.apiUrl.replace(/\/api\/?$/, '');

/**
 * Resolve a stored image string to a usable `src`.
 *
 * - absolute `http(s)://…` URLs pass through unchanged
 * - `/api/uploads/…` (admin uploads) get the backend origin prepended in dev, and
 *   stay untouched in prod (same-origin)
 * - `/images/…` or any other root-relative path is a frontend static asset
 * - a relative path that already names a folder (e.g. `images/proj-1.jpg`, as the
 *   seed stores it) is made root-relative as-is
 * - a bare filename resolves against the frontend's `/images/` folder (back-compat
 *   with the original static placeholder data)
 * - a bare token with no file extension (e.g. the seed's `compass` icon keyword)
 *   is not an image at all → `''`, so no broken `<img>` can be rendered
 * - empty / null → `''` (templates should guard on the RESOLVED value)
 */
const HAS_FILE_EXTENSION = /\.[a-z0-9]{2,5}$/i;

export function assetUrl(value: string | null | undefined): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/api/')) return `${API_ORIGIN}${value}`;
  if (value.startsWith('/')) return value;
  if (value.includes('/')) return `/${value}`;
  return HAS_FILE_EXTENSION.test(value) ? `/images/${value}` : '';
}
