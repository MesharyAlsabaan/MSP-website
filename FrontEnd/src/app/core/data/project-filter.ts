/**
 * Two-level filtering for the works page: a design field (top row) crossed with
 * a project sector (second row). Kept free of Angular so the rules that decide
 * what a visitor sees can be unit-tested on their own.
 */

import { Project } from './projects';
import { Term } from './taxonomy';

/** A project's design fields. Empty is not "all" — it simply matches nothing. */
export const categoriesOf = (project: Project): readonly Term[] =>
  project.designCategories ?? [];

/**
 * A project's sectors. Records predating the two-level taxonomy fall back to
 * their single legacy typology, so nothing published so far drops off the page.
 */
export const sectorsOf = (project: Project): readonly Term[] =>
  project.sectors?.length ? project.sectors : project.typology ? [project.typology] : [];

const has = (terms: readonly Term[], key: string) => terms.some((t) => t.key === key);

/**
 * A project passes when it belongs to EVERY active axis — picking Interiors and
 * Hospitality together yields their intersection, not their union. A null axis
 * is not a constraint, so no selection at all shows every project exactly once.
 */
export const matches = (
  project: Project,
  categoryKey: string | null,
  sectorKey: string | null,
): boolean =>
  (categoryKey === null || has(categoriesOf(project), categoryKey)) &&
  (sectorKey === null || has(sectorsOf(project), sectorKey));

/** Projects left after applying both axes. */
export const filterProjects = (
  projects: readonly Project[],
  categoryKey: string | null,
  sectorKey: string | null,
): Project[] => projects.filter((p) => matches(p, categoryKey, sectorKey));

/**
 * How many projects each term would leave, holding the OTHER axis at its
 * current selection. Drives the dimming of chips that lead nowhere, so a
 * visitor never lands on an empty grid.
 */
export const countsFor = (
  projects: readonly Project[],
  axis: 'category' | 'sector',
  terms: readonly Term[],
  otherKey: string | null,
): ReadonlyMap<string, number> =>
  new Map(
    terms.map((term) => [
      term.key,
      projects.filter((p) =>
        axis === 'category'
          ? matches(p, term.key, otherKey)
          : matches(p, otherKey, term.key),
      ).length,
    ]),
  );
