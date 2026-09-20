#!/usr/bin/env node
/**
 * Drives the vendor journey against a running local backend, step by step,
 * so the whole flow can be watched end to end:
 *
 *   node scripts/demo-journey.mjs <step> [args]
 *     submit <dir>          → vendor registers with the PDFs in <dir> (UTF-8 names, like a browser)
 *     login                 → stores the admin token in DEMO_DIR
 *     request-completion    → reviewer asks for missing items (mail → outbox)
 *     resume-token          → extracts the one-time link token from the outbox mail
 *     resubmit <file>       → vendor uploads a replacement VAT certificate (v2)
 *     approve               → reviewer approves the current revision
 *     request-update        → reviewer re-opens an APPROVED vendor for renewed documents
 *     agent-key             → creates an archive-agent key (printed once)
 *     status                → prints admin list + archive status
 *
 * Env: API (default http://localhost:3077/api), DEMO_DIR, ADMIN_EMAIL, ADMIN_PASSWORD.
 * Never points at production: refuses any API host other than localhost.
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const API = process.env.API ?? 'http://localhost:3077/api';
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('demo-journey only runs against localhost');
const DEMO_DIR = process.env.DEMO_DIR;
if (!DEMO_DIR) throw new Error('DEMO_DIR is required');
const step = process.argv[2];
const file = (n) => join(DEMO_DIR, n);
const read = (n) => readFileSync(file(n), 'utf8').trim();

async function call(method, path, { token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, { method, headers, body: json ? JSON.stringify(json) : form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(body.message ?? body)}`);
  return body;
}

function emlText(raw) {
  return raw.split(/\r?\n--[^\r\n]+\r?\n/).map((p) => {
    const [head, ...rest] = p.split(/\r?\n\r?\n/);
    const body = rest.join('\n\n');
    if (/base64/i.test(head)) return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8');
    if (/quoted-printable/i.test(head)) return body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    return body;
  }).join('\n');
}

const appId = () => JSON.parse(read('submit.json')).data.applicationId;

switch (step) {
  case 'submit': {
    const dir = process.argv[3];
    const data = JSON.parse(read('submit.data.json'));
    const form = new FormData();
    form.set('data', JSON.stringify(data));
    const files = { 'commercial-registration': 'السجل التجاري.pdf', 'vat-certificate': 'شهادة الزكاة والضريبة.pdf', 'company-profile': 'بروفايل الشركة.pdf', 'contractor-classification': 'شهادة التصنيف.pdf' };
    for (const [type, name] of Object.entries(files)) {
      form.set(`doc__${type}`, new Blob([readFileSync(join(dir, name))], { type: 'application/pdf' }), name);
    }
    const r = await call('POST', '/vendors/applications', { form });
    writeFileSync(file('submit.json'), JSON.stringify(r));
    console.log(`registered: ${r.data.vendorNumber} / ${r.data.requestNumber}`);
    break;
  }
  case 'request-update': {
    const r = await call('POST', `/admin/vendors/${appId()}/request-update`, {
      token: read('admin.token'),
      json: { missingItems: ['السجل التجاري تجدد — يرجى رفع النسخة الجديدة'], note: 'تحديث سنوي' },
    });
    console.log(`application ${r.data.id} → ${r.data.status}`);
    break;
  }
  case 'login': {
    const r = await call('POST', '/auth/login', { json: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
    writeFileSync(file('admin.token'), r.data.accessToken);
    console.log(`logged in as ${r.data.user?.email ?? process.env.ADMIN_EMAIL} (${r.data.user?.role})`);
    break;
  }
  case 'request-completion': {
    const r = await call('POST', `/admin/vendors/${appId()}/request-completion`, {
      token: read('admin.token'),
      json: { missingItems: ['شهادة الزكاة والضريبة منتهية الصلاحية', 'يرجى إرفاق نسخة ملونة من السجل التجاري'], note: 'نرجو التحديث خلال أسبوع' },
    });
    console.log(`application ${r.data.id} → ${r.data.status}`);
    break;
  }
  case 'resume-token': {
    const outbox = join(DEMO_DIR, 'outbox');
    for (const f of readdirSync(outbox).sort().reverse()) {
      const m = /\/vendors\/resume\/([A-Za-z0-9_-]+)/.exec(emlText(readFileSync(join(outbox, f), 'utf8')));
      if (m) { writeFileSync(file('resume.token'), m[1]); console.log(`token from ${f} (length ${m[1].length})`); process.exit(0); }
    }
    throw new Error('no completion mail found in outbox');
  }
  case 'resume-context': {
    const r = await call('GET', `/vendors/applications/resume/${read('resume.token')}`);
    console.log(`${r.data.requestNumber} v${r.data.revisionNo} | missing: ${r.data.missingItems.join(' / ')} | documents: ${r.data.documents.length}`);
    break;
  }
  case 'resubmit': {
    const original = JSON.parse(read('submit.data.json'));
    const data = { ...original, contactName: original.contactName + ' (محدّث)', expiries: { ...original.expiries, 'vat-certificate': '2027-12-31' } };
    const form = new FormData();
    form.set('data', JSON.stringify(data));
    const vat = process.argv[3];
    form.set('doc__vat-certificate', new Blob([readFileSync(vat)], { type: 'application/pdf' }), 'شهادة الزكاة والضريبة 2027.pdf');
    const r = await call('POST', `/vendors/applications/resume/${read('resume.token')}`, { form });
    console.log(`resubmitted: ${r.data.requestNumber} → v${r.data.revisionNo}`);
    const again = await fetch(`${API}/vendors/applications/resume/${read('resume.token')}`);
    console.log(`link reused → HTTP ${again.status} (expected 410)`);
    break;
  }
  case 'approve': {
    const r = await call('POST', `/admin/vendors/${appId()}/approve`, { token: read('admin.token'), json: { note: 'مستوفٍ لجميع المتطلبات' } });
    console.log(`application ${r.data.id} → ${r.data.status}`);
    break;
  }
  case 'agent-key': {
    const r = await call('POST', '/admin/vendors/config/archive-keys', { token: read('admin.token'), json: { name: 'demo-office-agent' } });
    writeFileSync(file('agent.key'), r.data.key);
    console.log(`agent key created: ${r.data.name} (id ${r.data.id}) — stored in DEMO_DIR/agent.key`);
    break;
  }
  case 'status': {
    const list = await call('GET', '/admin/vendors', { token: read('admin.token') });
    for (const a of list.data) console.log(`${a.vendorNumber} ${a.requestNumber} v${a.currentRevisionNo} | ${a.companyName} | qualification=${a.status} | archive=${a.archiveStatus ?? '-'}`);
    const st = await call('GET', '/admin/vendors/archive/status', { token: read('admin.token') });
    console.log(`pending jobs: ${st.data.pending.length} | failed: ${st.data.failed.length}`);
    for (const k of st.data.agents) console.log(`agent "${k.name}" active=${k.active} lastSeen=${k.lastSeenAt ?? '-'} heartbeat=${JSON.stringify(k.lastHeartbeat ?? {}).slice(0, 160)}`);
    break;
  }
  default:
    throw new Error(`unknown step "${step}"`);
}
