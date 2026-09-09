import { TableColumn, TableForeignKey, TableIndex } from "typeorm";
import { ImprovedRunner, IQueryRunner } from "../runner";

export class RemoveDocumentTemplates1766443616572 extends ImprovedRunner {

  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    // 1.1. Add document_type_id and document_subtype_id columns to documents
    if (!(await queryRunner.hasColumn('documents', 'document_type_id'))) {
      await queryRunner.addColumn('documents', new TableColumn({
        name: 'document_type_id',
        type: 'varchar',
        length: '36',
        isNullable: true, // Initially nullable to allow update
      }));
    }
    if (!(await queryRunner.hasColumn('documents', 'document_subtype_id'))) {
      await queryRunner.addColumn('documents', new TableColumn({
        name: 'document_subtype_id',
        type: 'varchar',
        length: '36',
        isNullable: true, // Initially nullable
      }));
    }

    // 1.4. Make both ids not nullable
    // We check if we need to change column (e.g. if it is nullable)
    // But changeColumn is usually safe enough or we can just run it.
    // However, if we want to be safe:
    if (await queryRunner.isNullable('documents', 'document_type_id')) {
      await queryRunner.changeColumn('documents', new TableColumn({
        name: 'document_type_id',
        type: 'varchar',
        length: '36',
        isNullable: false,
      }));
    }
    if (await queryRunner.isNullable('documents', 'document_subtype_id')) {
      await queryRunner.changeColumn('documents', new TableColumn({
        name: 'document_subtype_id',
        type: 'varchar',
        length: '36',
        isNullable: false,
      }));
    }

    // 1.5. Add foreign keys for type and subtype in documents
    if (!(await queryRunner.hasForeignKey('documents', 'FK_DOCUMENTS_DOCUMENT_TYPE'))) {
      await queryRunner.createForeignKey('documents', new TableForeignKey({
        name: 'FK_DOCUMENTS_DOCUMENT_TYPE',
        columnNames: ['document_type_id'],
        referencedTableName: 'document_types',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }));
    }
    if (!(await queryRunner.hasForeignKey('documents', 'FK_DOCUMENTS_DOCUMENT_SUBTYPE'))) {
      await queryRunner.createForeignKey('documents', new TableForeignKey({
        name: 'FK_DOCUMENTS_DOCUMENT_SUBTYPE',
        columnNames: ['document_subtype_id'],
        referencedTableName: 'document_subtypes',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      })) ;
    }

    // 1.6. Create new indices for documents
    if (!(await queryRunner.hasIndex('documents', 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT'))) {
      await queryRunner.createIndex('documents', new TableIndex({
        name: 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT',
        columnNames: ['document_type_id', 'document_subtype_id', 'contract_id'],
        isUnique: true,
      }));
    }

    // 2.1. Add document_type_id and document_subtype_id columns to documents_history
    if (!(await queryRunner.hasColumn('documents_history', 'document_type_id'))) {
      await queryRunner.addColumn('documents_history', new TableColumn({
        name: 'document_type_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }));
    }
    if (!(await queryRunner.hasColumn('documents_history', 'document_subtype_id'))) {
      await queryRunner.addColumn('documents_history', new TableColumn({
        name: 'document_subtype_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }));
    }

    // 2.4. Make both ids not nullable
    if (await queryRunner.isNullable('documents_history', 'document_type_id')) {
      await queryRunner.changeColumn('documents_history', new TableColumn({
        name: 'document_type_id',
        type: 'varchar',
        length: '36',
        isNullable: false,
      }));
    }
    if (await queryRunner.isNullable('documents_history', 'document_subtype_id')) {
      await queryRunner.changeColumn('documents_history', new TableColumn({
        name: 'document_subtype_id',
        type: 'varchar',
        length: '36',
        isNullable: false,
      }));
    }

    // 2.5. Add foreign keys for type and subtype in documents_history
    if (!(await queryRunner.hasForeignKey('documents_history', 'FK_DOCUMENTS_HISTORY_DOCUMENT_TYPE'))) {
      await queryRunner.createForeignKey('documents_history', new TableForeignKey({
        name: 'FK_DOCUMENTS_HISTORY_DOCUMENT_TYPE',
        columnNames: ['document_type_id'],
        referencedTableName: 'document_types',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }));
    }
    if (!(await queryRunner.hasForeignKey('documents_history', 'FK_DOCUMENTS_HISTORY_DOCUMENT_SUBTYPE'))) {
      await queryRunner.createForeignKey('documents_history', new TableForeignKey({
        name: 'FK_DOCUMENTS_HISTORY_DOCUMENT_SUBTYPE',
        columnNames: ['document_subtype_id'],
        referencedTableName: 'document_subtypes',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }));
    }
    // 2.6. Create new indices for documents_history
    if (!(await queryRunner.hasIndex('documents_history', 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT'))) {
      await queryRunner.createIndex('documents_history', new TableIndex({
        name: 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT',
        columnNames: ['document_type_id', 'document_subtype_id', 'contract_id'],
        isUnique: true,
      }));
    }
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    // 2.6. Remove indices and foreign keys for documents_history
    await queryRunner.dropForeignKeyByField('documents_history', ['document_type_id', 'document_subtype_id']);
    if (await queryRunner.hasIndex('documents_history', 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT')) {
      try {
        await queryRunner.dropIndex('documents_history', 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT');
      } catch (e: any) {
        if (e.message && e.message.includes('needed in a foreign key constraint')) {
          // Workaround: Drop FK, Drop Index, Recreate FK
          await queryRunner.dropForeignKey('documents_history', 'FK_DOCUMENTS_HISTORY_CONTRACT');
          await queryRunner.dropIndex('documents_history', 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT');
          await queryRunner.createForeignKey('documents_history', new TableForeignKey({
            name: 'FK_DOCUMENTS_HISTORY_CONTRACT',
            columnNames: ['contract_id'],
            referencedTableName: 'contracts',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          }));
        } else {
          throw e;
        }
      }
    }

    // 2.1. Remove document_type_id and document_subtype_id columns from documents_history
    await queryRunner.dropColumn('documents_history', ['document_type_id', 'document_subtype_id']);

    // 1.6. Remove indices and foreign keys for documents
    await queryRunner.dropForeignKeyByField('documents', ['document_type_id', 'document_subtype_id']);
    if (await queryRunner.hasIndex('documents', 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT')) {
      try {
        await queryRunner.dropIndex('documents', 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT');
      } catch (e: any) {
        if (e.message && e.message.includes('needed in a foreign key constraint')) {
          await queryRunner.dropForeignKey('documents', 'FK_DOCUMENTS_CONTRACT');
          await queryRunner.dropIndex('documents', 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT');
          await queryRunner.createForeignKey('documents', new TableForeignKey({
            name: 'FK_DOCUMENTS_CONTRACT',
            columnNames: ['contract_id'],
            referencedTableName: 'contracts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          }));
        } else {
          throw e;
        }
      }
    }

    // 1.1. Remove document_type_id and document_subtype_id columns from documents
    await queryRunner.dropColumn('documents', ['document_type_id', 'document_subtype_id']);
  }
}
