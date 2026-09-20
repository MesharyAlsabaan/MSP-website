import { QualificationStatus, ReviewAction } from './vendor.enums';
import { assertReviewerAction, canVendorResubmit } from './qualification.rules';

describe('qualification transitions', () => {
  const { UnderReview, NeedsCompletion, Approved, Rejected } = QualificationStatus;

  it('lets a reviewer act on an application under review', () => {
    for (const a of [ReviewAction.CompletionRequested, ReviewAction.Approved, ReviewAction.Rejected]) {
      expect(() => assertReviewerAction(UnderReview, a)).not.toThrow();
    }
  });

  it('refuses any further decision once approved or rejected', () => {
    for (const s of [Approved, Rejected]) {
      for (const a of [ReviewAction.CompletionRequested, ReviewAction.Approved, ReviewAction.Rejected]) {
        expect(() => assertReviewerAction(s, a)).toThrow(/already/);
      }
    }
  });

  it('does not let a reviewer approve while waiting on the vendor', () => {
    expect(() => assertReviewerAction(NeedsCompletion, ReviewAction.Approved)).toThrow(/completion/);
    expect(() => assertReviewerAction(NeedsCompletion, ReviewAction.Rejected)).not.toThrow();
  });

  it('allows an update round to be opened on an approved application only', () => {
    expect(() => assertReviewerAction(Approved, ReviewAction.UpdateRequested)).not.toThrow();
    for (const s of [UnderReview, NeedsCompletion, Rejected]) {
      expect(() => assertReviewerAction(s, ReviewAction.UpdateRequested)).toThrow();
    }
  });

  it('only allows the vendor to resubmit when completion was requested', () => {
    expect(canVendorResubmit(NeedsCompletion)).toBe(true);
    expect(canVendorResubmit(UnderReview)).toBe(false);
    expect(canVendorResubmit(Approved)).toBe(false);
    expect(canVendorResubmit(Rejected)).toBe(false);
  });
});
