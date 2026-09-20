import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MailService } from './mail.service';

describe('MailService without SMTP configured', () => {
  let outbox: string;
  let mail: MailService;

  beforeEach(() => {
    outbox = mkdtempSync(join(tmpdir(), 'msp-outbox-'));
    mail = new MailService({ smtp: null, from: 'MSP <no-reply@example.test>', outboxDir: outbox });
  });
  afterEach(() => rmSync(outbox, { recursive: true, force: true }));

  it('writes each message as an .eml file instead of sending', async () => {
    const result = await mail.send({
      to: 'team@example.test',
      subject: 'طلب تأهيل جديد REQ-2026-0001',
      text: 'hello',
      html: '<p>hello</p>',
    });
    const files = readdirSync(outbox);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/\.eml$/);
    const raw = readFileSync(join(outbox, files[0]), 'utf8');
    expect(raw).toContain('To: team@example.test');
    expect(raw).toContain('hello');
    expect(result.delivered).toBe(false);
    expect(result.outboxFile).toBe(join(outbox, files[0]));
  });

  it('never throws to the caller when the outbox is unwritable', async () => {
    writeFileSync(join(outbox, 'blocker'), 'not a directory');
    const broken = new MailService({ smtp: null, from: 'x@example.test', outboxDir: join(outbox, 'blocker', 'nope') });
    const result = await broken.send({ to: 'a@example.test', subject: 's', text: 't' });
    expect(result.delivered).toBe(false);
    expect(result.error).toBeDefined();
  });
});
