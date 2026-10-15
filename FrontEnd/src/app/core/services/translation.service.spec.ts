import { isArabicUrl, localizeUrl, stripLangPrefix } from './translation.service';

describe('language URLs', () => {
  it('recognises the Arabic edition only by its own segment', () => {
    expect(isArabicUrl('/ar')).toBe(true);
    expect(isArabicUrl('/ar/about')).toBe(true);
    expect(isArabicUrl('/ar?x=1')).toBe(true);
    expect(isArabicUrl('/archive')).toBe(false);
    expect(isArabicUrl('/about')).toBe(false);
  });

  it('strips the prefix back to the English path', () => {
    expect(stripLangPrefix('/ar')).toBe('/');
    expect(stripLangPrefix('/ar/projects/x')).toBe('/projects/x');
    expect(stripLangPrefix('/about')).toBe('/about');
  });

  it('localizes paths in both directions', () => {
    expect(localizeUrl('/', 'ar')).toBe('/ar');
    expect(localizeUrl('/contact', 'ar')).toBe('/ar/contact');
    expect(localizeUrl('/ar/contact', 'ar')).toBe('/ar/contact');
    expect(localizeUrl('/ar/contact', 'en')).toBe('/contact');
    expect(localizeUrl('/ar', 'en')).toBe('/');
    expect(localizeUrl('/?q=1', 'ar')).toBe('/ar?q=1');
    expect(localizeUrl('/projects?sector=x', 'ar')).toBe('/ar/projects?sector=x');
  });
});
