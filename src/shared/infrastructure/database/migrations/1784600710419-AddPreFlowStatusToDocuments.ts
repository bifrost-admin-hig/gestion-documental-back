import { TableColumn, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddPreFlowStatusToDocuments1784600710419 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.addColumn('documents', new TableColumn({
      name: 'pre_flow_status',
      type: 'varchar',
      length: '50',
      isNullable: true,
      default: null,
      comment: 'Snapshot del status (draft/uploaded/approved) previo a entrar a un flujo de firma, para restaurarlo si el flujo es rechazado',
    }));

    await queryRunner.createIndex('documents', new TableIndex({
      name: 'IDX_documents_pre_flow_status',
      columnNames: ['pre_flow_status'],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropColumn('documents', 'pre_flow_status');
  }
}
