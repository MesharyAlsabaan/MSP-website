/** Standalone: `npm run seed:vendors` — upserts the provisional vendor categories. */
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { seedVendorCategories } from './vendor-categories.seed';

async function run(): Promise<void> {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  await ds.runMigrations();
  await seedVendorCategories(ds);
  // eslint-disable-next-line no-console
  console.log('Vendor categories and document requirements seeded.');
  await ds.destroy();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
