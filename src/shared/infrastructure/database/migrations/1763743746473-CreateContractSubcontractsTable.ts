import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateContractSubcontractsTable1763743746473 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contract_subcontracts',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'contract_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'subcontract_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create foreign key for contract_id
    await queryRunner.createForeignKey(
      'contract_subcontracts',
      new TableForeignKey({
        columnNames: ['contract_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'contracts',
        onDelete: 'CASCADE',
        name: 'FK_CONTRACT_SUBCONTRACTS_CONTRACT',
      }),
    );

    // Create foreign key for subcontract_id
    await queryRunner.createForeignKey(
      'contract_subcontracts',
      new TableForeignKey({
        columnNames: ['subcontract_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'contracts',
        onDelete: 'CASCADE',
        name: 'FK_CONTRACT_SUBCONTRACTS_SUBCONTRACT',
      }),
    );

    // Create unique index to prevent duplicate relationships
    await queryRunner.createIndex(
      'contract_subcontracts',
      new TableIndex({
        name: 'IDX_CONTRACT_SUBCONTRACT_UNIQUE',
        columnNames: ['contract_id', 'subcontract_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('contract_subcontracts');
  }
}
