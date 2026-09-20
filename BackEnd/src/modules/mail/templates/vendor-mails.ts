import { MailMessage } from '../mail.service';

export interface VendorMailContext {
  requestNumber: string;
  vendorNumber: string;
  companyName: string;
  categoryName: string;
  contactName: string;
  revisionNo: number;
}

type Draft = Omit<MailMessage, 'to'>;

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]);

const button = (url: string, label: string): string =>
  `<p><a href="${esc(url)}" style="display:inline-block;background:#0e7490;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${esc(label)}</a></p>`;

const wrap = (title: string, bodyHtml: string): string =>
  `<!doctype html><html lang="ar" dir="rtl"><body style="font-family:Segoe UI,Tahoma,Arial,sans-serif;line-height:1.7;color:#1f2937">` +
  `<h2 style="margin:0 0 12px">${esc(title)}</h2>${bodyHtml}` +
  `<p style="color:#64748b;font-size:12px;margin-top:24px">MSP الهندسي — بوابة تأهيل الموردين</p></body></html>`;

const rows = (pairs: [string, string][]): string =>
  `<table style="border-collapse:collapse">${pairs
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`)
    .join('')}</table>`;

/** To the review team: a new submission or a resubmission awaits review. */
export function teamSubmissionMail(ctx: VendorMailContext, reviewUrl: string, resubmitted: boolean): Draft {
  const kind = resubmitted ? `إعادة إرسال طلب تأهيل (v${ctx.revisionNo})` : 'طلب تأهيل مورد جديد';
  const subject = `${kind} — ${ctx.requestNumber} — ${ctx.companyName}`;
  const text = [
    kind,
    `رقم الطلب: ${ctx.requestNumber} (الإصدار v${ctx.revisionNo})`,
    `رقم المورد: ${ctx.vendorNumber}`,
    `الشركة: ${ctx.companyName}`,
    `التصنيف: ${ctx.categoryName}`,
    `مسؤول التواصل: ${ctx.contactName}`,
    '',
    `للمراجعة (يتطلب تسجيل الدخول): ${reviewUrl}`,
  ].join('\n');
  const html = wrap(
    kind,
    rows([
      ['رقم الطلب', `${ctx.requestNumber} (v${ctx.revisionNo})`],
      ['رقم المورد', ctx.vendorNumber],
      ['الشركة', ctx.companyName],
      ['التصنيف', ctx.categoryName],
      ['مسؤول التواصل', ctx.contactName],
    ]) +
      button(reviewUrl, 'فتح الطلب للمراجعة') +
      `<p style="color:#64748b;font-size:12px">الرابط يفتح لوحة الإدارة ويتطلب تسجيل الدخول بحساب مخوَّل.</p>`,
  );
  return { subject, text, html };
}

/** To the vendor: what is missing and the one-time link to fix and resubmit. */
export function completionRequestMail(
  ctx: VendorMailContext,
  resumeUrl: string,
  missingItems: string[],
  note: string,
): Draft {
  const subject = `طلب استكمال بيانات — ${ctx.requestNumber}`;
  const items = missingItems.length ? missingItems : ['— لم تُحدَّد بنود —'];
  const text = [
    `الأستاذ/ة ${ctx.contactName}،`,
    `راجع فريق MSP طلب تأهيل ${ctx.companyName} (رقم الطلب ${ctx.requestNumber}) ويحتاج استكمال ما يلي:`,
    ...items.map((i) => `- ${i}`),
    note ? `\nملاحظة الفريق: ${note}` : '',
    '',
    'لتحديث الطلب وإعادة إرساله استخدم الرابط التالي (صالح لمدة 14 يوماً ولمرة واحدة):',
    resumeUrl,
  ].join('\n');
  const html = wrap(
    'طلب استكمال بيانات',
    `<p>الأستاذ/ة ${esc(ctx.contactName)}،</p>` +
      `<p>راجع فريق MSP طلب تأهيل <b>${esc(ctx.companyName)}</b> (رقم الطلب <b>${esc(ctx.requestNumber)}</b>) ويحتاج استكمال ما يلي:</p>` +
      `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` +
      (note ? `<p><b>ملاحظة الفريق:</b> ${esc(note)}</p>` : '') +
      button(resumeUrl, 'تحديث الطلب وإعادة إرساله') +
      `<p style="color:#64748b;font-size:12px">الرابط صالح لمدة 14 يوماً ولمرة واحدة.</p>`,
  );
  return { subject, text, html };
}

/** To the vendor: the final decision. */
export function decisionMail(ctx: VendorMailContext, decision: 'approved' | 'rejected', reason: string): Draft {
  if (decision === 'approved') {
    const subject = `اعتماد تأهيل المورد — ${ctx.companyName} — ${ctx.vendorNumber}`;
    const text = [
      `الأستاذ/ة ${ctx.contactName}،`,
      `يسرّنا إبلاغكم باعتماد تأهيل ${ctx.companyName} لدى MSP الهندسي.`,
      `رقم المورد: ${ctx.vendorNumber} — رقم الطلب: ${ctx.requestNumber}`,
      reason ? `\n${reason}` : '',
    ].join('\n');
    const html = wrap(
      'اعتماد تأهيل المورد',
      `<p>الأستاذ/ة ${esc(ctx.contactName)}،</p><p>يسرّنا إبلاغكم باعتماد تأهيل <b>${esc(ctx.companyName)}</b> لدى MSP الهندسي.</p>` +
        `<p>رقم المورد: <b>${esc(ctx.vendorNumber)}</b> — رقم الطلب: <b>${esc(ctx.requestNumber)}</b></p>` +
        (reason ? `<p>${esc(reason)}</p>` : ''),
    );
    return { subject, text, html };
  }
  const subject = `اعتذار عن قبول طلب التأهيل — ${ctx.requestNumber}`;
  const text = [
    `الأستاذ/ة ${ctx.contactName}،`,
    `نشكر ${ctx.companyName} على التقدم لبوابة الموردين. نعتذر عن قبول الطلب ${ctx.requestNumber} في الوقت الحالي.`,
    reason ? `السبب: ${reason}` : '',
  ].join('\n');
  const html = wrap(
    'اعتذار عن قبول طلب التأهيل',
    `<p>الأستاذ/ة ${esc(ctx.contactName)}،</p><p>نشكر <b>${esc(ctx.companyName)}</b> على التقدم لبوابة الموردين. نعتذر عن قبول الطلب <b>${esc(ctx.requestNumber)}</b> في الوقت الحالي.</p>` +
      (reason ? `<p><b>السبب:</b> ${esc(reason)}</p>` : ''),
  );
  return { subject, text, html };
}
