import { copyFile, mkdir, readdir, rename, rm, stat, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { isVerified } from './download';

export async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true, () => false);
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

/**
 * Puts a verified file at `target` without ever exposing a partial file:
 * copy to a sibling `.part`, then rename into place. If `target` already
 * exists with the expected hash it is left alone (idempotent re-run).
 * Rename within one volume/share is the closest thing to atomic that NTFS
 * and SMB offer; this is exercised against a real share in the SMB check.
 */
export async function placeFile(source: string, target: string, expected: { sizeBytes: number; sha256: string }): Promise<'kept' | 'placed'> {
  if (await isVerified(target, expected)) return 'kept';
  await ensureDir(dirname(target));
  const part = `${target}.${process.pid}.part`;
  try {
    await copyFile(source, part);
    if (!(await isVerified(part, expected))) throw new Error(`Copy verification failed for ${target}`);
    await rename(part, target);
    return 'placed';
  } catch (err) {
    await unlink(part).catch(() => undefined);
    throw err;
  }
}

/** Moves a directory (rename; falls back to copy+delete across volumes). Idempotent if already moved. */
export async function moveDir(from: string, to: string): Promise<void> {
  if (!(await exists(from))) return;
  await ensureDir(dirname(to));
  try {
    await rename(from, to);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
    await copyDir(from, to);
    await rm(from, { recursive: true, force: true });
  }
}

async function copyDir(from: string, to: string): Promise<void> {
  await ensureDir(to);
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const s = join(from, entry.name);
    const d = join(to, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await copyFile(s, d);
  }
}

/** Writes small text/JSON files atomically (temp + rename). */
export async function writeAtomic(target: string, content: string | Buffer): Promise<void> {
  await ensureDir(dirname(target));
  const tmp = `${target}.${process.pid}.tmp`;
  try {
    await writeFile(tmp, content);
    await rename(tmp, target);
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    throw err;
  }
}
