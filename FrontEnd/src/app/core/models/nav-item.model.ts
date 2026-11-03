/** A navigation link rendered in headers, footers, and menus. */
export interface NavItem {
  label: string;
  path: string;
  /** Optional external URL (renders an anchor instead of a routerLink). */
  external?: boolean;
}
