/**
 * Import this FIRST in an e2e spec. It points the app at a throw-away schema
 * and temp folders before data-source.ts (which reads env at import) loads.
 */
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const E2E_SCHEMA = `e2e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
export const E2E_TMP = mkdtempSync(join(tmpdir(), 'msp-e2e-'));

process.env.DB_SCHEMA = E2E_SCHEMA;
process.env.DB_SYNCHRONIZE = 'false';
process.env.VENDOR_DOCS_DIR = join(E2E_TMP, 'docs');
process.env.MAIL_OUTBOX_DIR = join(E2E_TMP, 'outbox');
process.env.VENDOR_REVIEW_INBOX = 'team@example.test';
process.env.PUBLIC_URL = 'http://localhost:4200';
delete process.env.SMTP_HOST;
