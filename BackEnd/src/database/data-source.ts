import { DataSource, DataSourceOptions } from 'typeorm';
import configuration from '../config/configuration';

const cfg = configuration();

/**
 * Shared TypeORM options. Entities are auto-discovered by glob so new modules
 * are picked up without editing this file. Used by both the Nest runtime
 * (via TypeOrmModule) and the standalone seed script.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: cfg.database.host,
  port: cfg.database.port,
  username: cfg.database.username,
  password: cfg.database.password,
  database: cfg.database.name,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  // Pending migrations run at startup, each in its own transaction, BEFORE
  // synchronize — so tables owned by a migration are created by it and never
  // by DB_SYNCHRONIZE. Existing tables are left as they are.
  migrationsRun: true,
  migrationsTransactionMode: 'each',
  synchronize: cfg.database.synchronize,
  logging: cfg.env === 'development' ? ['error', 'warn'] : ['error'],
};

/** Standalone DataSource for migrations / seeding outside the Nest context. */
export default new DataSource(dataSourceOptions);
