import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { Project } from '../../modules/projects/entities/project.entity';
import { DESIGN_CATEGORIES, DISCIPLINES, SECTORS } from '../../modules/projects/taxonomy';

/**
 * One-off classification of the published portfolio onto the two filter axes,
 * as confirmed by the office project by project.
 *
 * It UPDATES existing rows matched on slug and never inserts: a project that
 * belongs to two sectors stays a single record carrying both, rather than
 * being duplicated so it can appear twice. Only the fields listed below are
 * written — titles, summaries, covers and galleries are left untouched — and
 * an axis the office has not confirmed yet is omitted rather than guessed, so
 * re-running this is safe and adds nothing of its own.
 *
 *   npm run classify:projects
 */

const { architecture, interiors, planning } = DESIGN_CATEGORIES;
const { hospitality, residential, work } = SECTORS;

type Classification = Pick<Project, 'designCategories' | 'sectors' | 'disciplines'>;

const CONFIRMED: Record<string, Partial<Classification>> = {
  // 05 — commercial and residential at once: one record, both chips.
  'al-ateeq-real-estate-commercial-residential': { sectors: [work, residential] },

  // 06 — residential only. The stored `mixed-use` predates the taxonomy and
  // contradicts the project's own approved name, so it is not carried over.
  'commercial-residential-compound': { sectors: [residential] },

  'madinah-hotel': { sectors: [hospitality] },
  SBC: { sectors: [work] },

  'private-residential-villa-01': { sectors: [residential] },
  'private-residential-villa-02': { sectors: [residential] },
  'private-residential-villa-03': { sectors: [residential] },

  // 12 — the only project whose design fields and scope are confirmed.
  'al-munsiyah-residential-compound-diyari-real-estate': {
    designCategories: [architecture, interiors, planning],
    sectors: [residential],
    disciplines: [DISCIPLINES.architectural, DISCIPLINES.engineering, DISCIPLINES.interior],
  },

  'residential-villas-compound-riyadh': { sectors: [residential] },
  'private-residence-riyadh': { sectors: [residential] },
};

async function run(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  const repo = ds.getRepository(Project);

  let updated = 0;
  const missing: string[] = [];

  for (const [slug, classification] of Object.entries(CONFIRMED)) {
    const project = await repo.findOne({ where: { slug } });
    if (!project) {
      missing.push(slug);
      continue;
    }
    Object.assign(project, classification);
    await repo.save(project);
    updated += 1;
    const sectors = (classification.sectors ?? []).map((s) => s.en).join(' + ') || '—';
    console.log(`  ✓ ${slug} → ${sectors}`);
  }

  console.log(`\nClassified ${updated} of ${Object.keys(CONFIRMED).length} projects.`);
  if (missing.length) {
    // A renamed or removed slug: report it rather than creating a new row.
    console.warn(`Not found, left alone: ${missing.join(', ')}`);
  }

  await ds.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
