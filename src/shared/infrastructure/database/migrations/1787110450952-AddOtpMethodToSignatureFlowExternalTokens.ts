import { Table, TableColumn } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

const TABLE = 'signature_flow_external_tokens';

export class AddOtpMethodToSignatureFlowExternalTokens1787110450952 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable(TABLE))) {
      await queryRunner.createTable(new Table({
        name: TABLE,
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid' },
          { name: 'participant_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'token', type: 'varchar', length: '64', isNullable: false },
          { name: 'expires_at', type: 'timestamp', isNullable: false },
          { name: 'otp_hash', type: 'varchar', length: '255', isNullable: true },
          { name: 'otp_expires_at', type: 'timestamp', isNullable: true },
          { name: 'otp_attempts', type: 'int', isNullable: false, default: 0 },
          {
            name: 'otp_method',
            type: 'varchar',
            length: '10',
            isNullable: true,
            comment: 'email | sms — canal usado para enviar el código al firmante externo',
          },
          { name: 'used_at', type: 'timestamp', isNullable: true },
          { name: 'signature_token_hash', type: 'varchar', length: '255', isNullable: true },
          { name: 'ip_address', type: 'varchar', length: '100', isNullable: true },
          { name: 'document_number', type: 'varchar', length: '50', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
        ],
        foreignKeys: [
          {
            name: 'FK_signature_flow_external_tokens_participant_id',
            columnNames: ['participant_id'],
            referencedTableName: 'signature_flow_participants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
        ],
        indices: [
          { name: 'IDX_sfet_token', columnNames: ['token'], isUnique: true },
          { name: 'IDX_sfet_participant_id', columnNames: ['participant_id'], isUnique: true },
        ],
      }));
      return;
    }

    if (!(await queryRunner.hasColumn(TABLE, 'otp_method'))) {
      await queryRunner.addColumn(TABLE, new TableColumn({
        name: 'otp_method',
        type: 'varchar',
        length: '10',
        isNullable: true,
        comment: 'email | sms — canal usado para enviar el código al firmante externo',
      }));
    }
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable(TABLE))) return;
    if (await queryRunner.hasColumn(TABLE, 'otp_method')) {
      await queryRunner.dropColumn(TABLE, 'otp_method');
    }
  }
}
