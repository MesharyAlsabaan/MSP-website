import { QueryRunner } from 'typeorm';

/**
 * Point unqualified names at the connection's schema (DB_SCHEMA, default
 * `public`) so the same migration runs unchanged in production and in the
 * isolated test schemas used locally. `public` stays on the path so
 * extension functions such as uuid_generate_v4() keep resolving.
 *
 * Call it first thing in every migration's up() and down().
 */
export async function useConnectionSchema(queryRunner: QueryRunner): Promise<void> {
  const schema =
    (queryRunner.connection.options as { schema?: string }).schema ?? 'public';
  await queryRunner.query(`SET search_path TO "${schema}", public`);
}
