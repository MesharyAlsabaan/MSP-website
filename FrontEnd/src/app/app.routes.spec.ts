import { routes } from './app.routes';

describe('Public routes', () => {
  it('registers a public team page before the wildcard route', () => {
    const publicShell = routes.find((route) => route.path === '');
    const children = publicShell?.children ?? [];
    const teamIndex = children.findIndex((route) => route.path === 'team');
    const wildcardIndex = children.findIndex((route) => route.path === '**');

    expect(teamIndex).toBeGreaterThanOrEqual(0);
    expect(teamIndex).toBeLessThan(wildcardIndex);
  });
});

