import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { extname } from 'path';

/** Hard limits for vendor uploads (also enforced by multer before this runs). */
export const UPLOAD_LIMITS = {
  maxFileBytes: 15 * 1024 * 1024,
  maxRevisionBytes: 80 * 1024 * 1024,
  maxFilesPerRevision: 12,
};

const MAGIC: { ext: string[]; mime: string; test: (b: Buffer) => boolean }[] = [
  { ext: ['.pdf'], mime: 'application/pdf', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { ext: ['.png'], mime: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: ['.jpg', '.jpeg'], mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: ['.docx'],
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    test: (b) => b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
  },
  {
    ext: ['.xlsx'],
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    test: (b) => b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
  },
];

export const ALLOWED_EXTENSIONS = MAGIC.flatMap((m) => m.ext);

/**
 * Sniffs the content and requires it to agree with the extension. An `.exe`
 * renamed to `.pdf`, or a PDF uploaded as `.png`, both return null.
 */
export function detectMime(bytes: Buffer, filename: string): string | null {
  const ext = extname(filename).toLowerCase();
  const rule = MAGIC.find((m) => m.ext.includes(ext));
  if (!rule || bytes.length < 8) return null;
  return rule.test(bytes) ? rule.mime : null;
}

export interface UploadedFileLike {
  originalname: string;
  buffer: Buffer;
  size: number;
}

/**
 * Validates one uploaded file against type and size rules. `bytesSoFar` is
 * the total already accepted for this revision, so the per-revision ceiling
 * is enforced across files.
 */
export function validateUpload(file: UploadedFileLike, bytesSoFar = 0): { mime: string } {
  if (!file.size || !file.buffer?.length) {
    throw new BadRequestException(`"${file.originalname}" is empty.`);
  }
  if (file.size > UPLOAD_LIMITS.maxFileBytes) {
    throw new PayloadTooLargeException(
      `"${file.originalname}" exceeds ${UPLOAD_LIMITS.maxFileBytes / 1024 / 1024} MB.`,
    );
  }
  if (bytesSoFar + file.size > UPLOAD_LIMITS.maxRevisionBytes) {
    throw new PayloadTooLargeException(
      `Total documents exceed ${UPLOAD_LIMITS.maxRevisionBytes / 1024 / 1024} MB for one submission.`,
    );
  }
  const mime = detectMime(file.buffer, file.originalname);
  if (!mime) {
    throw new BadRequestException(
      `"${file.originalname}" is not an accepted document (allowed: ${ALLOWED_EXTENSIONS.join(', ')}) or its content does not match its extension.`,
    );
  }
  return { mime };
}
