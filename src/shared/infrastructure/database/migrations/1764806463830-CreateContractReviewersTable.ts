import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateContractReviewersTable1764806463830 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contract_reviewers',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'contract_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'is_primary',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'valid_until',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['contract_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'contracts',
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_CONTRACT_REVIEWERS_USER_ID',
            columnNames: ['user_id'],
          },
          {
            name: 'IDX_CONTRACT_REVIEWERS_CONTRACT_ID',
            columnNames: ['contract_id'],
          },
          {
            name: 'IDX_CONTRACT_REVIEWERS_USER_CONTRACT',
            columnNames: ['user_id', 'contract_id'],
            isUnique: true,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('contract_reviewers');
  }

}
