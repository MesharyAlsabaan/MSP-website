/**
 * Environment for the integration tests, set before any module reads it
 * (configuration.ts and site.ts read env at import time).
 */
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, relative } from 'path';

export const SITE_PORT = 47811;
export const SMTP_PORT = 47812;
export const TEST_DB = `msp_sync_it_${process.pid}_${Date.now().toString(36)}`;

Object.assign(process.env, {
  NODE_ENV: 'test',
  DB_HOST: process.env.TEST_DB_HOST ?? 'localhost',
  DB_PORT: process.env.TEST_DB_PORT ?? '5432',
  DB_USERNAME: process.env.TEST_DB_USERNAME ?? 'msp',
  DB_PASSWORD: process.env.TEST_DB_PASSWORD ?? 'msp_password',
  DB_NAME: TEST_DB,
  // Mirrors production's current default; the migration must make it a no-op.
  DB_SYNCHRONIZE: 'true',
  // Relative to cwd, the way main.ts resolves it.
  UPLOAD_DIR: relative(process.cwd(), mkdtempSync(join(tmpdir(), 'msp-uploads-'))),
  PROJECT_SYNC_PREVIEW_DIR: mkdtempSync(join(tmpdir(), 'msp-previews-')),
  PROJECT_SYNC_SCHEDULE: 'off',
  PROJECT_SYNC_SITE_ORIGIN: `http://127.0.0.1:${SITE_PORT}`,
  PROJECT_SYNC_CANONICAL_ORIGIN: 'https://www.msp.sa',
  PROJECT_SYNC_REBUILD_WEBHOOK: `http://127.0.0.1:${SITE_PORT}/__rebuild`,
  PROJECT_SYNC_REBUILD_WEBHOOK_SECRET: 'test-secret',
  PROJECT_SYNC_VERIFY_MINUTES: '1',
  PROJECT_SYNC_VERIFY_POLL_MS: '300',
  PROJECT_SYNC_MIN_IMAGES: '3',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: String(SMTP_PORT),
  SMTP_SECURE: 'false',
  MAIL_FROM: 'MSP Website <noreply@msp.sa>',
  PROJECT_SYNC_NOTIFY_TO: 'owner@example.test',
  ANTHROPIC_API_KEY: '',
});
