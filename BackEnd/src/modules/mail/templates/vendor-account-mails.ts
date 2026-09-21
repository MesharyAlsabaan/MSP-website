import { MailMessage } from '../mail.service';

type Draft = Omit<MailMessage, 'to'>;

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]);

const wrap = (title: string, bodyHtml: string): string =>
  `<!doctype html><html lang="ar" dir="rtl"><body style="font-family:Segoe UI,Tahoma,Arial,sans-serif;line-height:1.7;color:#1f2937">` +
  `<h2 style="margin:0 0 12px">${esc(title)}</h2>${bodyHtml}` +
  `<p style="color:#64748b;font-size:12px;margin-top:24px">MSP الهندسي — بوابة الموردين</p></body></html>`;

const button = (url: string, label: string): string =>
  `<p><a href="${esc(url)}" style="display:inline-block;background:#0e7490;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${esc(label)}</a></p>`;

export function verifyEmailMail(contactName: string, url: string, ttlHours: number): Draft {
  const subject = 'تفعيل حسابك في بوابة موردي MSP';
  const text = [`الأستاذ/ة ${contactName}،`, 'شكراً لتسجيلك في بوابة موردي MSP الهندسي. لتفعيل حسابك اضغط الرابط التالي:', url, '', `الرابط صالح لمدة ${ttlHours} ساعة ولمرة واحدة. إن لم تكن أنت من سجّل، تجاهل هذه الرسالة.`].join('\n');
  const html = wrap('تفعيل الحساب', `<p>الأستاذ/ة ${esc(contactName)}،</p><p>شكراً لتسجيلك في بوابة موردي MSP الهندسي.</p>${button(url, 'تفعيل الحساب')}<p style="color:#64748b;font-size:12px">الرابط صالح لمدة ${ttlHours} ساعة ولمرة واحدة. إن لم تكن أنت من سجّل، تجاهل هذه الرسالة.</p>`);
  return { subject, text, html };
}

export function passwordResetMail(contactName: string, url: string, ttlHours: number): Draft {
  const subject = 'إعادة تعيين كلمة المرور — بوابة موردي MSP';
  const text = [`الأستاذ/ة ${contactName}،`, 'وصلنا طلب لإعادة تعيين كلمة المرور. استخدم الرابط التالي:', url, '', `الرابط صالح لمدة ${ttlHours} ساعة ولمرة واحدة. إن لم تطلب ذلك، تجاهل هذه الرسالة وستبقى كلمة مرورك كما هي.`].join('\n');
  const html = wrap('إعادة تعيين كلمة المرور', `<p>الأستاذ/ة ${esc(contactName)}،</p><p>وصلنا طلب لإعادة تعيين كلمة المرور.</p>${button(url, 'إعادة تعيين كلمة المرور')}<p style="color:#64748b;font-size:12px">الرابط صالح لمدة ${ttlHours} ساعة ولمرة واحدة. إن لم تطلب ذلك، تجاهل هذه الرسالة.</p>`);
  return { subject, text, html };
}
