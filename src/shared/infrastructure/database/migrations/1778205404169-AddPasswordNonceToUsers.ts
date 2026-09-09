import { TableColumn } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddPasswordNonceToUsers1778205404169 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.addColumn('users', new TableColumn({
      name: 'password_nonce',
      type: 'varchar',
      length: '36',
      isNullable: true,
      default: null,
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'password_nonce');
  }
}

