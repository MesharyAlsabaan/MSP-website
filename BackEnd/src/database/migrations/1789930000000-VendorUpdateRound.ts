import { MigrationInterface, QueryRunner } from 'typeorm';
import { useConnectionSchema } from '../migration-utils';

/** Adds the audit action for re-opening an approved vendor for updated documents. */
export class VendorUpdateRound1789930000000 implements MigrationInterface {
  name = 'VendorUpdateRound1789930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await useConnectionSchema(queryRunner);
    await queryRunner.query(`ALTER TYPE "vendor_review_events_action_enum" ADD VALUE IF NOT EXISTS 'update_requested'`);
  }

  public async down(): Promise<void> {
    // Postgres cannot drop an enum value; the value is harmless if unused.
  }
}
