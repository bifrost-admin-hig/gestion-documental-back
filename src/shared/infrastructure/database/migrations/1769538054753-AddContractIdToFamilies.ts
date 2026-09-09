import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddContractIdToFamilies1769538054753 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.getTable('families').then(async (table) => {
      if (table && !table?.columns.some((col) => col.name === 'contract_id')) {
        // Add contract_id column to families table
        await queryRunner.addColumn('families', new TableColumn({
          name: 'contract_id',
          type: 'varchar',
          length: '36',
          isNullable: false,
        }));

        // Create index on families.contract_id
        await queryRunner.createIndex('families', new TableIndex({
          name: 'IDX_families_contract_id',
          columnNames: ['contract_id'],
        }));

        // Create foreign key from families to contracts
        await queryRunner.createForeignKey('families', new TableForeignKey({
          columnNames: ['contract_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'contracts',
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }));
      }
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.getTable('families').then(async (table) => {
      const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf('contract_id') !== -1);
      if (foreignKey) await queryRunner.dropForeignKey('families', foreignKey);

      if (table?.indices.some((idx) => idx.name === 'IDX_families_contract_id')) {
        await queryRunner.dropIndex('families', 'IDX_families_contract_id');
      }

      if (table?.columns.some((col) => col.name === 'contract_id')) {
        await queryRunner.dropColumn('families', 'contract_id');
      }
    });
  }
}
