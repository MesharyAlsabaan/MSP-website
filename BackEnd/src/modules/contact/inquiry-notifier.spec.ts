import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { ContactMessage } from './entities/contact-message.entity';
import { InquiryNotifier } from './inquiry-notifier.service';
import { ContactService } from './contact.service';

const MAIL = {
  host: 'smtp.example.test',
  port: 465,
  secure: true,
  user: 'website@msp.sa',
  pass: 'not-a-real-password',
  from: 'MSP Website <website@msp.sa>',
  inquiryTo: ['info@msp.sa'],
};
const config = (mail: unknown) => ({ get: (k: string) => (k === 'mail' ? mail : undefined) }) as unknown as ConfigService;

const enquiry = (over: Partial<ContactMessage> = {}): ContactMessage =>
  ({
    id: 'e1',
    name: 'Sara Client',
    email: 'sara@example.com',
    phone: '+966 50 000 0000',
    subject: 'Enquiry: Construction Supervision',
    message: 'We need supervision for a villa in Riyadh.',
    read: false,
    createdAt: new Date('2026-10-18T09:00:00Z'),
    updatedAt: new Date('2026-10-18T09:00:00Z'),
    ...over,
  }) as ContactMessage;

describe('InquiryNotifier', () => {
  it('stays off — and never touches a transport — unless fully configured', async () => {
    const sendMail = jest.fn();
    for (const missing of ['host', 'user', 'pass', 'from', 'inquiryTo']) {
      const mail = { ...MAIL, [missing]: missing === 'inquiryTo' ? [] : '' };
      const n = new InquiryNotifier(config(mail), { sendMail });
      expect(n.enabled).toBe(false);
      await expect(n.notify(enquiry())).resolves.toBe(false);
    }
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('emails the office with the enquiry, replying straight to the enquirer', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    const n = new InquiryNotifier(config(MAIL), { sendMail });
    await expect(n.notify(enquiry())).resolves.toBe(true);
    const sent = sendMail.mock.calls[0][0];
    expect(sent.to).toEqual(['info@msp.sa']);
    expect(sent.from).toBe('MSP Website <website@msp.sa>');
    expect(sent.replyTo).toEqual({ name: 'Sara Client', address: 'sara@example.com' });
    expect(sent.subject).toBe('New website enquiry — Construction Supervision — Sara Client');
    expect(sent.text).toContain('Phone:    +966 50 000 0000');
    expect(sent.text).toContain('We need supervision for a villa in Riyadh.');
    expect(sent.text).toContain('https://www.msp.sa/admin/messages');
  });

  it('cannot be used to inject mail headers (checked on the real message nodemailer builds)', async () => {
    const real = createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
    const n = new InquiryNotifier(config(MAIL), real);
    const attack = enquiry({
      name: 'Eve\r\nBcc: victim@example.com',
      subject: 'Enquiry: X\nBcc: other@example.com',
    });
    const info = (await real.sendMail(n.compose(attack))) as unknown as { message: Buffer };
    const headers = info.message.toString().split('\n\n')[0];
    expect(headers).not.toMatch(/^bcc:/im);
    expect(headers).toMatch(/^Reply-To: /m);
    expect(headers).toMatch(/^To: info@msp\.sa$/m);
  });

  it('never throws when sending fails: the enquiry is already saved', async () => {
    const n = new InquiryNotifier(config(MAIL), { sendMail: jest.fn().mockRejectedValue(new Error('SMTP down')) });
    await expect(n.notify(enquiry())).resolves.toBe(false);
  });
});

describe('ContactService.submit', () => {
  it('saves the enquiry first and alerts by email without making the visitor wait', async () => {
    const order: string[] = [];
    const repo = {
      create: (dto: object) => dto,
      save: jest.fn(async (m: object) => (order.push('saved'), { ...m, id: 'e2' })),
    };
    const notifier = { notify: jest.fn(async () => (order.push('notified'), false)) };
    const svc = new ContactService(repo as never, {} as never, notifier as never);
    const saved = await svc.submit({ name: 'A', email: 'a@b.co', message: 'Hello there' });
    expect(saved).toMatchObject({ id: 'e2' });
    expect(order[0]).toBe('saved');
    expect(notifier.notify).toHaveBeenCalledWith(expect.objectContaining({ id: 'e2' }));
  });
});
