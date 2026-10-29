import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tables of the Drive → website project sync (modules/project-sync). Creates
 * three new tables and touches nothing else; `down` drops exactly those three.
 * Generated from the entities, so DB_SYNCHRONIZE finds nothing left to change.
 */

export class ProjectSyncTables1793291187147 implements MigrationInterface {
    name = 'ProjectSyncTables1793291187147';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "project_sync_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "slot" character varying NOT NULL, "trigger" character varying NOT NULL, "dry_run" boolean NOT NULL DEFAULT false, "status" character varying NOT NULL DEFAULT 'running', "requested_by" character varying NOT NULL DEFAULT '', "finished_at" TIMESTAMP WITH TIME ZONE, "report" jsonb, "report_text" text NOT NULL DEFAULT '', "error" text NOT NULL DEFAULT '', CONSTRAINT "PK_0e4a7038ab0ef41f711f2a8a627" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e5f5b8998d276f417abd17b550" ON "project_sync_runs" ("slot") `);
        await queryRunner.query(`CREATE TABLE "project_sync_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "source_folder_id" character varying NOT NULL, "folder_name" character varying NOT NULL, "slug" character varying NOT NULL DEFAULT '', "mode" character varying NOT NULL DEFAULT 'owned', "state" character varying NOT NULL DEFAULT 'draft', "project_id" uuid, "source_hash" character varying NOT NULL DEFAULT '', "images" jsonb NOT NULL DEFAULT '[]', "issues" jsonb NOT NULL DEFAULT '[]', "attempts" integer NOT NULL DEFAULT '0', "last_published_at" TIMESTAMP WITH TIME ZONE, "last_verified_at" TIMESTAMP WITH TIME ZONE, "previous_snapshot" jsonb, "last_run_id" uuid, "draft" jsonb, "approved_hash" character varying NOT NULL DEFAULT '', "decided_by" character varying NOT NULL DEFAULT '', "decided_at" TIMESTAMP WITH TIME ZONE, "decision_note" text NOT NULL DEFAULT '', CONSTRAINT "PK_05c3488507f56592c1b4ea26fdf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3c7f938505e3e0a29e99bdf15d" ON "project_sync_items" ("source_folder_id") `);
        await queryRunner.query(`CREATE TABLE "project_sync_control" ("id" character varying NOT NULL DEFAULT 'control', "enabled" boolean NOT NULL DEFAULT true, "updated_by" character varying NOT NULL DEFAULT '', "deploy_requested_at" TIMESTAMP WITH TIME ZONE, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f45da5ef8195ebebf6ebf4265d7" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "project_sync_control"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c7f938505e3e0a29e99bdf15d"`);
        await queryRunner.query(`DROP TABLE "project_sync_items"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e5f5b8998d276f417abd17b550"`);
        await queryRunner.query(`DROP TABLE "project_sync_runs"`);
    }

}
