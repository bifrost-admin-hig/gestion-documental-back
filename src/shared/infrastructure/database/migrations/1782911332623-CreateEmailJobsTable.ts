import { Table, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateEmailJobsTable1782911332623 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'email_jobs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'to_address',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'subject',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'html_content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'text_content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'retries',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'max_retries',
            type: 'int',
            isNullable: false,
            default: 3,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'next_retry_at',
            type: 'datetime',
            isNullable: false,
          },
          {
            name: 'sent_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'priority',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'correlation_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'group_key',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'email_jobs',
      new TableIndex({
        name: 'IDX_email_jobs_status_retry',
        columnNames: ['status', 'next_retry_at'],
      }),
    );

    await queryRunner.createIndex(
      'email_jobs',
      new TableIndex({
        name: 'IDX_email_jobs_correlation_id',
        columnNames: ['correlation_id'],
      }),
    );

    await queryRunner.createIndex(
      'email_jobs',
      new TableIndex({
        name: 'IDX_email_jobs_group_key',
        columnNames: ['group_key'],
      }),
    );
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('email_jobs');
  }
}
