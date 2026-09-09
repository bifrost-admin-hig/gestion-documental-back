import { TableColumn, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddSignatureStatusToDocuments1779915126905 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.addColumn('documents', new TableColumn({
      name: 'signature_status',
      type: 'varchar',
      length: '50',
      isNullable: true,
      default: null,
    }));

    await queryRunner.createIndex('documents', new TableIndex({
      name: 'IDX_documents_signature_status',
      columnNames: ['signature_status'],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropColumn('documents', 'signature_status');
  }
}

