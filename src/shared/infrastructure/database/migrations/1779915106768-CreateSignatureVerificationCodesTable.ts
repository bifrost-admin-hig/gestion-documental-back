import { Table, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateSignatureVerificationCodesTable1779915106768 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'signature_verification_codes',
      columns: [
        {
          name: 'id',
          type: 'varchar',
          length: '36',
          isPrimary: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'signature_id',
          type: 'varchar',
          length: '36',
          isNullable: false,
        },
        {
          name: 'code_hash',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'attempts',
          type: 'int',
          isNullable: false,
          default: 0,
        },
        {
          name: 'max_attempts',
          type: 'int',
          isNullable: false,
          default: 3,
        },
        {
          name: 'expires_at',
          type: 'timestamp',
          isNullable: false,
        },
        {
          name: 'used_at',
          type: 'timestamp',
          isNullable: true,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
      ],
    }));

    await queryRunner.createForeignKey('signature_verification_codes', new TableForeignKey({
      name: 'FK_signature_verification_codes_signature_id',
      columnNames: ['signature_id'],
      referencedTableName: 'signatures',
      referencedColumnNames: ['id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    }));

    await queryRunner.createIndex('signature_verification_codes', new TableIndex({
      name: 'IDX_signature_verification_codes_signature_id',
      columnNames: ['signature_id'],
    }));

    await queryRunner.createIndex('signature_verification_codes', new TableIndex({
      name: 'IDX_signature_verification_codes_expires_at',
      columnNames: ['expires_at'],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('signature_verification_codes');
  }
}

