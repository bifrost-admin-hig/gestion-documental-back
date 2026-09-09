import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFileSharesTable1774395953472 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'file_shares',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'token',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'file_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'max_access',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'access_count',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'revoked_at',
            type: 'timestamp',
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
      }),
      true,
    );

    await queryRunner.createIndex(
      'file_shares',
      new TableIndex({
        name: 'IDX_file_shares_token',
        columnNames: ['token'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('file_shares');
  }
}

