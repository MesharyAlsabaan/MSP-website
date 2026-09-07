import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Project detail loads from the API by slug — slugs aren't known at build
    // time, so render on the client (it fetches in the browser).
    path: 'projects/:slug',
    renderMode: RenderMode.Client,
  },
  {
    // Insight detail follows the same API-backed slug pattern as projects.
    path: 'blog/:slug',
    renderMode: RenderMode.Client,
  },
  {
    // Admin CMS + auth: dynamic, auth-gated — client-rendered, never prerendered.
    path: 'admin',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'auth/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
