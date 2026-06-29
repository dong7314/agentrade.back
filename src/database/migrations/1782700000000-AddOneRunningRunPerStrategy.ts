import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOneRunningRunPerStrategy1782700000000 implements MigrationInterface {
  name = 'AddOneRunningRunPerStrategy1782700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_strategy_runs_one_running_per_strategy" ON "strategy_runs" ("strategy_id") WHERE "status" = 'running'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_strategy_runs_one_running_per_strategy"`,
    );
  }
}
