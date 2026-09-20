/** Admin roles, mirroring the backend RBAC model (see prd.md). */
export enum Role {
  SuperAdmin = 'SUPER_ADMIN',
  ContentManager = 'CONTENT_MANAGER',
  Editor = 'EDITOR',
  /** May review and decide vendor qualification applications. */
  VendorReviewer = 'VENDOR_REVIEWER',
}
