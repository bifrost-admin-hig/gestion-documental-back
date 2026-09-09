import { Table, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateDocumentTemplatesTable1777599890203 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'document_templates',
      columns: [
        {
          name: 'id',
          type: 'varchar',
          length: '36',
          isPrimary: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'code',
          type: 'varchar',
          length: '20',
          isNullable: false,
          isUnique: true,
        },
        {
          name: 'title',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'version',
          type: 'int',
          default: 1,
          isNullable: false,
        },
        {
          name: 'document_date',
          type: 'date',
          isNullable: false,
        },
        {
          name: 'description',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'file_url',
          type: 'varchar',
          length: '500',
          isNullable: true,
        },
        {
          name: 'group_id',
          type: 'int',
          isNullable: false,
        },
        {
          name: 'fields_json',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'created_by',
          type: 'varchar',
          length: '36',
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
        {
          name: 'deleted_at',
          type: 'timestamp',
          isNullable: true,
        },
      ],
    }));

    await queryRunner.createIndex('document_templates', new TableIndex({
      name: 'IDX_document_templates_code',
      columnNames: ['code'],
    }));

    await queryRunner.createIndex('document_templates', new TableIndex({
      name: 'IDX_document_templates_group_id',
      columnNames: ['group_id'],
    }));

    await queryRunner.createIndex('document_templates', new TableIndex({
      name: 'IDX_document_templates_deleted_at',
      columnNames: ['deleted_at'],
    }));

    await queryRunner.createForeignKey('document_templates', new TableForeignKey({
      name: 'FK_document_templates_group',
      columnNames: ['group_id'],
      referencedTableName: 'groups',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
    }));

    await queryRunner.createForeignKey('document_templates', new TableForeignKey({
      name: 'FK_document_templates_created_by',
      columnNames: ['created_by'],
      referencedTableName: 'users',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('document_templates');
  }
}

