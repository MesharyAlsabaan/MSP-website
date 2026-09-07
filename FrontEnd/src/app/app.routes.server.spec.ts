import { RenderMode } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';

describe('Server routes', () => {
  it('client-renders dynamic article slugs instead of trying to prerender unknown slugs', () => {
    const articleIndex = serverRoutes.findIndex((route) => route.path === 'blog/:slug');
    const wildcardIndex = serverRoutes.findIndex((route) => route.path === '**');

    expect(articleIndex).toBeGreaterThanOrEqual(0);
    expect(articleIndex).toBeLessThan(wildcardIndex);
    expect(serverRoutes[articleIndex].renderMode).toBe(RenderMode.Client);
  });
});
