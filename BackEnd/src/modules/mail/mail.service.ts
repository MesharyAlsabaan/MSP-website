import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import * as nodemailer from 'nodemailer';

export interface MailMessage {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface MailSendResult {
  /** true only when an SMTP server accepted the message */
  delivered: boolean;
  outboxFile?: string;
  error?: string;
}

export interface MailOptions {
  smtp: { host: string; port: number; secure: boolean; user?: string; pass?: string } | null;
  from: string;
  /** Default Reply-To (e.g. supply@msp.sa) so vendors' replies reach the team, whatever the sending mailbox. */
  replyTo?: string;
  /** Where messages are written as .eml when no SMTP is configured (local/test). */
  outboxDir: string;
}

/**
 * Thin nodemailer wrapper. With SMTP_* set it sends; without, every message
 * is written to `outboxDir` as an .eml so the whole flow can be exercised
 * locally without touching a real mailbox. Sending never throws — a mail
 * failure must not undo a vendor's submission or a reviewer's decision; the
 * result is logged and returned instead.
 */
@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly opts: MailOptions) {
    this.transporter = opts.smtp
      ? nodemailer.createTransport({
          host: opts.smtp.host,
          port: opts.smtp.port,
          secure: opts.smtp.secure,
          auth: opts.smtp.user ? { user: opts.smtp.user, pass: opts.smtp.pass } : undefined,
        })
      : nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
  }

  get configured(): boolean {
    return this.opts.smtp !== null;
  }

  async send(msg: MailMessage): Promise<MailSendResult> {
    try {
      const info = await this.transporter.sendMail({ from: this.opts.from, replyTo: this.opts.replyTo, ...msg });
      if (this.opts.smtp) {
        this.log.log(`Sent "${msg.subject}" (${info.messageId})`);
        return { delivered: true };
      }
      await mkdir(this.opts.outboxDir, { recursive: true });
      const safe = msg.subject.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60);
      const file = join(this.opts.outboxDir, `${Date.now()}-${safe}.eml`);
      await writeFile(file, info.message as Buffer);
      this.log.warn(`SMTP not configured — wrote "${msg.subject}" to ${file}`);
      return { delivered: false, outboxFile: file };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.log.error(`Mail "${msg.subject}" failed: ${error}`);
      return { delivered: false, error };
    }
  }
}

/** Builds MailOptions from environment variables (no secrets are logged). */
export function mailOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): MailOptions {
  const host = env.SMTP_HOST?.trim();
  return {
    smtp: host
      ? {
          host,
          port: parseInt(env.SMTP_PORT ?? '587', 10),
          secure: env.SMTP_SECURE === 'true',
          user: env.SMTP_USER || undefined,
          pass: env.SMTP_PASS || undefined,
        }
      : null,
    from: env.MAIL_FROM ?? 'MSP Design <no-reply@msp.sa>',
    replyTo: env.MAIL_REPLY_TO || undefined,
    outboxDir: env.MAIL_OUTBOX_DIR ?? 'mail-outbox',
  };
}
