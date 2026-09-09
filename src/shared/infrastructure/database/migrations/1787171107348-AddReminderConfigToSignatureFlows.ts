import { TableColumn } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddReminderConfigToSignatureFlows1787171107348 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.addColumn('signature_flows', new TableColumn({
      name: 'reminder_enabled',
      type: 'boolean',
      isNullable: false,
      default: false,
    }));

    await queryRunner.addColumn('signature_flows', new TableColumn({
      name: 'reminder_interval_minutes',
      type: 'int',
      isNullable: false,
      default: 1440,
      comment: '1440 = 1 día',
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropColumn('signature_flows', 'reminder_enabled');
    await queryRunner.dropColumn('signature_flows', 'reminder_interval_minutes');
  }
}
