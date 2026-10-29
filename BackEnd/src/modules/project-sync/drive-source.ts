import { createSign } from 'crypto';
import { MAX_DEPTH, skipName, SourceFile, SourceFolder, SyncSource } from './source';

/**
 * Google Drive, read through a service account with the read-only scope.
 * The account sees only what is shared with it, so the owner shares the one
 * projects folder (Viewer) and nothing else.
 *
 * Configured by:
 *   GOOGLE_SERVICE_ACCOUNT_JSON   the key file, raw JSON or base64 of it
 *   PROJECT_SYNC_DRIVE_FOLDER_ID  the projects folder ID (from its URL)
 */

const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const API = 'https://www.googleapis.com/drive/v3';
const FOLDER = 'application/vnd.google-apps.folder';
const SHEET = 'application/vnd.google-apps.spreadsheet';
export const REGISTER_NAME = '_REGISTER';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  md5Checksum?: string;
  size?: string;
  modifiedTime: string;
}

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function parseServiceAccount(raw: string): ServiceAccount {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const sa = JSON.parse(text) as ServiceAccount;
  if (!sa.client_email || !sa.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON has no client_email/private_key');
  return sa;
}

export class DriveSource implements SyncSource {
  private token?: { value: string; expires: number };

  constructor(
    private readonly account: ServiceAccount,
    private readonly rootId: string,
  ) {}

  get label(): string {
    return `Google Drive folder ${this.rootId} (as ${this.account.client_email})`;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expires > Date.now() + 60_000) return this.token.value;
    const aud = this.account.token_uri ?? 'https://oauth2.googleapis.com/token';
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
      JSON.stringify({ iss: this.account.client_email, scope: SCOPE, aud, iat: now, exp: now + 3600 }),
    )}`;
    const signature = createSign('RSA-SHA256').update(unsigned).sign(this.account.private_key);
    const res = await fetch(aud, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${unsigned}.${b64url(signature)}`,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      // The body names the problem (e.g. invalid_grant) and never echoes the key.
      throw new Error(`Google sign-in failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    }
    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 };
    return body.access_token;
  }

  /** GET with retries on rate limits and server errors (1s, 4s, 16s). */
  private async get(url: string, timeoutMs = 60_000): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${await this.accessToken()}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return res;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= 3) {
        const hint =
          res.status === 404
            ? ' — is the folder shared with the service account?'
            : res.status === 403
              ? ' — the service account lacks access, or the Drive API is not enabled for its project'
              : '';
        throw new Error(`Drive ${res.status} on ${new URL(url).pathname}${hint}`);
      }
      await sleep(1000 * 4 ** attempt);
    }
  }

  private async children(parentId: string): Promise<DriveFile[]> {
    const out: DriveFile[] = [];
    let pageToken = '';
    do {
      const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`);
      const fields = encodeURIComponent('nextPageToken, files(id, name, mimeType, md5Checksum, size, modifiedTime)');
      const res = await this.get(
        `${API}/files?q=${q}&fields=${fields}&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true${
          pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
        }`,
      );
      const body = (await res.json()) as { files: DriveFile[]; nextPageToken?: string };
      out.push(...body.files);
      pageToken = body.nextPageToken ?? '';
    } while (pageToken);
    return out;
  }

  private toFile(f: DriveFile, prefix: string): SourceFile {
    return {
      id: f.id,
      path: prefix ? `${prefix}/${f.name}` : f.name,
      mimeType: f.mimeType,
      size: Number(f.size ?? 0),
      md5: f.md5Checksum,
      modifiedTime: f.modifiedTime,
    };
  }

  async listFolders(): Promise<SourceFolder[]> {
    const top = await this.children(this.rootId);
    const folders: SourceFolder[] = [];
    for (const dir of top.filter((f) => f.mimeType === FOLDER && !skipName(f.name))) {
      folders.push({ id: dir.id, name: dir.name, files: await this.walk(dir.id, '', 0) });
    }
    return folders;
  }

  private async walk(folderId: string, prefix: string, depth: number): Promise<SourceFile[]> {
    const files: SourceFile[] = [];
    for (const entry of await this.children(folderId)) {
      if (skipName(entry.name)) continue;
      if (entry.mimeType === FOLDER) {
        if (depth < MAX_DEPTH) files.push(...(await this.walk(entry.id, prefix ? `${prefix}/${entry.name}` : entry.name, depth + 1)));
      } else {
        files.push(this.toFile(entry, prefix));
      }
    }
    return files;
  }

  async readRegister(): Promise<string | null> {
    const top = await this.children(this.rootId);
    const sheet = top.find((f) => f.name === REGISTER_NAME && f.mimeType === SHEET);
    if (sheet) {
      // Exports the first tab as CSV.
      const res = await this.get(`${API}/files/${sheet.id}/export?mimeType=text%2Fcsv`);
      return res.text();
    }
    const csv = top.find((f) => f.name.toLowerCase() === `${REGISTER_NAME.toLowerCase()}.csv`);
    if (csv) return (await this.download(this.toFile(csv, ''))).toString('utf8');
    return null;
  }

  async download(file: SourceFile): Promise<Buffer> {
    const res = await this.get(`${API}/files/${file.id}?alt=media&supportsAllDrives=true`, 180_000);
    return Buffer.from(await res.arrayBuffer());
  }
}
