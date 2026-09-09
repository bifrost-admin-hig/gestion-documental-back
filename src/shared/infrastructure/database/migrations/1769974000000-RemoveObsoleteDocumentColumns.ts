import { TableColumn, TableForeignKey, TableIndex } from "typeorm";
import { ImprovedRunner, IQueryRunner } from "../runner";

export class RemoveObsoleteDocumentColumns1769974000000 extends ImprovedRunner {

  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    // Drop index if exists
    if (await queryRunner.hasIndex('documents', 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT')) {
      await queryRunner.dropIndex('documents', 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT');
    }

    // Drop FKs if exist
    if (await queryRunner.hasForeignKey('documents', 'FK_DOCUMENTS_DOCUMENT_TYPE')) {
      await queryRunner.dropForeignKey('documents', 'FK_DOCUMENTS_DOCUMENT_TYPE');
    }
    if (await queryRunner.hasForeignKey('documents', 'FK_DOCUMENTS_DOCUMENT_SUBTYPE')) {
      await queryRunner.dropForeignKey('documents', 'FK_DOCUMENTS_DOCUMENT_SUBTYPE');
    }

    // Drop columns and FKs if exist
    await queryRunner.dropColumn('documents', ['document_type_id', 'document_subtype_id']);
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    // Recreate columns
    if (!(await queryRunner.hasColumn('documents', 'document_type_id'))) {
      await queryRunner.addColumn('documents', new TableColumn({
        name: 'document_type_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }));
    }
    if (!(await queryRunner.hasColumn('documents', 'document_subtype_id'))) {
      await queryRunner.addColumn('documents', new TableColumn({
        name: 'document_subtype_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }));
    }

    // Recreate FKs
    await queryRunner.createForeignKey('documents', new TableForeignKey({
      name: 'FK_DOCUMENTS_DOCUMENT_TYPE',
      columnNames: ['document_type_id'],
      referencedTableName: 'document_types',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
    }));
    await queryRunner.createForeignKey('documents', new TableForeignKey({
      name: 'FK_DOCUMENTS_DOCUMENT_SUBTYPE',
      columnNames: ['document_subtype_id'],
      referencedTableName: 'document_subtypes',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
    }));

    // Recreate index
    await queryRunner.createIndex('documents', new TableIndex({
      name: 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT',
      columnNames: ['document_type_id', 'document_subtype_id', 'contract_id'],
      isUnique: true,
    }));
  }
}
