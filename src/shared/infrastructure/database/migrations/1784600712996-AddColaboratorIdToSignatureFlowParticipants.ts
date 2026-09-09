import { TableColumn, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddColaboratorIdToSignatureFlowParticipants1784600712996 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.addColumn('signature_flow_participants', new TableColumn({
      name: 'colaborator_id',
      type: 'varchar',
      length: '36',
      isNullable: true,
      comment: 'Colaborador sin usuario en la plataforma que participa como si fuera externo (token + OTP), pero con relación real en BD',
    }));

    await queryRunner.createForeignKey(
      'signature_flow_participants',
      new TableForeignKey({
        name: 'FK_signature_flow_participants_colaborator_id',
        columnNames: ['colaborator_id'],
        referencedTableName: 'colaborators',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'signature_flow_participants',
      new TableIndex({
        name: 'IDX_signature_flow_participants_colaborator_id',
        columnNames: ['colaborator_id'],
      }),
    );
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('signature_flow_participants', 'FK_signature_flow_participants_colaborator_id');
    await queryRunner.dropColumn('signature_flow_participants', 'colaborator_id');
  }
}
