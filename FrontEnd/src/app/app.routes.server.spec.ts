import { PrerenderFallback, RenderMode } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';

describe('Server routes', () => {
  it.each(['projects/:slug', 'ar/projects/:slug', 'blog/:slug', 'ar/blog/:slug'])(
    'prerenders %s from the API, falling back to the client shell for newer slugs',
    (path) => {
      const index = serverRoutes.findIndex((route) => route.path === path);
      const wildcardIndex = serverRoutes.findIndex((route) => route.path === '**');
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(wildcardIndex);
      const route = serverRoutes[index] as {
        renderMode: RenderMode;
        fallback?: PrerenderFallback;
        getPrerenderParams?: unknown;
      };
      expect(route.renderMode).toBe(RenderMode.Prerender);
      expect(route.fallback).toBe(PrerenderFallback.Client);
      expect(typeof route.getPrerenderParams).toBe('function');
    },
  );

  it('keeps the vendor portal and admin client-rendered', () => {
    for (const path of ['vendors', 'vendors/**', 'admin/**', 'auth/**']) {
      expect(serverRoutes.find((route) => route.path === path)?.renderMode).toBe(RenderMode.Client);
    }
  });
});
