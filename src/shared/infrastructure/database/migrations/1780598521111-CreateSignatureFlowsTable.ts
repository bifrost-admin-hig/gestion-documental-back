import { Table, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateSignatureFlowsTable1780598521111 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'signature_flows',
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
            name: 'order_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'sequential'",
            comment: 'sequential | parallel',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'draft'",
            comment: 'draft | in_review | in_signing | signed | rejected',
          },
          {
            name: 'sent_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sent_by',
            type: 'varchar',
            length: '36',
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
    );

    await queryRunner.createForeignKey(
      'signature_flows',
      new TableForeignKey({
        name: 'FK_signature_flows_document_id',
        columnNames: ['document_id'],
        referencedTableName: 'documents',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'signature_flows',
      new TableForeignKey({
        name: 'FK_signature_flows_sent_by',
        columnNames: ['sent_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'signature_flows',
      new TableIndex({
        name: 'IDX_signature_flows_document_id',
        columnNames: ['document_id'],
      }),
    );

    await queryRunner.createIndex(
      'signature_flows',
      new TableIndex({
        name: 'IDX_signature_flows_status',
        columnNames: ['status'],
      }),
    );
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('signature_flows');
  }
}

