import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateDocumentsHistoryTable1764018152780 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create documents_history table
    await queryRunner.createTable(
      new Table({
        name: 'documents_history',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'document_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'colaborator_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'issued_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'expiration_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'contract_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'document_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'updated_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    const tableAfterCreate = await queryRunner.getTable('documents_history');
    const hasFkDoc = tableAfterCreate?.foreignKeys.some(f => f.name === 'FK_DOCUMENTS_HISTORY_DOCUMENT' || f.columnNames.includes('document_id'));
    if (!hasFkDoc) {
      await queryRunner.createForeignKey(
        'documents_history',
        new TableForeignKey({
          name: 'FK_DOCUMENTS_HISTORY_DOCUMENT',
          columnNames: ['document_id'],
          referencedTableName: 'documents',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      );
    }

    // Create foreign key for colaborator_id
    const hasFkColaborator = tableAfterCreate?.foreignKeys.some(f => f.name === 'FK_DOCUMENTS_HISTORY_COLABORATOR' || f.columnNames.includes('colaborator_id'));
    if (!hasFkColaborator) {
      await queryRunner.createForeignKey(
        'documents_history',
        new TableForeignKey({
          name: 'FK_DOCUMENTS_HISTORY_COLABORATOR',
          columnNames: ['colaborator_id'],
          referencedTableName: 'colaborators',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }

    // Create foreign key for contract_id (nullable)
    const hasFkContract = tableAfterCreate?.foreignKeys.some(f => f.name === 'FK_DOCUMENTS_HISTORY_CONTRACT' || f.columnNames.includes('contract_id'));
    if (!hasFkContract) {
      await queryRunner.createForeignKey(
        'documents_history',
        new TableForeignKey({
          name: 'FK_DOCUMENTS_HISTORY_CONTRACT',
          columnNames: ['contract_id'],
          referencedTableName: 'contracts',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        }),
      );
    }

    // Create foreign key for updated_by
    const hasFkUpdatedBy = tableAfterCreate?.foreignKeys.some(f => f.name === 'FK_DOCUMENTS_HISTORY_UPDATED_BY' || f.columnNames.includes('updated_by'));
    if (!hasFkUpdatedBy) {
      await queryRunner.createForeignKey(
        'documents_history',
        new TableForeignKey({
          name: 'FK_DOCUMENTS_HISTORY_UPDATED_BY',
          columnNames: ['updated_by'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }

    // Create indices
    const historyTable = await queryRunner.getTable('documents_history');
    const hasIdxDoc = historyTable?.indices.some(i => i.name === 'IDX_DOCUMENTS_HISTORY_DOCUMENT');
    if (!hasIdxDoc) {
      await queryRunner.createIndex(
        'documents_history',
        new TableIndex({
          name: 'IDX_DOCUMENTS_HISTORY_DOCUMENT',
          columnNames: ['document_id'],
        }),
      ).catch(() => { });
    }

    const hasIdxAction = historyTable?.indices.some(i => i.name === 'IDX_DOCUMENTS_HISTORY_ACTION');
    if (!hasIdxAction) {
      await queryRunner.createIndex(
        'documents_history',
        new TableIndex({
          name: 'IDX_DOCUMENTS_HISTORY_ACTION',
          columnNames: ['action'],
        }),
      ).catch(() => { });
    }

    const hasIdxUpdatedBy = historyTable?.indices.some(i => i.name === 'IDX_DOCUMENTS_HISTORY_UPDATED_BY');
    if (!hasIdxUpdatedBy) {
      await queryRunner.createIndex(
        'documents_history',
        new TableIndex({
          name: 'IDX_DOCUMENTS_HISTORY_UPDATED_BY',
          columnNames: ['updated_by'],
        }),
      ).catch(() => { });
    }

    const hasIdxStatus = historyTable?.indices.some(i => i.name === 'IDX_DOCUMENTS_HISTORY_STATUS');
    if (!hasIdxStatus) {
      await queryRunner.createIndex(
        'documents_history',
        new TableIndex({
          name: 'IDX_DOCUMENTS_HISTORY_STATUS',
          columnNames: ['status'],
        }),
      ).catch(() => { });
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('documents_history');

    // Drop foreign keys (idempotente)
    if (table) {
      const fkUpdatedBy = table.foreignKeys.find(f => f.name === 'FK_DOCUMENTS_HISTORY_UPDATED_BY' || f.columnNames.includes('updated_by'));
      if (fkUpdatedBy) await queryRunner.dropForeignKey('documents_history', fkUpdatedBy);
      const fkContract = table.foreignKeys.find(f => f.name === 'FK_DOCUMENTS_HISTORY_CONTRACT' || f.columnNames.includes('contract_id'));
      if (fkContract) await queryRunner.dropForeignKey('documents_history', fkContract);
      const fkColaborator = table.foreignKeys.find(f => f.name === 'FK_DOCUMENTS_HISTORY_COLABORATOR' || f.columnNames.includes('colaborator_id'));
      if (fkColaborator) await queryRunner.dropForeignKey('documents_history', fkColaborator);
      const fkDocument = table.foreignKeys.find(f => f.name === 'FK_DOCUMENTS_HISTORY_DOCUMENT' || f.columnNames.includes('document_id'));
      if (fkDocument) await queryRunner.dropForeignKey('documents_history', fkDocument);

      // Drop indices (idempotente)
      if (table.indices.find(i => i.name === 'IDX_DOCUMENTS_HISTORY_STATUS')) {
        await queryRunner.dropIndex('documents_history', 'IDX_DOCUMENTS_HISTORY_STATUS');
      }
      if (table.indices.find(i => i.name === 'IDX_DOCUMENTS_HISTORY_UPDATED_BY')) {
        await queryRunner.dropIndex('documents_history', 'IDX_DOCUMENTS_HISTORY_UPDATED_BY');
      }
      if (table.indices.find(i => i.name === 'IDX_DOCUMENTS_HISTORY_ACTION')) {
        await queryRunner.dropIndex('documents_history', 'IDX_DOCUMENTS_HISTORY_ACTION');
      }
      if (table.indices.find(i => i.name === 'IDX_DOCUMENTS_HISTORY_DOCUMENT')) {
        await queryRunner.dropIndex('documents_history', 'IDX_DOCUMENTS_HISTORY_DOCUMENT');
      }
    }

    // Drop table
    if (await queryRunner.getTable('documents_history')) {
      await queryRunner.dropTable('documents_history');
    }
  }
}
