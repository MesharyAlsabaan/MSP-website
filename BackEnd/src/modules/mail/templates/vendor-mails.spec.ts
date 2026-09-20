import { completionRequestMail, decisionMail, teamSubmissionMail } from './vendor-mails';

const app = {
  requestNumber: 'REQ-2026-0042',
  vendorNumber: 'SUP-000123',
  companyName: 'شركة البناء الحديث',
  categoryName: 'مقاولون عامون',
  contactName: 'أحمد',
  revisionNo: 2,
};

describe('vendor mail templates', () => {
  it('team notification carries the numbers, company and review link', () => {
    const m = teamSubmissionMail(app, 'https://msp.sa/admin/vendors/abc', false);
    expect(m.subject).toContain('REQ-2026-0042');
    expect(m.text).toContain('شركة البناء الحديث');
    expect(m.html).toContain('https://msp.sa/admin/vendors/abc');
    expect(m.subject).toMatch(/جديد/);
  });

  it('marks a resubmission distinctly', () => {
    const m = teamSubmissionMail(app, 'https://msp.sa/admin/vendors/abc', true);
    expect(m.subject).toMatch(/إعادة/);
    expect(m.text).toContain('v2');
  });

  it('completion request lists the missing items and the one-time link', () => {
    const m = completionRequestMail(
      app,
      'https://msp.sa/vendors/resume/tok',
      ['السجل التجاري منتهي', 'شهادة الضريبة'],
      'يرجى التحديث',
    );
    expect(m.text).toContain('السجل التجاري منتهي');
    expect(m.html).toContain('https://msp.sa/vendors/resume/tok');
    expect(m.text).toContain('يرجى التحديث');
  });

  it('escapes HTML in vendor-supplied text', () => {
    const m = teamSubmissionMail({ ...app, companyName: '<script>x</script>' }, 'https://x', false);
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('&lt;script&gt;');
  });

  it('decision mail states approval or rejection with the reason', () => {
    expect(decisionMail(app, 'approved', '').subject).toMatch(/اعتماد/);
    const r = decisionMail(app, 'rejected', 'لا يتوافق مع المتطلبات');
    expect(r.subject).toMatch(/اعتذار|رفض/);
    expect(r.text).toContain('لا يتوافق مع المتطلبات');
  });
});
