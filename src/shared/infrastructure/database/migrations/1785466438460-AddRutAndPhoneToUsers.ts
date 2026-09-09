import { TableColumn } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddRutAndPhoneToUsers1785466438460 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.addColumn('users', [
      new TableColumn({
        name: 'rut',
        type: 'varchar',
        length: '12',
        isNullable: true,
        default: null,
      }),
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        length: '20',
        isNullable: true,
        default: null,
      }),
    ]);
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', ['rut', 'phone']);
  }
}
