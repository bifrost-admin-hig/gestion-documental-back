import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRequiredExpirationDate1769385000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add to documents
    await queryRunner.getTable('documents').then(async (table) => {
      if (table && !table?.columns.some((col) => col.name === 'required_expiration_date')) {
        await queryRunner.addColumn('documents', new TableColumn({
          name: 'required_expiration_date',
          type: 'boolean',
          isNullable: false,
          default: false,
        }));
      }
    });
    await queryRunner.getTable('document_models').then(async (table) => {
      if (table && !table?.columns.some((col) => col.name === 'required_expiration_date')) {
        await queryRunner.addColumn('document_models', new TableColumn({
          name: 'required_expiration_date',
          type: 'boolean',
          isNullable: false,
          default: false,
        }));
      }
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.getTable('document_models').then(async (table) => {
      if (table?.columns.some((col) => col.name === 'required_expiration_date')) {
        await queryRunner.dropColumn('document_models', 'required_expiration_date');
      }
    });
    await queryRunner.getTable('documents').then(async (table) => {
      if (table?.columns.some((col) => col.name === 'required_expiration_date')) {
        await queryRunner.dropColumn('documents', 'required_expiration_date');
      }
    });
  }
}
