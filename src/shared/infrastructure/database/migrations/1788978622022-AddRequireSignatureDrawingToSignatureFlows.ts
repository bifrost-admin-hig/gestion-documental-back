import { TableColumn } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

const SIGNATURE_FLOWS_TABLE = 'signature_flows';

export class AddRequireSignatureDrawingToSignatureFlows1788978622022 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn(SIGNATURE_FLOWS_TABLE, 'require_signature_drawing'))) {
      await queryRunner.addColumn(SIGNATURE_FLOWS_TABLE, new TableColumn({
        name: 'require_signature_drawing',
        type: 'boolean',
        default: true,
        isNullable: false,
        comment: 'Si es false, los firmantes de este flujo solo validan con OTP: no dibujan firma ni se estampa el recuadro en el PDF.',
      }));
    }
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    if (await queryRunner.hasColumn(SIGNATURE_FLOWS_TABLE, 'require_signature_drawing')) {
      await queryRunner.dropColumn(SIGNATURE_FLOWS_TABLE, 'require_signature_drawing');
    }
  }
}
