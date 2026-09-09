import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddGroupIdToEntities1769034343023 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add group_id column to colaborators
    await queryRunner.getTable('colaborators').then(async (table) => {
      if (table && !table.columns.some((col) => col.name === 'group_id')) {
        await queryRunner.addColumn('colaborators', new TableColumn({
          name: 'group_id',
          type: 'integer',
          isNullable: false,
          default: 1,
        }));

        // Create index on colaborators.group_id
        await queryRunner.createIndex('colaborators', new TableIndex({
          name: 'IDX_colaborators_group_id',
          columnNames: ['group_id'],
        }));
      }
    });

    // Add group_id column to documents
    await queryRunner.getTable('documents').then(async (table) => {
      if (table && !table.columns.some((col) => col.name === 'group_id')) {
        await queryRunner.addColumn('documents', new TableColumn({
          name: 'group_id',
          type: 'integer',
          isNullable: false,
          default: 1,
        }));

        // Create index on documents.group_id
        await queryRunner.createIndex('documents', new TableIndex({
          name: 'IDX_documents_group_id',
          columnNames: ['group_id'],
        }));
      }
    });

    // Add group_id column to contracts
    await queryRunner.getTable('contracts').then(async (table) => {
      if (table && !table.columns.some((col) => col.name === 'group_id')) {
        await queryRunner.addColumn('contracts', new TableColumn({
          name: 'group_id',
          type: 'integer',
          isNullable: false,
          default: 1,
        }));

        // Create index on contracts.group_id
        await queryRunner.createIndex('contracts', new TableIndex({
          name: 'IDX_contracts_group_id',
          columnNames: ['group_id'],
        }));
      }
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index and column from contracts table
    await queryRunner.getTable('contracts').then(async (table) => {
      if (table?.indices.some((i) => i.name === 'IDX_contracts_group_id')) {
        await queryRunner.dropIndex('contracts', 'IDX_contracts_group_id');
      }
      if (table?.columns.some((col) => col.name === 'group_id')) {
        await queryRunner.dropColumn('contracts', 'group_id');
      }
    });

    // Drop index and column from documents table
    await queryRunner.getTable('documents').then(async (table) => {
      if (table?.indices.some((i) => i.name === 'IDX_documents_group_id')) {
        await queryRunner.dropIndex('documents', 'IDX_documents_group_id');
      }
      if (table?.columns.some((col) => col.name === 'group_id')) {
        await queryRunner.dropColumn('documents', 'group_id');
      }
    });

    // Drop index and column from colaborators table
    await queryRunner.getTable('colaborators').then(async (table) => {
      if (table?.indices.some((i) => i.name === 'IDX_colaborators_group_id')) {
        await queryRunner.dropIndex('colaborators', 'IDX_colaborators_group_id');
      }
      if (table?.columns.some((col) => col.name === 'group_id')) {
        await queryRunner.dropColumn('colaborators', 'group_id');
      }
    });
  }
}
