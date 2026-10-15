import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import {
  VARIANT_DIR,
  generateVariants,
  resetScheduledVariants,
  scheduleVariants,
  variantFallback,
  variantName,
} from './image-variants';

async function image(dir: string, name: string, width: number, height: number) {
  await sharp({ create: { width, height, channels: 3, background: { r: 180, g: 92, b: 56 } } })
    .webp()
    .toFile(join(dir, name));
}

describe('image variants', () => {
  let dir: string;
  beforeEach(() => (dir = mkdtempSync(join(tmpdir(), 'msp-variants-'))));
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('names copies after the original', () => {
    expect(variantName('tower-dusk.jpg', 1024)).toBe('tower-dusk.1024.webp');
  });

  it('creates only the widths that are meaningfully smaller, leaving the original untouched', async () => {
    await image(dir, 'render.webp', 2400, 1340);
    const r = await generateVariants(dir, 'render.webp');
    expect(r.created.map((c) => c.width)).toEqual([640, 1024, 1600]);
    expect(r.skipped).toEqual([2400]);
    expect(readdirSync(join(dir, VARIANT_DIR)).sort()).toEqual([
      'render.1024.webp',
      'render.1600.webp',
      'render.640.webp',
    ]);
    const meta = await sharp(join(dir, VARIANT_DIR, 'render.1024.webp')).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 572]);
    expect((await sharp(join(dir, 'render.webp')).metadata()).width).toBe(2400);
  });

  it('never upscales a small image', async () => {
    await image(dir, 'small.webp', 600, 400);
    const r = await generateVariants(dir, 'small.webp');
    expect(r.created).toEqual([]);
    expect(r.skipped).toEqual([640, 1024, 1600, 2400]);
  });

  it('is idempotent and supports a dry run', async () => {
    await image(dir, 'a.webp', 1800, 1200);
    const dry = await generateVariants(dir, 'a.webp', { dryRun: true });
    expect(dry.created.map((c) => c.width)).toEqual([640, 1024, 1600]);
    expect(existsSync(join(dir, VARIANT_DIR))).toBe(false);
    await generateVariants(dir, 'a.webp');
    const again = await generateVariants(dir, 'a.webp');
    expect(again.created).toEqual([]);
    expect(again.existing).toEqual([640, 1024, 1600]);
  });

  it('ignores non-raster uploads', async () => {
    writeFileSync(join(dir, 'icon.svg'), '<svg/>');
    expect((await generateVariants(dir, 'icon.svg')).created).toEqual([]);
  });

  it('serves the copy, else falls back to the original, and rejects odd names', async () => {
    await image(dir, 'b.webp', 1800, 1200);
    await generateVariants(dir, 'b.webp');
    expect(variantFallback(dir, 'b.1024.webp')).toEqual({ path: join(dir, VARIANT_DIR, 'b.1024.webp'), isCopy: true });
    expect(variantFallback(dir, 'b.2400.webp')).toEqual({ path: join(dir, 'b.webp'), isCopy: false });
    expect(variantFallback(dir, 'b.999.webp')).toBeNull();
    expect(variantFallback(dir, '..%2Fsecret.1024.webp')).toBeNull();
    expect(variantFallback(dir, 'missing.1024.webp')).toBeNull();
  });

  describe('self-healing copies', () => {
    beforeEach(() => resetScheduledVariants());

    it('creates the missing copies in the background after a fallback', async () => {
      await image(dir, 'c.webp', 2000, 1000);
      expect(variantFallback(dir, 'c.640.webp')?.isCopy).toBe(false);
      await scheduleVariants(dir, 'c.webp');
      expect(variantFallback(dir, 'c.640.webp')).toEqual({ path: join(dir, VARIANT_DIR, 'c.640.webp'), isCopy: true });
      expect(existsSync(join(dir, VARIANT_DIR, 'c.1600.webp'))).toBe(true);
    });

    it('processes each original only once, however often it is requested', async () => {
      await image(dir, 'd.webp', 2000, 1000);
      const errors: unknown[] = [];
      await Promise.all([1, 2, 3].map(() => scheduleVariants(dir, 'd.webp', (e) => errors.push(e))));
      rmSync(join(dir, VARIANT_DIR), { recursive: true, force: true });
      await scheduleVariants(dir, 'd.webp');
      expect(existsSync(join(dir, VARIANT_DIR, 'd.640.webp'))).toBe(false);
      expect(errors).toEqual([]);
    });

    it('never throws on a broken file; it reports and carries on', async () => {
      writeFileSync(join(dir, 'broken.jpg'), 'not an image');
      await image(dir, 'e.webp', 2000, 1000);
      const errors: unknown[] = [];
      await expect(scheduleVariants(dir, 'broken.jpg', (e) => errors.push(e))).resolves.toBeUndefined();
      await scheduleVariants(dir, 'e.webp');
      expect(errors).toHaveLength(1);
      expect(existsSync(join(dir, VARIANT_DIR, 'e.640.webp'))).toBe(true);
    });
  });
});
