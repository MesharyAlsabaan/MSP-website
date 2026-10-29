import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { AdminLayout } from './layouts/admin-layout/admin-layout';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role } from './core/enums/role.enum';
import { langGuard } from './core/services/translation.service';

/** Public site pages, mounted once per language edition (English at `/`, Arabic at `/ar`). */
const publicPages: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/about/about-page').then((m) => m.AboutPage),
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./pages/services/services-page').then((m) => m.ServicesPage),
  },
  {
    // Dedicated service pages; only those approved in core/data/service-pages
    // render (others show not-found and are never prerendered).
    path: 'services/:slug',
    loadComponent: () =>
      import('./pages/services/service-detail').then((m) => m.ServiceDetail),
  },
  {
    path: 'projects',
    loadComponent: () =>
      import('./pages/projects/projects').then((m) => m.Projects),
  },
  {
    path: 'projects/sbc-commercial-office',
    pathMatch: 'full',
    redirectTo: 'projects/SBC',
  },
  {
    // Sector collections (residential, hospitality, …); before :slug so
    // "sector" is never read as a project slug.
    path: 'projects/sector/:sector',
    loadComponent: () =>
      import('./pages/projects/sector-page').then((m) => m.SectorPage),
  },
  {
    path: 'projects/:slug',
    loadComponent: () =>
      import('./pages/projects/project-detail').then((m) => m.ProjectDetail),
  },
  {
    path: 'blog',
    loadComponent: () => import('./pages/blog/blog-page').then((m) => m.BlogPage),
  },
  {
    path: 'blog/:slug',
    loadComponent: () => import('./pages/blog/blog-detail').then((m) => m.BlogDetail),
  },
  {
    path: 'team',
    loadComponent: () => import('./pages/team/team-page').then((m) => m.TeamPage),
  },
  {
    path: 'careers',
    loadComponent: () =>
      import('./pages/careers/careers-page').then((m) => m.CareersPage),
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/faq/faq-page').then((m) => m.FaqPage),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/contact/contact-page').then((m) => m.ContactPage),
  },
  {
    path: 'privacy',
    data: { doc: 'privacy' },
    loadComponent: () => import('./pages/legal/legal-page').then((m) => m.LegalPage),
  },
  {
    path: 'terms',
    data: { doc: 'terms' },
    loadComponent: () => import('./pages/legal/legal-page').then((m) => m.LegalPage),
  },
  {
    // Real 404 target: prerendered so the web server can serve it with a 404 status.
    path: '404',
    loadComponent: () =>
      import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () => import('./pages/auth/login/login').then((m) => m.Login),
      },
    ],
  },
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/admin/dashboard/dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./pages/admin/projects/projects-admin').then((m) => m.AdminProjects),
      },
      {
        path: 'messages',
        canActivate: [roleGuard(Role.SuperAdmin, Role.ContentManager)],
        loadComponent: () =>
          import('./pages/admin/messages/messages').then((m) => m.AdminMessages),
      },
      {
        path: 'project-sync',
        canActivate: [roleGuard(Role.SuperAdmin, Role.ContentManager)],
        loadComponent: () =>
          import('./pages/admin/project-sync/project-sync-admin').then((m) => m.AdminProjectSync),
      },
      {
        path: 'project-sync/:id',
        canActivate: [roleGuard(Role.SuperAdmin, Role.ContentManager)],
        loadComponent: () =>
          import('./pages/admin/project-sync/project-sync-item').then((m) => m.AdminProjectSyncItem),
      },
      {
        path: 'settings',
        canActivate: [roleGuard(Role.SuperAdmin, Role.ContentManager)],
        loadComponent: () =>
          import('./pages/admin/settings/settings').then((m) => m.AdminSettings),
      },
      {
        path: 'users',
        canActivate: [roleGuard(Role.SuperAdmin)],
        loadComponent: () =>
          import('./pages/admin/users/users-admin').then((m) => m.AdminUsers),
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./pages/admin/services/services-admin').then((m) => m.AdminServices),
      },
      {
        path: 'team',
        loadComponent: () =>
          import('./pages/admin/team/team-admin').then((m) => m.AdminTeam),
      },
      {
        path: 'testimonials',
        loadComponent: () =>
          import('./pages/admin/testimonials/testimonials-admin').then((m) => m.AdminTestimonials),
      },
      {
        path: 'partners',
        loadComponent: () =>
          import('./pages/admin/partners/partners-admin').then((m) => m.AdminPartners),
      },
      {
        path: 'blog',
        loadComponent: () =>
          import('./pages/admin/blog/blog-admin').then((m) => m.AdminBlog),
      },
    ],
  },
  {
    path: 'ar',
    component: MainLayout,
    canActivate: [langGuard('ar')],
    children: publicPages,
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [langGuard('en')],
    children: publicPages,
  },
];
