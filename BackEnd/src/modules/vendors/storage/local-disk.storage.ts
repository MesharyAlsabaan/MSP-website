import { createReadStream, createWriteStream } from 'fs';
import { access, mkdir, rename, stat, unlink } from 'fs/promises';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { DocumentStorage } from './document-storage';

/**
 * DocumentStorage on a local directory. Writes go to a `.part` file and are
 * renamed into place only when the whole stream succeeded, so a reader can
 * never observe a truncated document. The directory is NEVER exposed through
 * useStaticAssets — only authenticated endpoints stream from it.
 */
export class LocalDiskStorage implements DocumentStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async put(key: string, data: Buffer | AsyncIterable<Buffer | Uint8Array>): Promise<void> {
    const target = this.pathFor(key);
    if (await this.exists(key)) return; // content-addressed: same key ⇒ same bytes
    await mkdir(dirname(target), { recursive: true });
    const part = `${target}.${process.pid}.${Date.now()}.part`;
    try {
      const source = Buffer.isBuffer(data) ? Readable.from([data]) : Readable.from(data);
      await pipeline(source, createWriteStream(part, { flags: 'wx' }));
      await rename(part, target);
    } catch (err) {
      await unlink(part).catch(() => undefined);
      throw err;
    }
  }

  get(key: string): Readable {
    return createReadStream(this.pathFor(key));
  }

  async stat(key: string): Promise<{ sizeBytes: number }> {
    const s = await stat(this.pathFor(key));
    return { sizeBytes: s.size };
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.pathFor(key));
      return true;
    } catch {
      return false;
    }
  }

  /** Resolves a key under the root and refuses anything that would leave it. */
  private pathFor(key: string): string {
    if (isAbsolute(key) || key.includes('..') || key.includes('\\')) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    const full = resolve(join(this.root, normalize(key)));
    if (!full.startsWith(this.root + sep)) throw new Error(`Invalid storage key: ${key}`);
    return full;
  }
}
