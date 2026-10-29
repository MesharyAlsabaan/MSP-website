/**
 * Where projects come from. The production source is a Google Drive folder
 * (`DriveSource`); a local folder (`LocalSource`) has the same shape so a dry
 * run can be rehearsed against a synced copy without any credentials.
 *
 * Layout the sync expects under the root folder:
 *
 *   01_PROJECTS/
 *  *     16_rihana-plaza-commercial-building/
 *       front-elevation.png
 *       INT/lobby.jpg      ← sub-folders are read too, up to MAX_DEPTH levels;
 *                            their names ("2-First Floor/05- Bedroom 4") help the draft
 *
 * Everything in the folder is approved for publication by the owner: the
 * folder is the approval. A folder is identified by its Drive ID, never its name, so renaming a
 * folder does not create a second project.
 */

export interface SourceFile {
  /** Stable ID (Drive file ID, or the relative path for a local source). */
  id: string;
  /** Path inside the project folder, e.g. `INT/lobby.jpg`. */
  path: string;
  mimeType: string;
  size: number;
  /** Content checksum when the source provides one (Drive md5Checksum). */
  md5?: string;
  modifiedTime: string;
}

export interface SourceFolder {
  id: string;
  name: string;
  files: SourceFile[];
}

export interface SyncSource {
  /** Short description for logs and reports, never containing credentials. */
  readonly label: string;
  /** Project folders directly under the root (names starting `_` or `.` are skipped). */
  listFolders(): Promise<SourceFolder[]>;
  download(file: SourceFile): Promise<Buffer>;
}

/** `16_rihana-plaza-commercial-building` → { no: '16', slug: 'rihana-plaza-commercial-building' } */
export function parseFolderName(name: string): { no: string; slug: string } | null {
  const m = /^(\d{1,3})[_\s-]+([a-z0-9]+(?:-[a-z0-9]+)*)$/i.exec(name.trim());
  if (!m) return null;
  return { no: m[1].padStart(2, '0'), slug: m[2].toLowerCase() };
}

export const IMAGE_FILE = /\.(jpe?g|png|webp)$/i;

/** How deep sub-folders are read under a project folder. */
export const MAX_DEPTH = 5;

/** Folder and file names that are never content: system files and hidden/underscored items. */
export const skipName = (name: string) => /^[_.]/.test(name) || /^(thumbs\.db|desktop\.ini)$/i.test(name);
