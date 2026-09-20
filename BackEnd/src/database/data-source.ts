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
  schema: cfg.database.schema,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  // Never auto-sync: the schema is owned by the migrations above. The
  // `migrate` service (compose) / `npm run migration:run:prod` applies them
  // as a separate deploy step, so a failed migration never starts the app.
  synchronize: cfg.database.synchronize,
  migrationsRun: false,
  migrationsTableName: 'migrations',
  logging: cfg.env === 'development' ? ['error', 'warn'] : ['error'],
};

/** Standalone DataSource for migrations / seeding outside the Nest context. */
export default new DataSource(dataSourceOptions);
