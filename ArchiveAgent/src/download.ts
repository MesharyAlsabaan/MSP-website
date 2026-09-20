import { createHash } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, rename, stat, unlink } from 'fs/promises';
import { dirname } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export interface Expected {
  sizeBytes: number;
  sha256: string;
}

async function sha256File(path: string): Promise<string> {
  const h = createHash('sha256');
  await pipeline(createReadStream(path), async function* (source) {
    for await (const chunk of source) h.update(chunk as Buffer);
  });
  return h.digest('hex');
}

/** True when `path` exists with exactly the expected size and hash. */
export async function isVerified(path: string, expected: Expected): Promise<boolean> {
  try {
    const s = await stat(path);
    if (s.size !== expected.sizeBytes) return false;
    return (await sha256File(path)) === expected.sha256;
  } catch {
    return false;
  }
}

/**
 * Downloads `url` to `<target>.part`, verifies byte count and SHA-256 against
 * what the server promised, then renames to `<target>.ok`. A short or
 * corrupt transfer leaves no `.ok` and no `.part`. An existing `.ok` that
 * verifies is reused, so a restart never downloads the same file twice.
 */
export async function downloadVerified(url: string, headers: Record<string, string>, target: string, expected: Expected): Promise<string> {
  const ok = `${target}.ok`;
  const part = `${target}.part`;
  if (await isVerified(ok, expected)) return ok;
  await unlink(ok).catch(() => undefined);
  await mkdir(dirname(target), { recursive: true });

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    const e = err as Error & { cause?: { message?: string } };
    throw new Error(`Download aborted before any data: ${e.cause?.message ?? e.message}`);
  }
  if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status} for ${url}`);

  const hash = createHash('sha256');
  let received = 0;
  try {
    await pipeline(
      Readable.fromWeb(res.body as import('stream/web').ReadableStream),
      async function* (source) {
        for await (const chunk of source) {
          const buf = chunk as Buffer;
          received += buf.length;
          if (received > expected.sizeBytes) throw new Error(`Download exceeded expected size (${expected.sizeBytes} bytes)`);
          hash.update(buf);
          yield buf;
        }
      },
      createWriteStream(part, { flags: 'w' }),
    );
    if (received !== expected.sizeBytes) throw new Error(`Download truncated: got ${received} of ${expected.sizeBytes} bytes`);
    const digest = hash.digest('hex');
    if (digest !== expected.sha256) throw new Error(`Download sha256 mismatch (expected ${expected.sha256.slice(0, 12)}…, got ${digest.slice(0, 12)}…)`);
    await rename(part, ok);
    return ok;
  } catch (err) {
    await unlink(part).catch(() => undefined);
    const e = err as Error & { cause?: { message?: string } };
    if (/^fetch failed$/i.test(e.message ?? '')) {
      throw new Error(`Download aborted after ${received} of ${expected.sizeBytes} bytes: ${e.cause?.message ?? 'connection lost'}`);
    }
    throw err;
  }
}
