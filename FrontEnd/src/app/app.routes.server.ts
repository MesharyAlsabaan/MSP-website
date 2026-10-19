import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { publishedSectorSlugs, publishedSlugs } from './core/seo/prerender-slugs';
import { APPROVED_SERVICE_SLUGS } from './core/data/service-pages';

function slugRoute(path: string, resource: 'projects' | 'blog'): ServerRoute {
  return {
    path,
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    getPrerenderParams: async () => (await publishedSlugs(resource)).map((slug) => ({ slug })),
  };
}

export const serverRoutes: ServerRoute[] = [
  // Project and insight pages are prerendered for every slug the API lists at
  // build time, so crawlers get real titles, text and images. Anything
  // published after the build falls back to the client shell (nginx serves
  // index.csr.html for unknown slugs) until the next deploy.
  // Sector pages: only sectors with enough projects are generated; nginx
  // answers any other /projects/sector/<x> with a real 404.
  ...['projects/sector/:sector', 'ar/projects/sector/:sector'].map(
    (path): ServerRoute => ({
      path,
      renderMode: RenderMode.Prerender,
      fallback: PrerenderFallback.None,
      getPrerenderParams: async () => (await publishedSectorSlugs()).map((sector) => ({ sector })),
    }),
  ),
  slugRoute('projects/:slug', 'projects'),
  slugRoute('ar/projects/:slug', 'projects'),
  slugRoute('blog/:slug', 'blog'),
  slugRoute('ar/blog/:slug', 'blog'),
  // Service pages: only the ones management has approved are generated; any
  // other /services/<slug> has no file, so nginx answers with a real 404.
  ...['services/:slug', 'ar/services/:slug'].map(
    (path): ServerRoute => ({
      path,
      renderMode: RenderMode.Prerender,
      fallback: PrerenderFallback.None,
      getPrerenderParams: async () => APPROVED_SERVICE_SLUGS.map((slug) => ({ slug })),
    }),
  ),
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
