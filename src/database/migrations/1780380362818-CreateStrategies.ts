import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStrategies1780380362818 implements MigrationInterface {
  name = 'CreateStrategies1780380362818';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."exchange" AS ENUM('upbit')`);
    await queryRunner.query(
      `CREATE TYPE "public"."strategy_mode" AS ENUM('paper', 'live')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."strategy_status" AS ENUM('draft', 'active', 'paused', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "strategies" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "name" character varying(80) NOT NULL, "exchange" "public"."exchange" NOT NULL DEFAULT 'upbit', "market" character varying(30) NOT NULL, "prompt" text NOT NULL, "strategy_mode" "public"."strategy_mode" NOT NULL DEFAULT 'paper', "interval_minutes" integer NOT NULL, "schedule_anchor_at" TIMESTAMP WITH TIME ZONE NOT NULL, "next_run_at" TIMESTAMP WITH TIME ZONE, "enabled" boolean NOT NULL DEFAULT false, "strategy_status" "public"."strategy_status" NOT NULL DEFAULT 'draft', "structured_strategy" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_9a0d363ddf5b40d080147363238" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_strategies_next_run_at" ON "strategies"  ("next_run_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_strategies_user_id" ON "strategies"  ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "strategies" ADD CONSTRAINT "FK_c3e9760692a90d4f2d482ce60f8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "strategies" DROP CONSTRAINT "FK_c3e9760692a90d4f2d482ce60f8"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_strategies_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_strategies_next_run_at"`);
    await queryRunner.query(`DROP TABLE "strategies"`);
    await queryRunner.query(`DROP TYPE "public"."strategy_status"`);
    await queryRunner.query(`DROP TYPE "public"."strategy_mode"`);
    await queryRunner.query(`DROP TYPE "public"."exchange"`);
  }
}
