import { TableColumn, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddTemplateIdToDocuments1777927540737 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('documents', 'template_id'))) {
      await queryRunner.addColumn('documents', new TableColumn({
        name: 'template_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }));
    }

    await queryRunner.createIndex('documents', new TableIndex({
      name: 'IDX_documents_template_id',
      columnNames: ['template_id'],
    }));

    await queryRunner.createForeignKey('documents', new TableForeignKey({
      name: 'FK_documents_template_id',
      columnNames: ['template_id'],
      referencedTableName: 'document_templates',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('documents', 'FK_documents_template_id');
    await queryRunner.dropIndex('documents', 'IDX_documents_template_id');
    await queryRunner.dropColumn('documents', 'template_id');
  }
}

