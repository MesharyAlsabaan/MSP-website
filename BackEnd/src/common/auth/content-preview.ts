import { AuthUser } from '../decorators/current-user.decorator';
import { Role } from '../enums/role.enum';

/** Staff roles that may see unpublished (draft / inactive) website content. */
export const CONTENT_PREVIEW_ROLES: readonly string[] = [Role.SuperAdmin, Role.ContentManager, Role.Editor];

/**
 * True only for an authenticated staff user with a content role. Public
 * website endpoints use this to decide whether `includeDrafts` /
 * `includeInactive` and lookups of unpublished items are honoured; for
 * everyone else they are ignored and only published content is returned.
 */
export function canPreviewContent(user: AuthUser | null | undefined): boolean {
  return !!user && CONTENT_PREVIEW_ROLES.includes(user.role);
}
