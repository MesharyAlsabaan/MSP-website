import { mkdir, open, readFile, unlink, writeFile } from 'fs/promises';
import { hostname } from 'os';
import { join } from 'path';

export interface Lock {
  refresh(): Promise<void>;
  release(): Promise<void>;
}

/**
 * Single-instance guard for one machine/folder. The lock file carries the
 * holder's pid and a heartbeat timestamp that `refresh()` updates every poll;
 * a lock older than `staleMs` is treated as left behind by a crash and taken
 * over. (Concurrency between machines is handled by the server-side lease,
 * not by this file.)
 */
export async function acquireLock(dir: string, staleMs: number): Promise<Lock | null> {
  await mkdir(dir, { recursive: true });
  const file = join(dir, 'agent.lock');
  const payload = () => JSON.stringify({ pid: process.pid, host: hostname(), at: new Date().toISOString() });

  const tryCreate = async (): Promise<boolean> => {
    try {
      const fh = await open(file, 'wx');
      await fh.writeFile(payload(), 'utf8');
      await fh.close();
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') return false;
      throw err;
    }
  };

  if (!(await tryCreate())) {
    let stale = false;
    try {
      const existing = JSON.parse(await readFile(file, 'utf8')) as { pid?: number; at?: string };
      const age = Date.now() - new Date(existing.at ?? 0).getTime();
      stale = !existing.at || Number.isNaN(age) || age > staleMs;
    } catch {
      stale = true; // unreadable lock file: treat as garbage
    }
    if (!stale) return null;
    await unlink(file).catch(() => undefined);
    if (!(await tryCreate())) return null; // someone else won the race
  }

  return {
    refresh: () => writeFile(file, payload(), 'utf8'),
    release: () => unlink(file).catch(() => undefined),
  };
}
