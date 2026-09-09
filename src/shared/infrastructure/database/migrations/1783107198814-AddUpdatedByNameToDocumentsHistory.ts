import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddUpdatedByNameToDocumentsHistory1783107198814 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('documents_history');
    if (table && !table.columns.some((col) => col.name === 'updated_by_name')) {
      await queryRunner.addColumn('documents_history', new TableColumn({
        name: 'updated_by_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('documents_history');
    if (table?.columns.some((col) => col.name === 'updated_by_name')) {
      await queryRunner.dropColumn('documents_history', 'updated_by_name');
    }
  }

}
