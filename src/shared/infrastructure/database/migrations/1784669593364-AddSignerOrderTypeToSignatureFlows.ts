import { TableColumn } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddSignerOrderTypeToSignatureFlows1784669593364 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.addColumn('signature_flows', new TableColumn({
      name: 'signer_order_type',
      type: 'varchar',
      length: '20',
      isNullable: false,
      default: "'parallel'",
      comment: 'Orden de firma para los firmantes (sequential | parallel), independiente del orden de los validadores',
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropColumn('signature_flows', 'signer_order_type');
  }
}
