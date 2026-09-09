import { Table } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateUsersTable1696269600000 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'users',
      columns: [
        {
          name: 'id',
          type: 'varchar',
          length: '36',
          isPrimary: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'email',
          type: 'varchar',
          length: '255',
          isUnique: true,
          isNullable: false,
        },
        {
          name: 'first_name',
          type: 'varchar',
          length: '100',
          isNullable: false,
        },
        {
          name: 'last_name',
          type: 'varchar',
          length: '100',
          isNullable: false,
        },
        {
          name: 'password',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'status',
          type: 'enum',
          enum: ['active', 'inactive', 'suspended', 'pending'],
          default: "'active'",
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
        {
          name: 'deleted_at',
          type: 'datetime',
          isNullable: true,
        },
      ],
      indices: [
        {
          name: 'IDX_USERS_EMAIL',
          columnNames: ['email'],
          isUnique: true,
        },
        {
          name: 'IDX_USERS_STATUS',
          columnNames: ['status'],
        },
      ],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
