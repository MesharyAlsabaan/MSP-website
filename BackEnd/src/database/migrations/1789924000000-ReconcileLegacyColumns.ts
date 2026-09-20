import { MigrationInterface, QueryRunner } from 'typeorm';
import { useConnectionSchema } from '../migration-utils';

/**
 * Databases created by the old `synchronize: true` boot may predate these five
 * columns (the production export in deploy/msp_db.sql does). Adding them with
 * IF NOT EXISTS makes this safe to run on any database that has been
 * baselined, whether or not auto-sync already added them.
 */
export class ReconcileLegacyColumns1789924000000 implements MigrationInterface {
  name = 'ReconcileLegacyColumns1789924000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await useConnectionSchema(queryRunner);
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "design_categories" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "sectors" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "disciplines" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "gallery" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "related_project_slug" character varying NOT NULL DEFAULT ''`,
    );
  }

  public async down(): Promise<void> {
    // Intentionally a no-op: these columns carry live content and existed
    // before migrations were introduced. Dropping them is never automatic.
  }
}
