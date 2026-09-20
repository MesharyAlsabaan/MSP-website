/** Admin roles for RBAC. Mirrors the frontend Role enum. */
export enum Role {
  SuperAdmin = 'SUPER_ADMIN',
  ContentManager = 'CONTENT_MANAGER',
  Editor = 'EDITOR',
  /** May review, request completion, approve and reject vendor applications. */
  VendorReviewer = 'VENDOR_REVIEWER',
}
