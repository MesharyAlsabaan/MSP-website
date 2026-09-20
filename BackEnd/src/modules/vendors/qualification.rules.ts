import { ConflictException } from '@nestjs/common';
import { QualificationStatus, ReviewAction } from './vendor.enums';

/**
 * The qualification state machine, in one place.
 *
 *   under_review ──completion_requested──▶ needs_completion ──(vendor resubmits)──▶ under_review
 *   under_review ──approved──▶ approved   (terminal)
 *   under_review ──rejected──▶ rejected   (terminal)
 *   needs_completion ──rejected──▶ rejected
 *   approved ──update_requested──▶ needs_completion   (renewal round; the approved record stays until the new revision is approved)
 */
export function assertReviewerAction(current: QualificationStatus, action: ReviewAction): void {
  if (action === ReviewAction.UpdateRequested) {
    if (current === QualificationStatus.Approved) return;
    throw new ConflictException('An update round can only be opened on an approved application.');
  }
  if (current === QualificationStatus.Approved || current === QualificationStatus.Rejected) {
    throw new ConflictException(`Application is already ${current}; no further decision is possible.`);
  }
  if (current === QualificationStatus.NeedsCompletion) {
    if (action === ReviewAction.Rejected) return;
    throw new ConflictException(
      'A completion request is outstanding; wait for the vendor to resubmit before deciding.',
    );
  }
  // under_review: any decision is allowed
}

/** The vendor may only edit and resubmit while the team is waiting on them. */
export function canVendorResubmit(current: QualificationStatus): boolean {
  return current === QualificationStatus.NeedsCompletion;
}
