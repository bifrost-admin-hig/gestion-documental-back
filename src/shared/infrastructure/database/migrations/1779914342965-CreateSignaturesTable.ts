import { Table, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateSignaturesTable1779914342965 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'signatures',
      columns: [
        {
          name: 'id',
          type: 'varchar',
          length: '36',
          isPrimary: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'document_id',
          type: 'varchar',
          length: '36',
          isNullable: false,
        },
        {
          name: 'user_id',
          type: 'varchar',
          length: '36',
          isNullable: false,
        },
        {
          name: 'signature_type',
          type: 'varchar',
          length: '50',
          isNullable: false,
          default: "'simple'",
        },
        {
          name: 'signature_method',
          type: 'varchar',
          length: '50',
          isNullable: false,
          default: "'email'",
        },
        {
          name: 'status',
          type: 'varchar',
          length: '50',
          isNullable: false,
          default: "'pending'",
        },
        {
          name: 'token_hash',
          type: 'varchar',
          length: '255',
          isNullable: true,
        },
        {
          name: 'ip_address',
          type: 'varchar',
          length: '45',
          isNullable: true,
        },
        {
          name: 'rejection_reason',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'rejection_code',
          type: 'varchar',
          length: '50',
          isNullable: true,
        },
        {
          name: 'signed_at',
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
    }));

    await queryRunner.createForeignKey('signatures', new TableForeignKey({
      name: 'FK_signatures_document_id',
      columnNames: ['document_id'],
      referencedTableName: 'documents',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    }));

    await queryRunner.createForeignKey('signatures', new TableForeignKey({
      name: 'FK_signatures_user_id',
      columnNames: ['user_id'],
      referencedTableName: 'users',
      referencedColumnNames: ['id'],
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }));

    await queryRunner.createIndex('signatures', new TableIndex({
      name: 'IDX_signatures_document_id',
      columnNames: ['document_id'],
    }));

    await queryRunner.createIndex('signatures', new TableIndex({
      name: 'IDX_signatures_user_id',
      columnNames: ['user_id'],
    }));

    await queryRunner.createIndex('signatures', new TableIndex({
      name: 'IDX_signatures_status',
      columnNames: ['status'],
    }));

    await queryRunner.createIndex('signatures', new TableIndex({
      name: 'IDX_signatures_token_hash',
      columnNames: ['token_hash'],
      isUnique: true,
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('signatures');
  }
}

