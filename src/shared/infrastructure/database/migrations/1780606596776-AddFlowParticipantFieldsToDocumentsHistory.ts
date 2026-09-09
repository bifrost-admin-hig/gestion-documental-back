import { TableColumn, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddFlowParticipantFieldsToDocumentsHistory1780606596776 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.addColumn('documents_history', new TableColumn({
      name: 'flow_participant_id',
      type: 'varchar',
      length: '36',
      isNullable: true,
    }));

    await queryRunner.addColumn('documents_history', new TableColumn({
      name: 'action_comment',
      type: 'text',
      isNullable: true,
    }));

    await queryRunner.createForeignKey('documents_history', new TableForeignKey({
      name: 'FK_documents_history_flow_participant_id',
      columnNames: ['flow_participant_id'],
      referencedTableName: 'signature_flow_participants',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    }));

    await queryRunner.createIndex('documents_history', new TableIndex({
      name: 'IDX_documents_history_flow_participant_id',
      columnNames: ['flow_participant_id'],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropIndex('documents_history', 'IDX_documents_history_flow_participant_id');
    await queryRunner.dropForeignKey('documents_history', 'FK_documents_history_flow_participant_id');
    await queryRunner.dropColumn('documents_history', 'flow_participant_id');
    await queryRunner.dropColumn('documents_history', 'action_comment');
  }
}

