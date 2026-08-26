import { assetUrl } from './asset-url';

describe('assetUrl', () => {
  it('passes absolute and root-relative paths through', () => {
    expect(assetUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(assetUrl('/images/proj-1.jpg')).toBe('/images/proj-1.jpg');
  });

  it('makes a stored relative path root-relative', () => {
    expect(assetUrl('images/proj-1.jpg')).toBe('/images/proj-1.jpg');
  });

  it('resolves a bare filename against /images/', () => {
    expect(assetUrl('hero.jpg')).toBe('/images/hero.jpg');
  });

  it('returns nothing for a keyword that is not a file, so no broken img renders', () => {
    // The seed stored icon keywords like these in services.icon.
    expect(assetUrl('compass')).toBe('');
    expect(assetUrl('clipboard')).toBe('');
  });

  it('returns nothing for empty input', () => {
    expect(assetUrl('')).toBe('');
    expect(assetUrl(null)).toBe('');
    expect(assetUrl(undefined)).toBe('');
  });
});
