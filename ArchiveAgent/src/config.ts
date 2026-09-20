import { readFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';

export interface AgentConfig {
  apiBaseUrl: string;
  agentId: string;
  archiveRoot: string;
  pollIntervalSec: number;
  leaseTtlSec: number;
  logDir: string;
  stateDir: string;
  registerFileName: string;
  vendorFileName: string;
  previousVersionsFolder: string;
  decisionFolder: string;
  shortcutFileName: string;
  /** The service key. Comes from the ARCHIVE_AGENT_KEY environment variable only. */
  apiKey: string;
}

const DEFAULTS = {
  pollIntervalSec: 60,
  leaseTtlSec: 600,
  logDir: 'logs',
  stateDir: 'state',
  registerFileName: 'سجل الموردين.xlsx',
  vendorFileName: 'بيانات المورد.xlsx',
  previousVersionsFolder: '_إصدارات سابقة',
  decisionFolder: 'سجل الاعتماد',
  shortcutFileName: 'افتح مجلد المورد.url',
};

/**
 * Loads config.json (path from --config or ./config.json) and the key from
 * the environment. Fails fast with a clear message rather than running with
 * a half-configured agent. The key is never read from the file on purpose:
 * config.json is plain text that ends up in backups and screenshots.
 */
export function loadConfig(argv: string[] = process.argv, env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const idx = argv.indexOf('--config');
  const file = resolve(idx >= 0 && argv[idx + 1] ? argv[idx + 1] : 'config.json');
  let raw: Partial<AgentConfig>;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`Cannot read ${file}: ${(err as Error).message}. Copy config.example.json to config.json and fill it in.`);
  }
  const apiKey = env.ARCHIVE_AGENT_KEY?.trim();
  if (!apiKey) throw new Error('ARCHIVE_AGENT_KEY is not set. Put the agent key in that environment variable (never in config.json).');
  for (const k of ['apiBaseUrl', 'agentId', 'archiveRoot'] as const) {
    if (!raw[k] || typeof raw[k] !== 'string') throw new Error(`config.json: "${k}" is required`);
  }
  const cfg: AgentConfig = { ...DEFAULTS, ...(raw as AgentConfig), apiKey };
  cfg.apiBaseUrl = cfg.apiBaseUrl.replace(/\/+$/, '');
  if (!/^https:\/\//.test(cfg.apiBaseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(cfg.apiBaseUrl)) {
    throw new Error('config.json: apiBaseUrl must use https:// (http is allowed for localhost only)');
  }
  const base = resolve(file, '..');
  for (const k of ['logDir', 'stateDir'] as const) if (!isAbsolute(cfg[k])) cfg[k] = resolve(base, cfg[k]);
  cfg.pollIntervalSec = Math.max(10, Number(cfg.pollIntervalSec) || DEFAULTS.pollIntervalSec);
  cfg.leaseTtlSec = Math.min(3600, Math.max(60, Number(cfg.leaseTtlSec) || DEFAULTS.leaseTtlSec));
  return cfg;
}
