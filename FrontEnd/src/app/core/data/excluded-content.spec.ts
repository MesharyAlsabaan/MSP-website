import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';
import { PublicContentService } from '../services/public-content.service';
import { publishedSlugs } from '../seo/prerender-slugs';

describe('Excluded placeholder content', () => {
  const posts = [{ slug: 'madinah-hotel-hospitality-rooted-in-place' }, { slug: 'designing-for-the-desert' }];

  it('never lists the placeholder article', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: { get: () => of({ data: posts }) } }],
    });
    const list = await firstValueFrom(TestBed.inject(PublicContentService).posts());
    expect(list.map((p) => p.slug)).toEqual(['madinah-hotel-hospitality-rooted-in-place']);
  });

  it('treats the placeholder article URL as not found', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: { get: () => of({ data: posts[1] }) } }],
    });
    await expect(firstValueFrom(TestBed.inject(PublicContentService).postBySlug('designing-for-the-desert'))).rejects.toThrow();
  });

  it('is never prerendered (so never in the sitemap)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: posts })));
    await expect(publishedSlugs('blog')).resolves.toEqual(['madinah-hotel-hospitality-rooted-in-place']);
    vi.restoreAllMocks();
  });
});
