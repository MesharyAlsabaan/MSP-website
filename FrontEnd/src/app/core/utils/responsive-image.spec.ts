import { responsiveSrcset } from './responsive-image';

describe('responsiveSrcset', () => {
  it('lists every web copy of an upload', () => {
    expect(responsiveSrcset('/api/uploads/tower-dusk.jpg')).toContain('/api/uploads/_w/tower-dusk.640.webp 640w');
    expect(responsiveSrcset('/api/uploads/tower-dusk.jpg')?.split(', ')).toHaveLength(4);
  });

  it('skips static assets, vector images and unexpected names', () => {
    expect(responsiveSrcset('/images/hero.jpg')).toBeNull();
    expect(responsiveSrcset('/api/uploads/logo.svg')).toBeNull();
    expect(responsiveSrcset('/api/uploads/Odd Name.jpg')).toBeNull();
    expect(responsiveSrcset(null)).toBeNull();
  });
});
