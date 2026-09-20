import { MigrationInterface, QueryRunner } from "typeorm";
import { useConnectionSchema } from "../migration-utils";

export class Vendors1789924471453 implements MigrationInterface {
    name = 'Vendors1789924471453'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await useConnectionSchema(queryRunner);
        await queryRunner.query(`CREATE TABLE "vendors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "vendor_number" character varying(16) NOT NULL, "company_name" character varying NOT NULL, "company_name_en" character varying NOT NULL DEFAULT '', "primary_category_key" character varying(64) NOT NULL, "secondary_category_keys" jsonb NOT NULL DEFAULT '[]', "approved_revision_id" uuid, CONSTRAINT "PK_9c956c9797edfae5c6ddacc4e6e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b7ab287ddf241ef070f3ccb2b9" ON "vendors" ("vendor_number") `);
        await queryRunner.query(`CREATE TABLE "vendor_stored_files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "sha256" character varying(64) NOT NULL, "size_bytes" bigint NOT NULL, "mime" character varying(128) NOT NULL, "storage_key" character varying(200) NOT NULL, CONSTRAINT "PK_d8600e66fa33e654c8db25b7fe2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_07a9738b1fec188b87b078b6b9" ON "vendor_stored_files" ("sha256") `);
        await queryRunner.query(`CREATE TYPE "vendor_applications_status_enum" AS ENUM('under_review', 'needs_completion', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "vendor_applications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "request_number" character varying(16) NOT NULL, "vendor_id" uuid NOT NULL, "status" "vendor_applications_status_enum" NOT NULL DEFAULT 'under_review', "current_revision_no" integer NOT NULL DEFAULT '1', "submitter_email" character varying NOT NULL, CONSTRAINT "PK_040e931a5acccc7051d7f726520" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_763f839c65c3815663b6e2b00b" ON "vendor_applications" ("request_number") `);
        await queryRunner.query(`CREATE INDEX "IDX_158448879d9f874af184e43cab" ON "vendor_applications" ("vendor_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_484f7c9d85585e9e6f9cf45aaf" ON "vendor_applications" ("status") `);
        await queryRunner.query(`CREATE TYPE "vendor_application_revisions_decision_enum" AS ENUM('needs_completion', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "vendor_application_revisions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "application_id" uuid NOT NULL, "revision_no" integer NOT NULL, "data" jsonb NOT NULL, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL, "decision" "vendor_application_revisions_decision_enum", "decided_at" TIMESTAMP WITH TIME ZONE, "decided_by_user_id" uuid, "decided_by_name" character varying NOT NULL DEFAULT '', "decision_note" text NOT NULL DEFAULT '', CONSTRAINT "PK_16dba28c69cfdda0d3487136182" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_29642f42db2aba0f7b9abf33d7" ON "vendor_application_revisions" ("application_id", "revision_no") `);
        await queryRunner.query(`CREATE TABLE "vendor_revision_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "revision_id" uuid NOT NULL, "doc_type_key" character varying(64) NOT NULL, "original_filename" character varying NOT NULL, "stored_file_id" uuid NOT NULL, "expires_at" date, CONSTRAINT "PK_ac77d415c7a40e232520d0e8c9f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_13361549c93ccc32473542b30f" ON "vendor_revision_documents" ("revision_id", "doc_type_key", "original_filename") `);
        await queryRunner.query(`CREATE TABLE "vendor_categories" ("key" character varying(64) NOT NULL, "name_ar" character varying NOT NULL, "name_en" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_337539ccffecd5354ac14ec2204" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "vendor_document_requirements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "category_key" character varying(64) NOT NULL, "doc_type_key" character varying(64) NOT NULL, "name_ar" character varying NOT NULL, "name_en" character varying NOT NULL, "required" boolean NOT NULL DEFAULT true, "requires_expiry" boolean NOT NULL DEFAULT false, "archive_folder" character varying NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_aaf96a0d9630e5fa6a7f5bc0550" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_134adb52217ea0a8e1ef20cccc" ON "vendor_document_requirements" ("category_key", "doc_type_key") `);
        await queryRunner.query(`CREATE TYPE "vendor_review_events_action_enum" AS ENUM('submitted', 'resubmitted', 'completion_requested', 'approved', 'rejected', 'archive_retried')`);
        await queryRunner.query(`CREATE TABLE "vendor_review_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "application_id" uuid NOT NULL, "revision_id" uuid, "action" "vendor_review_events_action_enum" NOT NULL, "note" text NOT NULL DEFAULT '', "missing_items" jsonb NOT NULL DEFAULT '[]', "actor_user_id" uuid, "actor_name" character varying NOT NULL DEFAULT '', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d3b2a7641548e3513fc0780d8d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_445d47659dff2619b144d806be" ON "vendor_review_events" ("application_id") `);
        await queryRunner.query(`CREATE TABLE "vendor_counters" ("scope" character varying(32) NOT NULL, "last_value" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_c9a20d8ceabf5b0eb3394641337" PRIMARY KEY ("scope"))`);
        await queryRunner.query(`CREATE TYPE "vendor_archive_jobs_status_enum" AS ENUM('pending', 'transferring', 'completed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "vendor_archive_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "revision_id" uuid NOT NULL, "vendor_id" uuid NOT NULL, "sequence_no" integer NOT NULL, "status" "vendor_archive_jobs_status_enum" NOT NULL DEFAULT 'pending', "attempts" integer NOT NULL DEFAULT '0', "lease_owner" character varying(128), "lease_token" character varying(64), "lease_expires_at" TIMESTAMP WITH TIME ZONE, "last_error" text NOT NULL DEFAULT '', "last_step" character varying(64) NOT NULL DEFAULT '', "archive_path" text NOT NULL DEFAULT '', "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "REL_828c2a311b874287fd52035856" UNIQUE ("revision_id"), CONSTRAINT "PK_875ef41606b88b85ba5353b3cc5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_828c2a311b874287fd52035856" ON "vendor_archive_jobs" ("revision_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_aace872014ba6f093d6b6a9cee" ON "vendor_archive_jobs" ("vendor_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3e0de27620ef12aaab3862ecc5" ON "vendor_archive_jobs" ("status") `);
        await queryRunner.query(`CREATE TABLE "vendor_completion_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "application_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c096d65d32478e51543c05cf392" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2056fe68034e76168101399ea3" ON "vendor_completion_tokens" ("application_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fef2efe27f970258781f127756" ON "vendor_completion_tokens" ("token_hash") `);
        await queryRunner.query(`CREATE TABLE "archive_agent_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(128) NOT NULL, "key_hash" character varying(64) NOT NULL, "active" boolean NOT NULL DEFAULT true, "last_seen_at" TIMESTAMP WITH TIME ZONE, "last_heartbeat" jsonb, CONSTRAINT "PK_a4dbc58c37d15795c6879bf250c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fea51125480444df73f6ba77c0" ON "archive_agent_keys" ("key_hash") `);
        // Adding a role value in place (no rewrite of the users table). Removing
        // an enum value is not supported by Postgres, so down() leaves it.
        await queryRunner.query(`ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'VENDOR_REVIEWER'`);
        await queryRunner.query(`ALTER TABLE "vendor_applications" ADD CONSTRAINT "FK_158448879d9f874af184e43cabf" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_application_revisions" ADD CONSTRAINT "FK_78cd196e86bbebba3a6e2c56e7e" FOREIGN KEY ("application_id") REFERENCES "vendor_applications"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_revision_documents" ADD CONSTRAINT "FK_1cd80ace989eeda1f2b4b8f07f3" FOREIGN KEY ("revision_id") REFERENCES "vendor_application_revisions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_revision_documents" ADD CONSTRAINT "FK_43251d58e12ea928582ff4f0891" FOREIGN KEY ("stored_file_id") REFERENCES "vendor_stored_files"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_document_requirements" ADD CONSTRAINT "FK_7b1443f120b14a1fbe281412378" FOREIGN KEY ("category_key") REFERENCES "vendor_categories"("key") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_archive_jobs" ADD CONSTRAINT "FK_828c2a311b874287fd52035856f" FOREIGN KEY ("revision_id") REFERENCES "vendor_application_revisions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_archive_jobs" ADD CONSTRAINT "FK_aace872014ba6f093d6b6a9cee3" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await useConnectionSchema(queryRunner);
        await queryRunner.query(`ALTER TABLE "vendor_archive_jobs" DROP CONSTRAINT "FK_aace872014ba6f093d6b6a9cee3"`);
        await queryRunner.query(`ALTER TABLE "vendor_archive_jobs" DROP CONSTRAINT "FK_828c2a311b874287fd52035856f"`);
        await queryRunner.query(`ALTER TABLE "vendor_document_requirements" DROP CONSTRAINT "FK_7b1443f120b14a1fbe281412378"`);
        await queryRunner.query(`ALTER TABLE "vendor_revision_documents" DROP CONSTRAINT "FK_43251d58e12ea928582ff4f0891"`);
        await queryRunner.query(`ALTER TABLE "vendor_revision_documents" DROP CONSTRAINT "FK_1cd80ace989eeda1f2b4b8f07f3"`);
        await queryRunner.query(`ALTER TABLE "vendor_application_revisions" DROP CONSTRAINT "FK_78cd196e86bbebba3a6e2c56e7e"`);
        await queryRunner.query(`ALTER TABLE "vendor_applications" DROP CONSTRAINT "FK_158448879d9f874af184e43cabf"`);
        await queryRunner.query(`DROP INDEX "IDX_fea51125480444df73f6ba77c0"`);
        await queryRunner.query(`DROP TABLE "archive_agent_keys"`);
        await queryRunner.query(`DROP INDEX "IDX_fef2efe27f970258781f127756"`);
        await queryRunner.query(`DROP INDEX "IDX_2056fe68034e76168101399ea3"`);
        await queryRunner.query(`DROP TABLE "vendor_completion_tokens"`);
        await queryRunner.query(`DROP INDEX "IDX_3e0de27620ef12aaab3862ecc5"`);
        await queryRunner.query(`DROP INDEX "IDX_aace872014ba6f093d6b6a9cee"`);
        await queryRunner.query(`DROP INDEX "IDX_828c2a311b874287fd52035856"`);
        await queryRunner.query(`DROP TABLE "vendor_archive_jobs"`);
        await queryRunner.query(`DROP TYPE "vendor_archive_jobs_status_enum"`);
        await queryRunner.query(`DROP TABLE "vendor_counters"`);
        await queryRunner.query(`DROP INDEX "IDX_445d47659dff2619b144d806be"`);
        await queryRunner.query(`DROP TABLE "vendor_review_events"`);
        await queryRunner.query(`DROP TYPE "vendor_review_events_action_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_134adb52217ea0a8e1ef20cccc"`);
        await queryRunner.query(`DROP TABLE "vendor_document_requirements"`);
        await queryRunner.query(`DROP TABLE "vendor_categories"`);
        await queryRunner.query(`DROP INDEX "IDX_13361549c93ccc32473542b30f"`);
        await queryRunner.query(`DROP TABLE "vendor_revision_documents"`);
        await queryRunner.query(`DROP INDEX "IDX_29642f42db2aba0f7b9abf33d7"`);
        await queryRunner.query(`DROP TABLE "vendor_application_revisions"`);
        await queryRunner.query(`DROP TYPE "vendor_application_revisions_decision_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_484f7c9d85585e9e6f9cf45aaf"`);
        await queryRunner.query(`DROP INDEX "IDX_158448879d9f874af184e43cab"`);
        await queryRunner.query(`DROP INDEX "IDX_763f839c65c3815663b6e2b00b"`);
        await queryRunner.query(`DROP TABLE "vendor_applications"`);
        await queryRunner.query(`DROP TYPE "vendor_applications_status_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_07a9738b1fec188b87b078b6b9"`);
        await queryRunner.query(`DROP TABLE "vendor_stored_files"`);
        await queryRunner.query(`DROP INDEX "IDX_b7ab287ddf241ef070f3ccb2b9"`);
        await queryRunner.query(`DROP TABLE "vendors"`);
    }

}
