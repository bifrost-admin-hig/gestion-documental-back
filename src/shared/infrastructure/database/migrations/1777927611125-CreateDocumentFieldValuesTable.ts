import { Table, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateDocumentFieldValuesTable1777927611125 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'document_field_values',
      columns: [
        {
          name: 'id',
          type: 'varchar',
          length: '36',
          isPrimary: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'document_id',
          type: 'varchar',
          length: '36',
          isNullable: false,
        },
        {
          name: 'field_name',
          type: 'varchar',
          length: '100',
          isNullable: false,
        },
        {
          name: 'field_value',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          onUpdate: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
      ],
    }));

    await queryRunner.createIndex('document_field_values', new TableIndex({
      name: 'IDX_document_field_values_document_id',
      columnNames: ['document_id'],
    }));

    await queryRunner.createIndex('document_field_values', new TableIndex({
      name: 'IDX_document_field_values_field_name',
      columnNames: ['field_name'],
    }));

    await queryRunner.createIndex('document_field_values', new TableIndex({
      name: 'IDX_document_field_values_document_field',
      columnNames: ['document_id', 'field_name'],
      isUnique: true,
    }));

    await queryRunner.createForeignKey('document_field_values', new TableForeignKey({
      name: 'FK_document_field_values_document',
      columnNames: ['document_id'],
      referencedTableName: 'documents',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('document_field_values');
  }
}

