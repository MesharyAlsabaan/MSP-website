import { Readable } from 'stream';

/**
 * Where vendor document bytes live. Everything else in the vendors module
 * talks to this interface only, so the backing store can change (local disk
 * now; a Railway volume, S3-compatible bucket or database blobs later) without
 * touching application logic. Keys are content-addressed (see storageKeyFor)
 * and never derived from user input.
 */
export interface DocumentStorage {
  put(key: string, data: Buffer | AsyncIterable<Buffer | Uint8Array>): Promise<void>;
  get(key: string): Readable;
  stat(key: string): Promise<{ sizeBytes: number }>;
  exists(key: string): Promise<boolean>;
}

/** Nest injection token for the configured DocumentStorage implementation. */
export const DOCUMENT_STORAGE = Symbol('DOCUMENT_STORAGE');

/** `ab/cd/abcd…` — fans files out so no directory ever holds millions of entries. */
export function storageKeyFor(sha256: string): string {
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error('storageKeyFor expects a hex sha256');
  return `${sha256.slice(0, 2)}/${sha256.slice(2, 4)}/${sha256}`;
}
