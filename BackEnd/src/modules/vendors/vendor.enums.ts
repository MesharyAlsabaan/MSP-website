/** Qualification of the application — what the review team decided. */
export enum QualificationStatus {
  UnderReview = 'under_review',
  NeedsCompletion = 'needs_completion',
  Approved = 'approved',
  Rejected = 'rejected',
}

/**
 * Archiving of an APPROVED revision into the office network — tracked apart
 * from qualification so an office outage never changes what was approved.
 */
export enum ArchiveStatus {
  Pending = 'pending',
  Transferring = 'transferring',
  Completed = 'completed',
  Failed = 'failed',
}

/** Append-only audit trail entries. */
export enum ReviewAction {
  Submitted = 'submitted',
  Resubmitted = 'resubmitted',
  CompletionRequested = 'completion_requested',
  Approved = 'approved',
  Rejected = 'rejected',
  ArchiveRetried = 'archive_retried',
}

/** The decision recorded on one revision (null while still under review). */
export enum RevisionDecision {
  NeedsCompletion = 'needs_completion',
  Approved = 'approved',
  Rejected = 'rejected',
}

/** Fields a vendor fills in; frozen per revision as a jsonb snapshot. */
export interface VendorProfileData {
  companyName: string;
  companyNameEn?: string;
  specialty?: string;
  contactName: string;
  phone?: string;
  mobile: string;
  email: string;
  city: string;
  address?: string;
  commercialRegistrationNo: string;
  vatNo?: string;
  website?: string;
  primaryCategoryKey: string;
  secondaryCategoryKeys: string[];
  notes?: string;
}
