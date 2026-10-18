import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, SendMailOptions, Transporter } from 'nodemailer';
import { ContactMessage } from './entities/contact-message.entity';

interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  inquiryTo: string[];
}

/** Lets tests supply a transport instead of a real SMTP connection. */
export const INQUIRY_MAIL_TRANSPORT = Symbol('INQUIRY_MAIL_TRANSPORT');

/** One line, no control characters, bounded — safe for a mail header. */
function headerSafe(value: string, max = 120): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Emails the office when a new enquiry arrives, so leads are not left waiting
 * in the admin. Off unless SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM and
 * INQUIRY_NOTIFY_TO are all set. Never throws: the enquiry is already saved,
 * and a mail problem must not turn a successful submission into an error.
 */
@Injectable()
export class InquiryNotifier {
  private readonly logger = new Logger(InquiryNotifier.name);
  private readonly mail: MailConfig;
  private transport?: Pick<Transporter, 'sendMail'>;

  constructor(
    config: ConfigService,
    @Optional() @Inject(INQUIRY_MAIL_TRANSPORT) transport?: Pick<Transporter, 'sendMail'>,
  ) {
    this.mail = config.get<MailConfig>('mail') ?? {
      host: '', port: 465, secure: true, user: '', pass: '', from: '', inquiryTo: [],
    };
    if (!this.enabled) {
      this.logger.log('Enquiry email alerts are off (set SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM, INQUIRY_NOTIFY_TO).');
      return;
    }
    this.transport =
      transport ??
      createTransport({
        host: this.mail.host,
        port: this.mail.port,
        secure: this.mail.secure,
        auth: { user: this.mail.user, pass: this.mail.pass },
      });
  }

  get enabled(): boolean {
    const m = this.mail;
    return !!(m.host && m.user && m.pass && m.from && m.inquiryTo.length);
  }

  /** The email for one enquiry (exposed for tests). */
  compose(msg: ContactMessage): SendMailOptions {
    const service = headerSafe(msg.subject?.replace(/^Enquiry:\s*/i, '') || 'General');
    const received = new Date(msg.createdAt ?? Date.now()).toLocaleString('en-GB', {
      timeZone: 'Asia/Riyadh',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return {
      from: this.mail.from,
      to: this.mail.inquiryTo,
      replyTo: { name: headerSafe(msg.name, 80), address: msg.email },
      subject: headerSafe(`New website enquiry — ${service} — ${msg.name}`, 150),
      text: [
        'A new enquiry was submitted on www.msp.sa.',
        '',
        `Name:     ${msg.name}`,
        `Email:    ${msg.email}`,
        `Phone:    ${msg.phone || '—'}`,
        `Service:  ${service}`,
        `Received: ${received} (Riyadh)`,
        '',
        'Message:',
        msg.message,
        '',
        '—',
        'Reply to this email to answer the enquirer directly.',
        'All enquiries: https://www.msp.sa/admin/messages',
      ].join('\n'),
    };
  }

  /** Sends the alert; resolves false (and logs) instead of throwing. */
  async notify(msg: ContactMessage): Promise<boolean> {
    if (!this.transport) return false;
    try {
      await this.transport.sendMail(this.compose(msg));
      return true;
    } catch (err) {
      this.logger.error(`Enquiry ${msg.id} saved, but the email alert failed: ${(err as Error).message}`);
      return false;
    }
  }
}
