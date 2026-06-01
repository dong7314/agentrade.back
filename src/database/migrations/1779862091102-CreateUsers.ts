import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1779862091102 implements MigrationInterface {
  name = 'CreateUsers1779862091102';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('user', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."auth_provider" AS ENUM('local', 'kakao', 'naver')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255), "name" character varying(50) NOT NULL, "role" "public"."user_role" NOT NULL DEFAULT 'user', "provider" "public"."auth_provider" NOT NULL DEFAULT 'local', "provider_id" character varying(255), "paper_trading_enabled" boolean NOT NULL DEFAULT true, "live_trading_enabled" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_email" ON "users"  ("email") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_user_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."auth_provider"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
  }
}
