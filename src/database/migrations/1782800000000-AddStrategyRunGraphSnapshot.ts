import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStrategyRunGraphSnapshot1782800000000 implements MigrationInterface {
  name = 'AddStrategyRunGraphSnapshot1782800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 전략 실행 중 graph node 상태를 polling으로 조회할 수 있도록 snapshot 컬럼 추가
    await queryRunner.query(
      `ALTER TABLE "strategy_runs" ADD "graph_snapshot" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // rollback 시 실행 중 graph snapshot 컬럼 제거
    await queryRunner.query(
      `ALTER TABLE "strategy_runs" DROP COLUMN "graph_snapshot"`,
    );
  }
}
