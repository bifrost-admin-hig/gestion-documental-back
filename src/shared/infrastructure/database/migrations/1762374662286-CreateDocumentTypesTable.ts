import { Table } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateDocumentTypesTable1762374662286 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'document_types',
      columns: [
        {
          name: 'id',
          type: 'varchar',
          length: '36',
          isPrimary: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'name',
          type: 'varchar',
          length: '100',
          isUnique: true,
          isNullable: false,
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
      indices: [
        {
          name: 'IDX_DOCUMENT_TYPES_NAME',
          columnNames: ['name'],
          isUnique: true,
        },
      ],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('document_types');
  }
}
