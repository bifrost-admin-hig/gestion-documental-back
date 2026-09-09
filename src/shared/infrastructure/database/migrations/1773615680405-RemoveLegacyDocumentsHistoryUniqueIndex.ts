import { TableForeignKey, TableIndex } from 'typeorm';
import { IQueryRunner, ImprovedRunner } from '../runner';

export class RemoveLegacyDocumentsHistoryUniqueIndex1773615680405 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    const tableName = 'documents_history';
    const legacyIndexName = 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT';
    const contractForeignKeyName = 'FK_DOCUMENTS_HISTORY_CONTRACT';

    if (!(await queryRunner.hasIndex(tableName, legacyIndexName))) {
      return;
    }

    try {
      await queryRunner.dropIndex(tableName, legacyIndexName);
    } catch (error: any) {
      const message = String(error?.message ?? '').toLowerCase();
      if (!message.includes('foreign key')) {
        throw error;
      }

      if (await queryRunner.hasForeignKey(tableName, contractForeignKeyName)) {
        await queryRunner.dropForeignKey(tableName, contractForeignKeyName);
      }

      await queryRunner.dropIndex(tableName, legacyIndexName);

      await queryRunner.createForeignKey(tableName, new TableForeignKey({
        name: contractForeignKeyName,
        columnNames: ['contract_id'],
        referencedTableName: 'contracts',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }));
    }

    if (!(await queryRunner.hasIndex(tableName, 'IDX_DOCUMENTS_HISTORY_CONTRACT'))) {
      await queryRunner.createIndex(tableName, new TableIndex({
        name: 'IDX_DOCUMENTS_HISTORY_CONTRACT',
        columnNames: ['contract_id'],
      }));
    }
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    const tableName = 'documents_history';
    const legacyIndexName = 'IDX_DOCUMENTS_TYPE_SUBTYPE_CONTRACT';

    if (await queryRunner.hasIndex(tableName, 'IDX_DOCUMENTS_HISTORY_CONTRACT')) {
      await queryRunner.dropIndex(tableName, 'IDX_DOCUMENTS_HISTORY_CONTRACT');
    }

    if (!(await queryRunner.hasIndex(tableName, legacyIndexName))) {
      await queryRunner.createIndex(tableName, new TableIndex({
        name: legacyIndexName,
        columnNames: ['contract_id'],
        isUnique: true,
      }));
    }
  }
}
