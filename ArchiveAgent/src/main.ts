import { ArchiveApi } from './api-client';
import { Archiver } from './archiver';
import { loadConfig } from './config';
import { downloadVerified } from './download';
import { upsertRegisterRow } from './excel/register';
import { ensureDir, exists } from './files';
import { acquireLock, Lock } from './lock';
import { Logger } from './logger';
import { AgentState } from './state';

/**
 * Entry point. `node dist/main.js` polls forever (installed as a Windows
 * service); `node dist/main.js --once` does one pass and exits (manual runs,
 * scheduled tasks, tests). Exit codes: 0 ok, 2 configuration error,
 * 3 another instance holds the lock, 4 archive root unreachable.
 */
async function main(): Promise<number> {
  const once = process.argv.includes('--once');
  let cfg;
  try {
    cfg = loadConfig();
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return 2;
  }
  const log = new Logger(cfg.logDir);
  await log.info(`msp-archive-agent starting (agentId=${cfg.agentId}, mode=${once ? 'once' : 'service'}, root=${cfg.archiveRoot})`);

  if (!(await exists(cfg.archiveRoot))) {
    // Do not create the root: a typo in the share path must not silently archive to the wrong place.
    await log.error(`archive root is not reachable: ${cfg.archiveRoot}`);
    if (once) return 4;
  }

  const lockDir = `${cfg.stateDir}`;
  await ensureDir(lockDir);
  const lock: Lock | null = await acquireLock(lockDir, cfg.pollIntervalSec * 3000);
  if (!lock) {
    await log.error('another agent instance holds the lock; exiting');
    return 3;
  }

  const api = new ArchiveApi(cfg.apiBaseUrl, cfg.apiKey, cfg.agentId);
  const state = await AgentState.load(cfg.stateDir);
  const archiver = new Archiver(cfg, state, {
    api,
    download: (jobId, leaseToken, doc, targetBase) =>
      downloadVerified(api.documentUrl(jobId, doc.id, leaseToken), api.documentHeaders(), targetBase, { sizeBytes: doc.sizeBytes, sha256: doc.sha256 }),
    upsertRegister: upsertRegisterRow,
    log,
  });

  let stopping = false;
  const stop = () => { stopping = true; void log.info('stop requested; finishing current pass'); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  let exitCode = 0;
  try {
    do {
      await lock.refresh();
      if (!(await exists(cfg.archiveRoot))) {
        await log.warn(`archive root unreachable (${cfg.archiveRoot}); jobs stay pending on the server until it is back`);
        await api.heartbeat({ ...state.summary(), archiveRootReachable: false }).catch(() => undefined);
      } else {
        try {
          const r = await archiver.runOnce();
          if (r.completed || r.retryLater || r.failed || r.skipped) await log.info(`pass done: ${JSON.stringify(r)}`);
          await api.heartbeat({ ...state.summary(), archiveRootReachable: true, lastPass: r }).catch(() => undefined);
        } catch (err) {
          await log.error(`pass failed: ${(err as Error).message}`);
          exitCode = 1;
        }
      }
      if (once || stopping) break;
      await new Promise((r) => setTimeout(r, cfg.pollIntervalSec * 1000));
    } while (!stopping);
  } finally {
    await lock.release();
    await log.info('agent stopped');
  }
  return exitCode;
}

main().then((code) => process.exit(code), (err) => { process.stderr.write(`${err?.stack ?? err}\n`); process.exit(1); });
