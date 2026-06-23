import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStrategyDataPermissions1782240000000 implements MigrationInterface {
  name = 'AddStrategyDataPermissions1782240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "strategies" ADD "allow_market_data" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategies" ADD "allow_news_search" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."strategy_judgment_mode" AS ENUM('ai', 'user')`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategies" ADD "strategy_judgment_mode" "public"."strategy_judgment_mode" NOT NULL DEFAULT 'user'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "strategies" DROP COLUMN "strategy_judgment_mode"`,
    );
    await queryRunner.query(`DROP TYPE "public"."strategy_judgment_mode"`);
    await queryRunner.query(
      `ALTER TABLE "strategies" DROP COLUMN "allow_news_search"`,
    );
    await queryRunner.query(
      `ALTER TABLE "strategies" DROP COLUMN "allow_market_data"`,
    );
  }
}
