import { Table, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateSignatureFlowParticipantsTable1780598526871 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'signature_flow_participants',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'flow_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
            comment: 'Usuario del sistema; null si es participante externo',
          },
          {
            name: 'external_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'external_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: 'signer | validator',
          },
          {
            name: 'order',
            type: 'int',
            isNullable: true,
            comment: 'Posición en el flujo cuando es secuencial',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'pending'",
            comment: 'pending | approved | signed | rejected',
          },
          {
            name: 'action_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'rejection_comment',
            type: 'text',
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
      'signature_flow_participants',
      new TableForeignKey({
        name: 'FK_signature_flow_participants_flow_id',
        columnNames: ['flow_id'],
        referencedTableName: 'signature_flows',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'signature_flow_participants',
      new TableForeignKey({
        name: 'FK_signature_flow_participants_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'signature_flow_participants',
      new TableIndex({
        name: 'IDX_signature_flow_participants_flow_id',
        columnNames: ['flow_id'],
      }),
    );

    await queryRunner.createIndex(
      'signature_flow_participants',
      new TableIndex({
        name: 'IDX_signature_flow_participants_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'signature_flow_participants',
      new TableIndex({
        name: 'IDX_signature_flow_participants_status',
        columnNames: ['status'],
      }),
    );
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('signature_flow_participants');
  }
}

