import { join } from 'path';
import { writeAtomic } from './files';

/**
 * A Windows Internet Shortcut (.url) that opens a folder in Explorer. Used in
 * each secondary-category folder so the vendor is findable there without
 * duplicating a single document. Works for local and UNC paths.
 */
export function folderShortcutContent(absoluteFolder: string): string {
  const forward = absoluteFolder.replace(/\\/g, '/');
  const url = absoluteFolder.startsWith('\\\\') ? `file:${forward}` : `file:///${forward}`;
  return `[InternetShortcut]\r\nURL=${url}\r\nIconIndex=3\r\nIconFile=%SystemRoot%\\system32\\SHELL32.dll\r\n`;
}

export async function writeFolderShortcut(inFolder: string, fileName: string, targetFolder: string): Promise<string> {
  const path = join(inFolder, fileName);
  await writeAtomic(path, folderShortcutContent(targetFolder));
  return path;
}
