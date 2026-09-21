/**
 * Sends one test message with the configured SMTP settings and prints only
 * the outcome — never the credentials.   npm run mail:test -- someone@msp.sa
 */
import { MailService, mailOptionsFromEnv } from './mail.service';

async function main(): Promise<void> {
  const to = process.argv[2];
  if (!to) throw new Error('usage: npm run mail:test -- <recipient>');
  const opts = mailOptionsFromEnv();
  // eslint-disable-next-line no-console
  console.log(`SMTP: ${opts.smtp ? `${opts.smtp.host}:${opts.smtp.port} (secure=${opts.smtp.secure}, user=${opts.smtp.user ? 'set' : 'none'})` : 'NOT configured → file outbox'} | from: ${opts.from} | reply-to: ${opts.replyTo ?? '—'}`);
  const r = await new MailService(opts).send({ to, subject: 'اختبار بريد بوابة موردي MSP', text: 'هذه رسالة اختبار من خدمة الموردين. إذا وصلتك فالإرسال يعمل.', html: '<p>هذه رسالة اختبار من خدمة الموردين. إذا وصلتك فالإرسال يعمل.</p>' });
  // eslint-disable-next-line no-console
  console.log(r.delivered ? `delivered to ${to}` : r.error ? `FAILED: ${r.error}` : `written to ${r.outboxFile}`);
  process.exit(r.error ? 1 : 0);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
