import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddRequiresSignatureToDocumentModel1782192753247 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('document_models');
    if (table && !table.columns.some((col) => col.name === 'requires_signature')) {
      await queryRunner.addColumn('document_models', new TableColumn({
        name: 'requires_signature',
        type: 'boolean',
        isNullable: false,
        default: false,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('document_models');
    if (table?.columns.some((col) => col.name === 'requires_signature')) {
      await queryRunner.dropColumn('document_models', 'requires_signature');
    }
  }

}
