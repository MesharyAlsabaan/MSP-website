import { DataSource, DataSourceOptions } from 'typeorm';
import configuration from '../config/configuration';
import * as vendorEntities from '../modules/vendors/entities';

const cfg = configuration();

/**
 * Database of the OFFICE vendor service — a different database from the
 * website's (it holds vendor accounts, applications, documents metadata and
 * the review log, and it lives inside the office network). Same env var
 * names (DB_*) so the service reads its own .env on the office host.
 *
 * Entities are listed explicitly: nothing from the website CMS belongs here.
 */
export const vendorDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: cfg.database.host,
  port: cfg.database.port,
  username: cfg.database.username,
  password: cfg.database.password,
  database: cfg.database.name,
  schema: cfg.database.schema,
  entities: Object.values(vendorEntities).filter((e) => typeof e === 'function') as DataSourceOptions['entities'],
  migrations: [__dirname + '/vendor-migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsRun: false,
  migrationsTableName: 'migrations',
  logging: cfg.env === 'development' ? ['error', 'warn'] : ['error'],
};

export default new DataSource(vendorDataSourceOptions);
