import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStrategyRuns1781957638841 implements MigrationInterface {
  name = 'CreateStrategyRuns1781957638841';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."strategy_run_status" AS ENUM('running', 'succeeded', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "strategy_runs" ("id" SERIAL NOT NULL, "strategy_id" integer NOT NULL, "user_id" integer NOT NULL, "status" "public"."strategy_run_status" NOT NULL DEFAULT 'running', "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "finished_at" TIMESTAMP WITH TIME ZONE, "error_message" text, "result" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_12b93d7b95cf0f6cef2a0c838da" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_strategy_runs_started_at" ON "strategy_runs"  ("started_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_strategy_runs_status" ON "strategy_runs"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_strategy_runs_user_id" ON "strategy_runs"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_strategy_runs_strategy_id" ON "strategy_runs"  ("strategy_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy_runs" ADD CONSTRAINT "FK_e72328486e235a7dd678e1253e4" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy_runs" ADD CONSTRAINT "FK_1f6db13dda71dfa88feaaec10cd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "strategy_runs" DROP CONSTRAINT "FK_1f6db13dda71dfa88feaaec10cd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategy_runs" DROP CONSTRAINT "FK_e72328486e235a7dd678e1253e4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_strategy_runs_strategy_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_strategy_runs_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_strategy_runs_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_strategy_runs_started_at"`,
    );
    await queryRunner.query(`DROP TABLE "strategy_runs"`);
    await queryRunner.query(`DROP TYPE "public"."strategy_run_status"`);
  }
}
