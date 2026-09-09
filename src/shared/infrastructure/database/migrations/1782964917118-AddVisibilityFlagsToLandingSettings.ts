import { TableColumn } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddVisibilityFlagsToLandingSettings1782964917118 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.addColumn('landing_settings', [
      new TableColumn({
        name: 'show_phone',
        type: 'boolean',
        isNullable: false,
        default: true,
      }),
      new TableColumn({
        name: 'show_email',
        type: 'boolean',
        isNullable: false,
        default: true,
      }),
      new TableColumn({
        name: 'show_address',
        type: 'boolean',
        isNullable: false,
        default: true,
      }),
    ]);
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropColumn('landing_settings', ['show_phone', 'show_email', 'show_address']);
  }
}
