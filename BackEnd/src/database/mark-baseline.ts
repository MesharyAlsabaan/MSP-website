/**
 * One-time step for a database that was built by the old `synchronize: true`
 * boot: record the Baseline migration as already applied WITHOUT running it,
 * so `migration:run` never tries to CREATE tables that already exist.
 *
 * Safer than `typeorm migration:run --fake`, which would also fake every
 * later migration (e.g. ReconcileLegacyColumns) and leave real work undone.
 *
 * Refuses to act unless the database looks exactly like an un-baselined
 * legacy database: the `users` table exists and no migration is recorded.
 *
 *   npm run migration:baseline
 */
import dataSource from './data-source';

async function main(): Promise<void> {
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  const schema = (dataSource.options as { schema?: string }).schema ?? 'public';
  const baseline = dataSource.migrations.find((m) =>
    (m.name ?? '').startsWith('Baseline'),
  );
  if (!baseline?.name) throw new Error('No Baseline migration found in the migrations folder.');
  const timestamp = Number(baseline.name.replace(/^\D+/, ''));

  try {
    const hasUsers = await qr.hasTable('users');
    if (!hasUsers) {
      throw new Error(
        `"${schema}"."users" does not exist — this is an empty database; run "npm run migration:run" instead.`,
      );
    }
    await qr.createTable(
      new (await import('typeorm')).Table({
        schema,
        name: 'migrations',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'timestamp', type: 'bigint', isNullable: false },
          { name: 'name', type: 'character varying', isNullable: false },
        ],
      }),
      true,
    );
    const rows: { count: string }[] = await qr.query(
      `SELECT count(*)::text AS count FROM "${schema}"."migrations"`,
    );
    if (Number(rows[0].count) > 0) {
      throw new Error(
        'The migrations table already has entries — this database is baselined; nothing to do.',
      );
    }
    await qr.query(
      `INSERT INTO "${schema}"."migrations" ("timestamp", "name") VALUES ($1, $2)`,
      [timestamp, baseline.name],
    );
    // eslint-disable-next-line no-console
    console.log(
      `Recorded ${baseline.name} as applied in "${schema}".migrations (no schema changes made). ` +
        'Now run "npm run migration:run" to apply the remaining migrations.',
    );
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

main().catch((err: Error) => {
  // eslint-disable-next-line no-console
  console.error(`mark-baseline aborted: ${err.message}`);
  process.exit(1);
});
