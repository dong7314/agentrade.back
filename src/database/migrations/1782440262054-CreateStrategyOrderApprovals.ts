import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStrategyOrderApprovals1782440262054 implements MigrationInterface {
    name = 'CreateStrategyOrderApprovals1782440262054'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."strategy_order_approval_status" AS ENUM('pending', 'approved', 'rejected', 'executed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "strategy_order_approvals" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "strategy_id" integer NOT NULL, "strategy_run_id" integer NOT NULL, "strategy_mode" "public"."strategy_mode" NOT NULL, "market" character varying(30) NOT NULL, "decision" character varying(10) NOT NULL, "order_type" character varying(10) NOT NULL, "decision_reason" text NOT NULL, "adjusted_order" jsonb NOT NULL, "risk_check_result" jsonb NOT NULL, "order_result" jsonb, "status" "public"."strategy_order_approval_status" NOT NULL DEFAULT 'pending', "reject_reason" text, "decided_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2f74127d52d9597d0ff7f611c05" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_strategy_order_approvals_run_id" ON "strategy_order_approvals"  ("strategy_run_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_strategy_order_approvals_status" ON "strategy_order_approvals"  ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_strategy_order_approvals_user_id" ON "strategy_order_approvals"  ("user_id") `);
        await queryRunner.query(`ALTER TABLE "strategy_order_approvals" ADD CONSTRAINT "FK_63914072c2055a4d7265ffa9bed" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "strategy_order_approvals" ADD CONSTRAINT "FK_21b0bc838aaeb52717ddba32811" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "strategy_order_approvals" ADD CONSTRAINT "FK_1d7cc65313139651a07ca7d6132" FOREIGN KEY ("strategy_run_id") REFERENCES "strategy_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "strategy_order_approvals" DROP CONSTRAINT "FK_1d7cc65313139651a07ca7d6132"`);
        await queryRunner.query(`ALTER TABLE "strategy_order_approvals" DROP CONSTRAINT "FK_21b0bc838aaeb52717ddba32811"`);
        await queryRunner.query(`ALTER TABLE "strategy_order_approvals" DROP CONSTRAINT "FK_63914072c2055a4d7265ffa9bed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_strategy_order_approvals_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_strategy_order_approvals_status"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_strategy_order_approvals_run_id"`);
        await queryRunner.query(`DROP TABLE "strategy_order_approvals"`);
        await queryRunner.query(`DROP TYPE "public"."strategy_order_approval_status"`);
    }

}
