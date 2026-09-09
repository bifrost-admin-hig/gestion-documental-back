import { Table, TableColumn } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

const SIGNATURES_TABLE = 'signatures';
const EXTERNAL_TOKENS_TABLE = 'signature_flow_external_tokens';
const USER_SIGNATURES_TABLE = 'user_signatures';

export class AddSignatureImageAndUserSignaturesTable1788219931256 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn(SIGNATURES_TABLE, 'signature_image_file_id'))) {
      await queryRunner.addColumn(SIGNATURES_TABLE, new TableColumn({
        name: 'signature_image_file_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
        comment: 'Referencia a files.id con la imagen de la firma dibujada por el firmante',
      }));
    }

    if (!(await queryRunner.hasColumn(EXTERNAL_TOKENS_TABLE, 'signature_image_file_id'))) {
      await queryRunner.addColumn(EXTERNAL_TOKENS_TABLE, new TableColumn({
        name: 'signature_image_file_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
        comment: 'Referencia a files.id con la imagen de la firma dibujada por el firmante externo',
      }));
    }

    if (!(await queryRunner.hasTable(USER_SIGNATURES_TABLE))) {
      await queryRunner.createTable(new Table({
        name: USER_SIGNATURES_TABLE,
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid' },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
            comment: 'Firma guardada de un usuario interno. Mutuamente excluyente con colaborator_id.',
          },
          {
            name: 'colaborator_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
            comment: 'Firma guardada de un colaborador (firmante externo vinculado). Mutuamente excluyente con user_id.',
          },
          { name: 'file_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            name: 'FK_user_signatures_user_id',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          {
            name: 'FK_user_signatures_colaborator_id',
            columnNames: ['colaborator_id'],
            referencedTableName: 'colaborators',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          {
            name: 'FK_user_signatures_file_id',
            columnNames: ['file_id'],
            referencedTableName: 'files',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
        ],
        indices: [
          { name: 'IDX_user_signatures_user_id', columnNames: ['user_id'], isUnique: true },
          { name: 'IDX_user_signatures_colaborator_id', columnNames: ['colaborator_id'], isUnique: true },
        ],
      }));
    }
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    if (await queryRunner.hasTable(USER_SIGNATURES_TABLE)) {
      await queryRunner.dropTable(USER_SIGNATURES_TABLE);
    }
    if (await queryRunner.hasColumn(EXTERNAL_TOKENS_TABLE, 'signature_image_file_id')) {
      await queryRunner.dropColumn(EXTERNAL_TOKENS_TABLE, 'signature_image_file_id');
    }
    if (await queryRunner.hasColumn(SIGNATURES_TABLE, 'signature_image_file_id')) {
      await queryRunner.dropColumn(SIGNATURES_TABLE, 'signature_image_file_id');
    }
  }
}
