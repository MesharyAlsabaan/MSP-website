import { publishedSlugs } from './prerender-slugs';

describe('publishedSlugs', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the slugs the API lists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [{ slug: 'madinah-hotel' }, { slug: '' }, { slug: 'SBC' }] })),
    );
    await expect(publishedSlugs('projects')).resolves.toEqual(['madinah-hotel', 'SBC']);
  });

  it('never fails the build when the API is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(publishedSlugs('blog')).resolves.toEqual([]);
  });

  it('ignores error responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 503 }));
    await expect(publishedSlugs('projects')).resolves.toEqual([]);
  });
});
