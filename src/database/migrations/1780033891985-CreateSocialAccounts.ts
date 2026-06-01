import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSocialAccounts1780033891985 implements MigrationInterface {
  name = 'CreateSocialAccounts1780033891985';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "social_accounts" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "provider" "public"."auth_provider" NOT NULL, "provider_user_id" character varying(255) NOT NULL, "email" character varying(255), "display_name" character varying(100), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e9e58d2d8e9fafa20af914d9750" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_social_provider_user" ON "social_accounts"  ("provider", "provider_user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "social_accounts" ADD CONSTRAINT "FK_05a0f282d3bed93ca048a7e54dd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "social_accounts" DROP CONSTRAINT "FK_05a0f282d3bed93ca048a7e54dd"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_social_provider_user"`);
    await queryRunner.query(`DROP TABLE "social_accounts"`);
  }
}
