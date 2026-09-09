import { Table } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateSignatureFlowNotificationsTable1787000827041 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'signature_flow_notifications',
      columns: [
        { name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid' },
        { name: 'participant_id', type: 'varchar', length: '36', isNullable: false },
        { name: 'flow_id', type: 'varchar', length: '36', isNullable: false },
        { name: 'email_job_id', type: 'varchar', length: '36', isNullable: true },
        { name: 'type', type: 'varchar', length: '20', isNullable: false, default: "'initial'" },
        { name: 'triggered_by', type: 'varchar', length: '36', isNullable: true },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', isNullable: false },
      ],
      foreignKeys: [
        {
          name: 'FK_signature_flow_notifications_participant_id',
          columnNames: ['participant_id'],
          referencedTableName: 'signature_flow_participants',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        {
          name: 'FK_signature_flow_notifications_flow_id',
          columnNames: ['flow_id'],
          referencedTableName: 'signature_flows',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        {
          name: 'FK_signature_flow_notifications_email_job_id',
          columnNames: ['email_job_id'],
          referencedTableName: 'email_jobs',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        {
          name: 'FK_signature_flow_notifications_triggered_by',
          columnNames: ['triggered_by'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
      ],
      indices: [
        { name: 'IDX_signature_flow_notifications_participant_id', columnNames: ['participant_id'] },
        { name: 'IDX_signature_flow_notifications_flow_id', columnNames: ['flow_id'] },
      ],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('signature_flow_notifications');
  }
}
