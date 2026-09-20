import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { acquireLock } from './lock';

describe('acquireLock', () => {
  let dir: string;
  beforeEach(() => (dir = mkdtempSync(join(tmpdir(), 'msp-lock-'))));
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('creates the lock, refreshes it, and releases it', async () => {
    const lock = await acquireLock(dir, 1000);
    expect(lock).not.toBeNull();
    const before = JSON.parse(readFileSync(join(dir, 'agent.lock'), 'utf8'));
    expect(before.pid).toBe(process.pid);
    await new Promise((r) => setTimeout(r, 20));
    await lock!.refresh();
    const after = JSON.parse(readFileSync(join(dir, 'agent.lock'), 'utf8'));
    expect(after.at > before.at).toBe(true);
    await lock!.release();
    expect(await acquireLock(dir, 1000)).not.toBeNull();
  });

  it('refuses while another live process holds it', async () => {
    writeFileSync(join(dir, 'agent.lock'), JSON.stringify({ pid: 999999, at: new Date().toISOString(), host: 'other' }));
    expect(await acquireLock(dir, 60_000)).toBeNull();
  });

  it('takes over a lock left behind by a crash (older than the stale limit)', async () => {
    writeFileSync(join(dir, 'agent.lock'), JSON.stringify({ pid: 999999, at: new Date(Date.now() - 120_000).toISOString(), host: 'other' }));
    const lock = await acquireLock(dir, 60_000);
    expect(lock).not.toBeNull();
    await lock!.release();
  });
});
