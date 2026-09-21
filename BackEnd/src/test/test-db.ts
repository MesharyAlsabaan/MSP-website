import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { dataSourceOptions } from '../database/data-source';

const base = dataSourceOptions as PostgresConnectionOptions;

/**
 * Opens a DataSource on a throw-away Postgres schema: created here, migrated,
 * and dropped by `close()`. Uses the local .env credentials and needs no
 * CREATEDB right. Each call gets its own schema, so parallel jest workers
 * never share tables.
 */
export async function openTestDb(): Promise<{
  ds: DataSource;
  schema: string;
  close: () => Promise<void>;
}> {
  const schema = `jest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const admin = new DataSource({ ...base, schema: 'public', logging: false });
  await admin.initialize();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.destroy();

  const ds = new DataSource({ ...base, schema, logging: false });
  await ds.initialize();
  await ds.runMigrations();

  return {
    ds,
    schema,
    close: async () => {
      await ds.destroy();
      const cleaner = new DataSource({ ...base, schema: 'public', logging: false });
      await cleaner.initialize();
      await cleaner.query(`DROP SCHEMA "${schema}" CASCADE`);
      await cleaner.destroy();
    },
  };
}

/** Same as openTestDb, but for the office vendor service's database (its own entities and migrations). */
export async function openVendorTestDb(): Promise<{ ds: DataSource; schema: string; close: () => Promise<void> }> {
  const { vendorDataSourceOptions } = await import('../database/vendor-data-source');
  const vbase = vendorDataSourceOptions as PostgresConnectionOptions;
  const schema = `jestv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const admin = new DataSource({ ...vbase, schema: 'public', logging: false });
  await admin.initialize();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.destroy();
  const ds = new DataSource({ ...vbase, schema, logging: false });
  await ds.initialize();
  await ds.runMigrations();
  return {
    ds,
    schema,
    close: async () => {
      await ds.destroy();
      const cleaner = new DataSource({ ...vbase, schema: 'public', logging: false });
      await cleaner.initialize();
      await cleaner.query(`DROP SCHEMA "${schema}" CASCADE`);
      await cleaner.destroy();
    },
  };
}
