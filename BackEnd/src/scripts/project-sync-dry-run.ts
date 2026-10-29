/**
 * Shows what the project sync would do, without a database and without
 * writing anything: reads a local copy of the projects folder (e.g. Google
 * Drive for desktop) and compares it with the projects live on the site.
 *
 *   npm run project-sync:dry-run -- "<path to 01_PROJECTS>" [--images]
 *
 * --images also downloads and checks every image (slower).
 */
import { deriveFromFolder, emptyDraft, suggest } from '../modules/project-sync/draft';
import { prepareImage } from '../modules/project-sync/images';
import { LocalSource } from '../modules/project-sync/local-source';
import { plan, SiteProject } from '../modules/project-sync/planner';
import { SITE_ORIGIN } from '../modules/project-sync/site';

async function main() {
  const dir = process.argv[2];
  const checkImages = process.argv.includes('--images');
  if (!dir) throw new Error('Usage: project-sync-dry-run <projects folder> [--images]');

  const source = new LocalSource(dir);
  const folders = await source.listFolders();
  const res = await fetch(`${SITE_ORIGIN}/api/projects?pageSize=100`);
  const body = (await res.json()) as { data: { id: string; slug: string; no: string; updatedAt: string }[] };
  const projects: SiteProject[] = body.data.map((p) => ({ id: p.id, slug: p.slug, no: p.no, updatedAt: new Date(p.updatedAt) }));

  const p = plan({ folders, items: [], projects });

  console.log(`Source: ${source.label}`);
  console.log(`Site: ${projects.length} published project(s)\n`);
  const tally: Record<string, number> = {};
  for (const fp of p.folders) {
    const a = fp.action;
    tally[a.kind] = (tally[a.kind] ?? 0) + 1;
    let detail = a.kind === 'link' ? `→ existing "${a.project.slug}" (by ${a.how})` : a.kind === 'review' ? `— ${a.reasons.join('; ')}` : '';
    if (a.kind === 'prepare') {
      // What would be published from the folder name (before the AI's text).
      const d = emptyDraft();
      suggest(d, deriveFromFolder(fp.folder.name, fp.folder.files.map((f) => f.path)));
      const f = d.facts;
      detail = `→ "${f.titleEn.value}" | ${f.locationEn.value || 'location ?'} | ${f.sectors.value.join('+') || 'sector ?'} | ${f.designCategories.value.join('+')}`;
    }
    console.log(`${a.kind.toUpperCase().padEnd(9)} ${fp.folder.name.padEnd(56)} ${String(fp.images.length).padStart(3)} img ${detail}`);
    if (checkImages) {
      for (const file of fp.images) {
        const r = await prepareImage(file, await source.download(file));
        if ('problem' in r) console.log(`          ✗ ${r.file}: ${r.problem}`);
      }
    }
  }
  console.log(`\n${Object.entries(tally).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
