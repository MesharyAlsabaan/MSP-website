/**
 * Backfill: create the responsive web copies for every image already in the
 * uploads folder (new uploads get them automatically).
 *
 *   npm run images:variants -- --dry-run   # report only, writes nothing
 *   npm run images:variants                 # create the missing copies
 *   npm run images:variants:prod            # same, from the compiled build
 *
 * Idempotent: existing copies are skipped, originals are never modified, and a
 * failing file is reported and skipped without stopping the run.
 */
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { generateVariants, isRaster } from '../modules/uploads/image-variants';

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const uploadDir = join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
  const files = readdirSync(uploadDir).filter((f) => isRaster(f) && statSync(join(uploadDir, f)).isFile());

  let created = 0;
  let existing = 0;
  let failed = 0;
  let originalBytes = 0;
  let copyBytes = 0;

  for (const file of files) {
    originalBytes += statSync(join(uploadDir, file)).size;
    try {
      const r = await generateVariants(uploadDir, file, { dryRun });
      created += r.created.length;
      existing += r.existing.length;
      copyBytes += r.created.reduce((sum, c) => sum + c.bytes, 0);
      const widths = r.created.map((c) => c.width).join(', ') || '—';
      console.log(`${dryRun ? 'would create' : 'created'} [${widths}]  ${file}`);
    } catch (err) {
      failed += 1;
      console.error(`FAILED  ${file}: ${(err as Error).message}`);
    }
  }

  console.log('');
  console.log(`${files.length} images (${kb(originalBytes)} of originals) in ${uploadDir}`);
  console.log(`${dryRun ? 'Would create' : 'Created'} ${created} copies${dryRun ? '' : ` (${kb(copyBytes)})`}; ${existing} already existed; ${failed} failed.`);
  if (failed) process.exitCode = 1;
}

void main();
