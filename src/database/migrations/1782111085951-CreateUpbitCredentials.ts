import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUpbitCredentials1782111085951 implements MigrationInterface {
  name = 'CreateUpbitCredentials1782111085951';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "upbit_credential" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "encrypted_access_key" text NOT NULL, "encrypted_secret_key" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bf892bd535e4e4c0d1bbef1c785" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_upbit_credential_user_id" ON "upbit_credential"  ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "upbit_credential" ADD CONSTRAINT "FK_aa11038bad005336fd4b3c80d64" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "upbit_credential" DROP CONSTRAINT "FK_aa11038bad005336fd4b3c80d64"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_upbit_credential_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "upbit_credential"`);
  }
}
