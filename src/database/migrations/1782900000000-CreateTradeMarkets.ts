import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTradeMarkets1782900000000 implements MigrationInterface {
  name = 'CreateTradeMarkets1782900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "trade_markets" ("id" SERIAL NOT NULL, "exchange" character varying(30) NOT NULL DEFAULT 'upbit', "market" character varying(30) NOT NULL, "quote" character varying(10) NOT NULL, "symbol" character varying(20) NOT NULL, "korean_name" character varying(50) NOT NULL, "english_name" character varying(80) NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_trade_markets_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_trade_market_exchange_market" ON "trade_markets" ("exchange", "market")`,
    );

    // 프론트 전략 생성 화면에서 바로 사용할 기본 지원 마켓
    await queryRunner.query(
      `INSERT INTO "trade_markets" ("exchange", "market", "quote", "symbol", "korean_name", "english_name", "enabled", "sort_order") VALUES ('upbit', 'KRW-BTC', 'KRW', 'BTC', '비트코인', 'Bitcoin', true, 1), ('upbit', 'KRW-ETH', 'KRW', 'ETH', '이더리움', 'Ethereum', true, 2), ('upbit', 'KRW-XRP', 'KRW', 'XRP', '리플', 'XRP', true, 3)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_trade_market_exchange_market"`,
    );
    await queryRunner.query(`DROP TABLE "trade_markets"`);
  }
}
