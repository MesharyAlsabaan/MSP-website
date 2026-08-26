import { Role } from '../enums/role.enum';

export interface AdminNavItem {
  path: string;
  label: string;
  /** Resource path on the API (for dashboard counts), if applicable. */
  resource?: string;
  /** Roles allowed to see this item; omitted = all admins. */
  roles?: Role[];
}

/** Sidebar / dashboard sections for the admin CMS. */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/admin/projects', label: 'Projects', resource: 'projects' },
  { path: '/admin/services', label: 'Services', resource: 'services' },
  { path: '/admin/team', label: 'Team', resource: 'team' },
  { path: '/admin/testimonials', label: 'Testimonials', resource: 'testimonials' },
  { path: '/admin/partners', label: 'Partners', resource: 'partners' },
  { path: '/admin/blog', label: 'Blog', resource: 'blog' },
  {
    path: '/admin/messages',
    label: 'Messages',
    resource: 'contact',
    roles: [Role.SuperAdmin, Role.ContentManager],
  },
  {
    path: '/admin/settings',
    label: 'Settings',
    roles: [Role.SuperAdmin, Role.ContentManager],
  },
  { path: '/admin/users', label: 'Users', roles: [Role.SuperAdmin] },
];
