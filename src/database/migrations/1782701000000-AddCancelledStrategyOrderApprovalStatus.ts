import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelledStrategyOrderApprovalStatus1782701000000 implements MigrationInterface {
  name = 'AddCancelledStrategyOrderApprovalStatus1782701000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // approval status enum에 live 주문 취소 상태를 추가
    await queryRunner.query(
      `ALTER TYPE "public"."strategy_order_approval_status" ADD VALUE IF NOT EXISTS 'cancelled'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // enum 값을 제거하기 전에 cancelled 데이터를 기존 상태로 치환
    await queryRunner.query(
      `UPDATE "strategy_order_approvals" SET "status" = 'failed' WHERE "status" = 'cancelled'`,
    );

    // PostgreSQL enum은 값을 직접 제거할 수 없어서 새 enum 타입으로 교체
    await queryRunner.query(
      `ALTER TYPE "public"."strategy_order_approval_status" RENAME TO "strategy_order_approval_status_old"`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."strategy_order_approval_status" AS ENUM('pending', 'approved', 'rejected', 'executed', 'failed')`,
    );

    await queryRunner.query(
      `ALTER TABLE "strategy_order_approvals" ALTER COLUMN "status" DROP DEFAULT`,
    );

    await queryRunner.query(
      `ALTER TABLE "strategy_order_approvals" ALTER COLUMN "status" TYPE "public"."strategy_order_approval_status" USING "status"::"text"::"public"."strategy_order_approval_status"`,
    );

    await queryRunner.query(
      `ALTER TABLE "strategy_order_approvals" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );

    await queryRunner.query(
      `DROP TYPE "public"."strategy_order_approval_status_old"`,
    );
  }
}
