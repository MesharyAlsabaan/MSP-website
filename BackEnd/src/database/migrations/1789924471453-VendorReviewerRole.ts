import { MigrationInterface, QueryRunner } from 'typeorm';
import { useConnectionSchema } from '../migration-utils';

/**
 * Website database: the staff role that may review vendors. The vendor data
 * itself lives in the office vendor service, never here.
 */
export class VendorReviewerRole1789924471453 implements MigrationInterface {
  name = 'VendorReviewerRole1789924471453';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await useConnectionSchema(queryRunner);
    // Added in place (no rewrite of the users table). Postgres cannot remove an
    // enum value, so down() intentionally leaves it.
    await queryRunner.query(`ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'VENDOR_REVIEWER'`);
  }

  public async down(): Promise<void> {}
}
