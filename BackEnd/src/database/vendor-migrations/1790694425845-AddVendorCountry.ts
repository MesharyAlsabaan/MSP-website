import { MigrationInterface, QueryRunner } from "typeorm";
import { useConnectionSchema } from "../migration-utils";

/** Vendor country (ISO 3166-1 alpha-2) so staff can filter vendors by origin. Existing rows get '' until their next submission. */
export class AddVendorCountry1790694425845 implements MigrationInterface {
    name = 'AddVendorCountry1790694425845'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await useConnectionSchema(queryRunner);
        await queryRunner.query(`ALTER TABLE "vendors" ADD "country" character varying(2) NOT NULL DEFAULT ''`);
        await queryRunner.query(`CREATE INDEX "IDX_c29c6cb4ab380665103467e3e4" ON "vendors" ("country") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await useConnectionSchema(queryRunner);
        await queryRunner.query(`DROP INDEX "IDX_c29c6cb4ab380665103467e3e4"`);
        await queryRunner.query(`ALTER TABLE "vendors" DROP COLUMN "country"`);
    }

}
