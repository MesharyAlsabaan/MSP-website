import { TestBed } from '@angular/core/testing';
import { Title, Meta } from '@angular/platform-browser';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let seo: SeoService;
  let title: Title;
  let meta: Meta;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    seo = TestBed.inject(SeoService);
    title = TestBed.inject(Title);
    meta = TestBed.inject(Meta);
  });

  it('suffixes the page title with the site name', () => {
    seo.update({ title: 'About' });
    expect(title.getTitle()).toBe('About — MSP — Architecture + Engineering');
  });

  it('uses the site name alone when no title is given', () => {
    seo.update({});
    expect(title.getTitle()).toBe('MSP — Architecture + Engineering');
  });

  it('sets the description and og:description tags', () => {
    seo.update({ description: 'Premium design agency' });
    expect(meta.getTag('name="description"')?.content).toBe('Premium design agency');
    expect(meta.getTag('property="og:description"')?.content).toBe(
      'Premium design agency',
    );
  });
});
