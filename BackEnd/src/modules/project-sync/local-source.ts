import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { IMAGE_FILE, MAX_DEPTH, skipName, SourceFile, SourceFolder, SyncSource } from './source';

/**
 * The same layout read from a local folder (e.g. the Google Drive for
 * desktop copy). Used for dry runs and tests; the register is `_register.csv`.
 * File IDs are relative paths, so they are stable only while names are.
 */
export class LocalSource implements SyncSource {
  constructor(private readonly root: string) {}

  get label(): string {
    return `local folder ${this.root}`;
  }

  private file(dir: string, rel: string): SourceFile {
    const abs = join(dir, rel);
    const st = statSync(abs);
    return {
      id: `${dir.slice(this.root.length + 1)}/${rel}`,
      path: rel,
      mimeType: '',
      size: st.size,
      // Only images are ever read, so only they are hashed.
      md5: IMAGE_FILE.test(rel) ? createHash('md5').update(readFileSync(abs)).digest('hex') : undefined,
      modifiedTime: st.mtime.toISOString(),
    };
  }

  async listFolders(): Promise<SourceFolder[]> {
    const folders: SourceFolder[] = [];
    for (const name of readdirSync(this.root).sort()) {
      const dir = join(this.root, name);
      if (skipName(name) || !statSync(dir).isDirectory()) continue;
      folders.push({ id: name, name, files: this.walk(dir, '', 0) });
    }
    return folders;
  }

  private walk(dir: string, prefix: string, depth: number): SourceFile[] {
    const files: SourceFile[] = [];
    for (const entry of readdirSync(join(dir, prefix)).sort()) {
      if (skipName(entry)) continue;
      const rel = prefix ? `${prefix}/${entry}` : entry;
      if (statSync(join(dir, rel)).isDirectory()) {
        if (depth < MAX_DEPTH) files.push(...this.walk(dir, rel, depth + 1));
      } else {
        files.push(this.file(dir, rel));
      }
    }
    return files;
  }

  async readRegister(): Promise<string | null> {
    const path = join(this.root, '_register.csv');
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  }

  async download(file: SourceFile): Promise<Buffer> {
    return readFileSync(join(this.root, file.id));
  }
}
