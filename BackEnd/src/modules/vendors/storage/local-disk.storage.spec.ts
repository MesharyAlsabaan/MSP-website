import { createHash } from 'crypto';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LocalDiskStorage } from './local-disk.storage';
import { storageKeyFor } from './document-storage';

describe('LocalDiskStorage', () => {
  let root: string;
  let storage: LocalDiskStorage;
  const bytes = Buffer.from('%PDF-1.4 hello vendor');
  const sha = createHash('sha256').update(bytes).digest('hex');

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'msp-docs-'));
    storage = new LocalDiskStorage(root);
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('derives a fanned-out, content-addressed key from the sha256', () => {
    expect(storageKeyFor(sha)).toBe(`${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}`);
  });

  it('stores bytes and reads them back unchanged', async () => {
    const key = storageKeyFor(sha);
    await storage.put(key, bytes);
    expect(await storage.exists(key)).toBe(true);
    expect((await storage.stat(key)).sizeBytes).toBe(bytes.length);
    const chunks: Buffer[] = [];
    for await (const c of storage.get(key)) chunks.push(Buffer.from(c));
    expect(Buffer.concat(chunks).equals(bytes)).toBe(true);
  });

  it('writing the same key twice keeps one file and does not fail', async () => {
    const key = storageKeyFor(sha);
    await storage.put(key, bytes);
    await storage.put(key, bytes);
    expect((await storage.stat(key)).sizeBytes).toBe(bytes.length);
  });

  it('never leaves a half-written file behind on failure', async () => {
    const key = storageKeyFor(sha);
    const failing = {
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('partial');
        throw new Error('upload aborted');
      },
    };
    await expect(storage.put(key, failing)).rejects.toThrow('upload aborted');
    expect(await storage.exists(key)).toBe(false);
  });

  it('rejects keys that try to escape the root', async () => {
    await expect(storage.put('../outside', bytes)).rejects.toThrow(/key/);
  });
});
