#!/usr/bin/env node
/**
 * Preview helper: prints the last e-mails written to the local test outbox
 * (subject + any portal links), so verification / reset links can be opened
 * without a mail client. Usage: node scripts/preview-mail.mjs <outbox-dir> [count]
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
const dir = process.argv[2];
const count = Number(process.argv[3] ?? 5);
if (!dir) { console.error('usage: node scripts/preview-mail.mjs <outbox-dir> [count]'); process.exit(1); }
const decode = (raw) => raw.split(/\r?\n--[^\r\n]+\r?\n/).map((p) => {
  const [h, ...r] = p.split(/\r?\n\r?\n/); const b = r.join('\n\n');
  return /base64/i.test(h) ? Buffer.from(b.replace(/\s+/g, ''), 'base64').toString('utf8') : b;
}).join('\n');
for (const f of readdirSync(dir).sort().slice(-count)) {
  const raw = readFileSync(join(dir, f), 'utf8');
  const to = /^To: (.*)$/m.exec(raw)?.[1] ?? '';
  const subject = f.replace(/^\d+-/, '').replace(/\.eml$/, '').replace(/_/g, ' ');
  const links = [...new Set(decode(raw).match(/https?:\/\/[^\s"<>]+/g) ?? [])];
  console.log(`\n📧 ${subject}\n   إلى: ${to}`);
  for (const l of links) console.log(`   🔗 ${l}`);
}
