import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AgentState, JobStep } from './state';

describe('AgentState', () => {
  let dir: string;
  beforeEach(() => (dir = mkdtempSync(join(tmpdir(), 'msp-state-'))));
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('starts empty and persists job progress atomically (no temp files left behind)', async () => {
    const s = await AgentState.load(dir);
    expect(s.job('j1')).toBeUndefined();
    await s.setStep('j1', JobStep.Downloaded, { leaseToken: 't', vendorFolder: 'X' });
    expect(readdirSync(dir)).toEqual(['state.json']);
    const again = await AgentState.load(dir);
    expect(again.job('j1')).toMatchObject({ lastStep: JobStep.Downloaded, leaseToken: 't', vendorFolder: 'X' });
  });

  it('survives a corrupt state file by starting over (and keeps the corrupt copy)', async () => {
    writeFileSync(join(dir, 'state.json'), '{ not json');
    const s = await AgentState.load(dir);
    expect(s.job('j1')).toBeUndefined();
    expect(readdirSync(dir).some((f) => f.startsWith('state.corrupt-'))).toBe(true);
  });

  it('records last success and recent errors for the heartbeat', async () => {
    const s = await AgentState.load(dir);
    await s.recordError('j1', 'boom');
    await s.recordSuccess('j1');
    expect(s.job('j1')).toBeUndefined(); // finished jobs are dropped
    expect(s.summary().lastSuccessAt).toBeDefined();
    expect(s.summary().recentErrors[0]).toMatchObject({ jobId: 'j1', message: 'boom' });
    expect(JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')).completedJobIds).toContain('j1');
  });
});
