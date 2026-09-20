import { createHash } from 'crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { createServer, Server } from 'http';
import { tmpdir } from 'os';
import { join } from 'path';
import { downloadVerified } from './download';

const body = Buffer.from('%PDF-1.7 vendor document bytes '.repeat(50));
const sha = createHash('sha256').update(body).digest('hex');

describe('downloadVerified', () => {
  let dir: string;
  let server: Server;
  let base: string;
  let mode: 'ok' | 'truncate' | 'wrongHash' | 'error' = 'ok';

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (mode === 'error') { res.statusCode = 503; return res.end('down'); }
      const bytes = mode === 'truncate' ? body.subarray(0, 100) : body;
      res.setHeader('Content-Length', String(body.length));
      res.setHeader('X-Checksum-SHA256', mode === 'wrongHash' ? 'f'.repeat(64) : sha);
      res.write(bytes);
      if (mode === 'truncate') return res.destroy();
      res.end();
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'msp-dl-')); mode = 'ok'; });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const target = () => join(dir, 'doc.pdf');

  it('downloads to .part, verifies size and sha256, then renames to .ok', async () => {
    const out = await downloadVerified(`${base}/f`, {}, target(), { sizeBytes: body.length, sha256: sha });
    expect(out).toBe(`${target()}.ok`);
    expect(readFileSync(out).equals(body)).toBe(true);
    expect(existsSync(`${target()}.part`)).toBe(false);
  });

  it('keeps nothing usable when the stream is cut short', async () => {
    mode = 'truncate';
    await expect(downloadVerified(`${base}/f`, {}, target(), { sizeBytes: body.length, sha256: sha })).rejects.toThrow(/size|aborted|socket|truncat/i);
    expect(existsSync(`${target()}.ok`)).toBe(false);
    expect(existsSync(`${target()}.part`)).toBe(false);
  });

  it('rejects a complete download whose hash does not match', async () => {
    await expect(downloadVerified(`${base}/f`, {}, target(), { sizeBytes: body.length, sha256: 'a'.repeat(64) })).rejects.toThrow(/sha256/);
    expect(existsSync(`${target()}.ok`)).toBe(false);
  });

  it('reuses an existing verified .ok file without downloading again', async () => {
    writeFileSync(`${target()}.ok`, body);
    mode = 'error';
    const out = await downloadVerified(`${base}/f`, {}, target(), { sizeBytes: body.length, sha256: sha });
    expect(out).toBe(`${target()}.ok`);
  });

  it('re-downloads when the existing .ok file is corrupt', async () => {
    writeFileSync(`${target()}.ok`, 'garbage');
    const out = await downloadVerified(`${base}/f`, {}, target(), { sizeBytes: body.length, sha256: sha });
    expect(readFileSync(out).equals(body)).toBe(true);
  });

  it('surfaces HTTP errors', async () => {
    mode = 'error';
    await expect(downloadVerified(`${base}/f`, {}, target(), { sizeBytes: body.length, sha256: sha })).rejects.toThrow(/503/);
  });
});
