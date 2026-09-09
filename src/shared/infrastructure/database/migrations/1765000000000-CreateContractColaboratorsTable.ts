import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateContractColaboratorsTable1765000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contract_colaborators',
        columns: [
          {
            name: 'contract_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'colaborator_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'contract_colaborators',
      new TableForeignKey({
        columnNames: ['contract_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'contracts',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'contract_colaborators',
      new TableForeignKey({
        columnNames: ['colaborator_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'colaborators',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('contract_colaborators');
    if (table) {
      const contractForeignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('contract_id') !== -1,
      );
      if (contractForeignKey) {
        await queryRunner.dropForeignKey('contract_colaborators', contractForeignKey);
      }

      const colaboratorForeignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('colaborator_id') !== -1,
      );
      if (colaboratorForeignKey) {
        await queryRunner.dropForeignKey('contract_colaborators', colaboratorForeignKey);
      }
    }
    await queryRunner.dropTable('contract_colaborators');
  }
}
