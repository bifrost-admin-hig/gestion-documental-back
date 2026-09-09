import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFaenaContractType1777067493938 implements MigrationInterface {
  name = 'AddFaenaContractType1777067493938';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`contracts\` MODIFY COLUMN \`contract_type\` ENUM('indefinido','plazo_fijo','obra_faena','faena','consultoria','honorarios') NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`contracts\` MODIFY COLUMN \`contract_type\` ENUM('indefinido','plazo_fijo','obra_faena','consultoria','honorarios') NOT NULL`,
    );
  }
}

