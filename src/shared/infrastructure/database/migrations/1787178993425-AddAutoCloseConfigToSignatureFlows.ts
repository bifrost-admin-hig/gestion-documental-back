import { TableColumn } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddAutoCloseConfigToSignatureFlows1787178993425 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.addColumn('signature_flows', new TableColumn({
      name: 'auto_close_enabled',
      type: 'boolean',
      isNullable: false,
      default: false,
    }));

    await queryRunner.addColumn('signature_flows', new TableColumn({
      name: 'auto_close_interval_minutes',
      type: 'int',
      isNullable: false,
      default: 43200,
      comment: '43200 = 30 dias. Minimo permitido: 1440 (1 dia).',
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropColumn('signature_flows', 'auto_close_enabled');
    await queryRunner.dropColumn('signature_flows', 'auto_close_interval_minutes');
  }
}
