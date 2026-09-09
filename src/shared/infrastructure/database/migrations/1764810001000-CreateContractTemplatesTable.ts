import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractTemplatesTable1764810001000 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {
    /** Removed: Contract templates */
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    /** Removed: Contract templates */
  }
}
