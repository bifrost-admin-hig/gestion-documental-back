import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddRequiresApprovalToDocumentModels1781672897504 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.getTable('document_models').then(async (table) => {
      if (table && !table.columns.some((col) => col.name === 'requires_approval')) {
        await queryRunner.addColumn('document_models', new TableColumn({
          name: 'requires_approval',
          type: 'boolean',
          isNullable: false,
          default: true,
        }));
      }
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.getTable('document_models').then(async (table) => {
      if (table?.columns.some((col) => col.name === 'requires_approval')) {
        await queryRunner.dropColumn('document_models', 'requires_approval');
      }
    });
  }

}
