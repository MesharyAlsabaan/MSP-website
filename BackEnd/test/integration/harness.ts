import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { createServer, Server } from 'http';
import { createServer as createTcpServer, Server as TcpServer } from 'net';
import { join } from 'path';
import { Client } from 'pg';
import sharp from 'sharp';

const admin = () =>
  new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: 'postgres' });

export async function createDatabase(name: string): Promise<void> {
  const c = admin();
  await c.connect();
  await c.query(`CREATE DATABASE "${name}"`);
  await c.end();
}

export async function dropDatabase(name: string): Promise<void> {
  const c = admin();
  await c.connect();
  await c.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await c.end();
}

export function db(): Client {
  return new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
}

/**
 * A distinct picture per colour: the colour seeds where light and dark blocks
 * sit, so different colours are different pictures (not only different bytes),
 * and the same colour is the same picture at any size or format.
 */
export async function picture(colour: string, width = 2000, height = 1500): Promise<Buffer> {
  let seed = parseInt(colour.slice(1), 16) || 1;
  const next = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0);
  const blocks = Array.from({ length: 6 }, (_, i) => ({
    input: { create: { width: Math.round(width * 0.22), height: Math.round(height * 0.28), channels: 3 as const, background: i % 2 ? '#f4f1ea' : '#15181c' } },
    left: Math.round(((next() % 1000) / 1000) * width * 0.76),
    top: Math.round(((next() % 1000) / 1000) * height * 0.7),
  }));
  return sharp({ create: { width, height, channels: 3, background: colour } }).composite(blocks).jpeg({ quality: 90 }).toBuffer();
}

export async function photo(path: string, colour: string, width = 2000, height = 1500): Promise<void> {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, await picture(colour, width, height));
}

/**
 * Stands in for the public website. Like the real one, a project page carries
 * its canonical/hreflang and the sitemap lists it ONLY after a rebuild has
 * prerendered it; before that the client-side fallback answers 200 with no
 * SEO tags. A rebuild reads the published projects from the database.
 */
export class FakeSite {
  rebuilds = 0;
  lastSecret = '';
  private built = new Set<string>();
  private server?: Server;

  constructor(private readonly port: number, private readonly uploadDir: string) {}

  async start(): Promise<void> {
    this.server = createServer((req, res) => void this.handle(req.method ?? 'GET', req.url ?? '/', req.headers['x-rebuild-secret'] as string, res));
    await new Promise<void>((r) => this.server!.listen(this.port, '127.0.0.1', r));
  }

  stop(): Promise<void> {
    return new Promise((r) => this.server?.close(() => r()) ?? r());
  }

  private async published(): Promise<{ slug: string }[]> {
    const c = db();
    await c.connect();
    const { rows } = await c.query(`SELECT slug FROM projects WHERE status = 'published'`);
    await c.end();
    return rows;
  }

  private async handle(method: string, url: string, secret: string, res: import('http').ServerResponse): Promise<void> {
    const path = decodeURIComponent(url.split('?')[0]);
    if (method === 'POST' && path === '/__rebuild') {
      this.rebuilds++;
      this.lastSecret = secret;
      res.writeHead(202).end();
      // The build takes a moment, then the new pages are live.
      setTimeout(async () => (this.built = new Set((await this.published()).map((p) => p.slug))), 500);
      return;
    }
    const page = /^(\/ar)?\/projects\/([^/]+)$/.exec(path);
    if (page) {
      const slug = page[2];
      const en = `https://www.msp.sa/projects/${slug}`;
      const ar = `https://www.msp.sa/ar/projects/${slug}`;
      const html = this.built.has(slug)
        ? `<html><head><link rel="canonical" href="${page[1] ? ar : en}"><link rel="alternate" hreflang="en" href="${en}"><link rel="alternate" hreflang="ar" href="${ar}"></head></html>`
        : '<html><head><title>MSP</title></head><body><app-root></app-root></body></html>';
      res.writeHead(200, { 'Content-Type': 'text/html' }).end(html);
      return;
    }
    if (path === '/sitemap.xml') {
      const locs = [...this.built].flatMap((s) => [`https://www.msp.sa/projects/${s}`, `https://www.msp.sa/ar/projects/${s}`]);
      res.writeHead(200, { 'Content-Type': 'application/xml' }).end(`<urlset>${locs.map((l) => `<url><loc>${l}</loc></url>`).join('')}</urlset>`);
      return;
    }
    const api = /^\/api\/projects\/slug\/([^/]+)$/.exec(path);
    if (api) {
      const live = (await this.published()).some((p) => p.slug === api[1]);
      res.writeHead(live ? 200 : 404, { 'Content-Type': 'application/json' }).end('{}');
      return;
    }
    const upload = /^\/api\/uploads\/([^/]+)$/.exec(path);
    if (upload && existsSync(join(this.uploadDir, upload[1]))) {
      res.writeHead(200, { 'Content-Type': 'image/webp' });
      createReadStream(join(this.uploadDir, upload[1])).pipe(res);
      return;
    }
    res.writeHead(404).end();
  }
}

/** Minimal SMTP server that keeps every message it receives (no TLS, no auth). */
export class MailSink {
  messages: { from: string; to: string[]; data: string }[] = [];
  private server?: TcpServer;

  constructor(private readonly port: number) {}

  async start(): Promise<void> {
    this.server = createTcpServer((socket) => {
      let buffer = '';
      let inData = false;
      let msg = { from: '', to: [] as string[], data: '' };
      const say = (line: string) => socket.write(`${line}\r\n`);
      say('220 sink ESMTP');
      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        let i: number;
        while ((i = buffer.indexOf('\r\n')) >= 0) {
          const line = buffer.slice(0, i);
          buffer = buffer.slice(i + 2);
          if (inData) {
            if (line === '.') {
              inData = false;
              this.messages.push(msg);
              msg = { from: '', to: [], data: '' };
              say('250 OK');
            } else msg.data += `${line.startsWith('..') ? line.slice(1) : line}\n`;
            continue;
          }
          const cmd = line.slice(0, 4).toUpperCase();
          if (cmd === 'EHLO' || cmd === 'HELO') say('250 sink');
          else if (cmd === 'MAIL') (msg.from = line), say('250 OK');
          else if (cmd === 'RCPT') msg.to.push(line), say('250 OK');
          else if (cmd === 'DATA') (inData = true), say('354 go');
          else if (cmd === 'QUIT') say('221 bye'), socket.end();
          else say('250 OK');
        }
      });
    });
    await new Promise<void>((r) => this.server!.listen(this.port, '127.0.0.1', r));
  }

  stop(): Promise<void> {
    return new Promise((r) => this.server?.close(() => r()) ?? r());
  }

  /** The decoded text of the last message (nodemailer may use quoted-printable). */
  lastText(): string {
    const raw = this.messages.at(-1)?.data ?? '';
    return raw.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
}
