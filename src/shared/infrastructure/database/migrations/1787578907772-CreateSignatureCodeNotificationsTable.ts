import { Table, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateSignatureCodeNotificationsTable1787578907772 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'signature_code_notifications',
      columns: [
        {
          name: 'id',
          type: 'varchar',
          length: '36',
          isPrimary: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'signature_id',
          type: 'varchar',
          length: '36',
          isNullable: true,
        },
        {
          name: 'participant_id',
          type: 'varchar',
          length: '36',
          isNullable: true,
        },
        {
          name: 'channel',
          type: 'varchar',
          length: '10',
          isNullable: false,
        },
        {
          name: 'recipient',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'subject',
          type: 'varchar',
          length: '255',
          isNullable: true,
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
          name: 'sent_at',
          type: 'timestamp',
          isNullable: false,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
      ],
    }));

    await queryRunner.createForeignKey('signature_code_notifications', new TableForeignKey({
      name: 'FK_signature_code_notifications_signature_id',
      columnNames: ['signature_id'],
      referencedTableName: 'signatures',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    }));

    await queryRunner.createForeignKey('signature_code_notifications', new TableForeignKey({
      name: 'FK_signature_code_notifications_participant_id',
      columnNames: ['participant_id'],
      referencedTableName: 'signature_flow_participants',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    }));

    await queryRunner.createIndex('signature_code_notifications', new TableIndex({
      name: 'IDX_signature_code_notifications_signature_id',
      columnNames: ['signature_id'],
    }));

    await queryRunner.createIndex('signature_code_notifications', new TableIndex({
      name: 'IDX_signature_code_notifications_participant_id',
      columnNames: ['participant_id'],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('signature_code_notifications');
  }
}
