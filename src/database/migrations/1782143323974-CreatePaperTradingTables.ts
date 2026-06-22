import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePaperTradingTables1782143323974 implements MigrationInterface {
    name = 'CreatePaperTradingTables1782143323974'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "paper_accounts" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "base_currency" character varying(10) NOT NULL DEFAULT 'KRW', "cash_balance" numeric(20,8) NOT NULL, "initial_cash_balance" numeric(20,8) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_660b7540c8d0b342144c5653d6d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_paper_account_user_id" ON "paper_accounts"  ("user_id") `);
        await queryRunner.query(`CREATE TABLE "paper_positions" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "paper_account_id" integer NOT NULL, "market" character varying(30) NOT NULL, "quantity" numeric(20,8) NOT NULL, "average_entry_price" numeric(20,8) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_72380f1ca0db030210595ff7724" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_paper_positions_account_market" ON "paper_positions"  ("paper_account_id", "market") `);
        await queryRunner.query(`CREATE INDEX "IDX_paper_positions_user_id" ON "paper_positions"  ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_paper_positions_market" ON "paper_positions"  ("market") `);
        await queryRunner.query(`ALTER TABLE "paper_accounts" ADD CONSTRAINT "FK_a33c86dba4efd0768e7f1246e78" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "paper_positions" ADD CONSTRAINT "FK_6de27e976895c6979f66a119180" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "paper_positions" ADD CONSTRAINT "FK_5e530bcf2aa67261d9024f1c79d" FOREIGN KEY ("paper_account_id") REFERENCES "paper_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "paper_positions" DROP CONSTRAINT "FK_5e530bcf2aa67261d9024f1c79d"`);
        await queryRunner.query(`ALTER TABLE "paper_positions" DROP CONSTRAINT "FK_6de27e976895c6979f66a119180"`);
        await queryRunner.query(`ALTER TABLE "paper_accounts" DROP CONSTRAINT "FK_a33c86dba4efd0768e7f1246e78"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_paper_positions_market"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_paper_positions_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_paper_positions_account_market"`);
        await queryRunner.query(`DROP TABLE "paper_positions"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_paper_account_user_id"`);
        await queryRunner.query(`DROP TABLE "paper_accounts"`);
    }

}
