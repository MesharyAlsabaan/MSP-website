import { MigrationInterface, QueryRunner } from "typeorm";
import { useConnectionSchema } from "../migration-utils";

export class Baseline1789923892069 implements MigrationInterface {
    name = 'Baseline1789923892069'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await useConnectionSchema(queryRunner);
        await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM('SUPER_ADMIN', 'CONTENT_MANAGER', 'EDITOR')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "name" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" "users_role_enum" NOT NULL DEFAULT 'EDITOR', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "team_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "title" jsonb NOT NULL, "bio" jsonb NOT NULL, "photo" character varying NOT NULL DEFAULT '', "email" character varying NOT NULL DEFAULT '', "phone" character varying NOT NULL DEFAULT '', "linkedin" character varying NOT NULL DEFAULT '', "sort_order" integer NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_ca3eae89dcf20c9fd95bf7460aa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "testimonials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "client_name" character varying NOT NULL, "role" jsonb NOT NULL, "quote" jsonb NOT NULL, "photo" character varying NOT NULL DEFAULT '', "rating" integer NOT NULL DEFAULT '5', "sort_order" integer NOT NULL DEFAULT '0', "published" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_63b03c608bd258f115a0a4a1060" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "key" character varying NOT NULL, "value" jsonb, CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8639b7626fa94ba8265628f21" ON "settings" ("key") `);
        await queryRunner.query(`CREATE TABLE "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "slug" character varying NOT NULL, "title" jsonb NOT NULL, "short_description" jsonb NOT NULL, "full_description" jsonb NOT NULL, "icon" character varying NOT NULL DEFAULT '', "featured" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', "published" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_02cf0d0f46e11d22d952f62367" ON "services" ("slug") `);
        await queryRunner.query(`CREATE TYPE "projects_status_enum" AS ENUM('draft', 'published')`);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "slug" character varying NOT NULL, "no" character varying NOT NULL DEFAULT '00', "title" jsonb NOT NULL, "typology" jsonb NOT NULL, "design_categories" jsonb NOT NULL DEFAULT '[]', "sectors" jsonb NOT NULL DEFAULT '[]', "disciplines" jsonb NOT NULL DEFAULT '[]', "location" jsonb NOT NULL, "year" character varying NOT NULL DEFAULT '', "cover" character varying NOT NULL DEFAULT '', "gallery" jsonb NOT NULL DEFAULT '[]', "summary" jsonb NOT NULL, "description" jsonb NOT NULL DEFAULT '[]', "specs" jsonb NOT NULL DEFAULT '[]', "services" jsonb NOT NULL DEFAULT '[]', "client_name" character varying NOT NULL DEFAULT '', "project_url" character varying NOT NULL DEFAULT '', "status" "projects_status_enum" NOT NULL DEFAULT 'published', "featured" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_96e045ab8b0271e5f5a91eae1e" ON "projects" ("slug") `);
        await queryRunner.query(`CREATE TABLE "partners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "logo" character varying NOT NULL DEFAULT '', "url" character varying NOT NULL DEFAULT '', "sort_order" integer NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_998645b20820e4ab99aeae03b41" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "newsletter_subscribers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_38f9333e9961b2fdb589128d19b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0dc48416511f011f7de7b2a8f8" ON "newsletter_subscribers" ("email") `);
        await queryRunner.query(`CREATE TABLE "contact_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying NOT NULL DEFAULT '', "subject" character varying NOT NULL DEFAULT '', "message" text NOT NULL, "read" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_b74f96eb2edd977ccfba6533293" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "blog_posts_status_enum" AS ENUM('draft', 'published')`);
        await queryRunner.query(`CREATE TABLE "blog_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "slug" character varying NOT NULL, "title" jsonb NOT NULL, "category" character varying NOT NULL DEFAULT '', "excerpt" jsonb NOT NULL, "body" jsonb NOT NULL, "cover" character varying NOT NULL DEFAULT '', "gallery" jsonb NOT NULL DEFAULT '[]', "author" character varying NOT NULL DEFAULT '', "related_project_slug" character varying NOT NULL DEFAULT '', "status" "blog_posts_status_enum" NOT NULL DEFAULT 'published', "published_at" TIMESTAMP WITH TIME ZONE, "seo_title" jsonb, "seo_description" jsonb, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_dd2add25eac93daefc93da9d387" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5b2818a2c45c3edb9991b1c7a5" ON "blog_posts" ("slug") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await useConnectionSchema(queryRunner);
        await queryRunner.query(`DROP INDEX "IDX_5b2818a2c45c3edb9991b1c7a5"`);
        await queryRunner.query(`DROP TABLE "blog_posts"`);
        await queryRunner.query(`DROP TYPE "blog_posts_status_enum"`);
        await queryRunner.query(`DROP TABLE "contact_messages"`);
        await queryRunner.query(`DROP INDEX "IDX_0dc48416511f011f7de7b2a8f8"`);
        await queryRunner.query(`DROP TABLE "newsletter_subscribers"`);
        await queryRunner.query(`DROP TABLE "partners"`);
        await queryRunner.query(`DROP INDEX "IDX_96e045ab8b0271e5f5a91eae1e"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TYPE "projects_status_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_02cf0d0f46e11d22d952f62367"`);
        await queryRunner.query(`DROP TABLE "services"`);
        await queryRunner.query(`DROP INDEX "IDX_c8639b7626fa94ba8265628f21"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`DROP TABLE "testimonials"`);
        await queryRunner.query(`DROP TABLE "team_members"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "users_role_enum"`);
    }

}
