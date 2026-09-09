import { TableColumn } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

const SIGNATURES_TABLE = 'signatures';
const EXTERNAL_TOKENS_TABLE = 'signature_flow_external_tokens';

export class AddSignerTimezoneToSignaturesAndExternalTokens1787925557212 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn(SIGNATURES_TABLE, 'signer_timezone'))) {
      await queryRunner.addColumn(SIGNATURES_TABLE, new TableColumn({
        name: 'signer_timezone',
        type: 'varchar',
        length: '64',
        isNullable: true,
        comment: 'Zona horaria IANA del firmante, capturada desde el navegador al firmar',
      }));
    }

    if (!(await queryRunner.hasColumn(EXTERNAL_TOKENS_TABLE, 'timezone'))) {
      await queryRunner.addColumn(EXTERNAL_TOKENS_TABLE, new TableColumn({
        name: 'timezone',
        type: 'varchar',
        length: '64',
        isNullable: true,
        comment: 'Zona horaria IANA del firmante externo, capturada desde el navegador al firmar',
      }));
    }
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    if (await queryRunner.hasColumn(SIGNATURES_TABLE, 'signer_timezone')) {
      await queryRunner.dropColumn(SIGNATURES_TABLE, 'signer_timezone');
    }
    if (await queryRunner.hasColumn(EXTERNAL_TOKENS_TABLE, 'timezone')) {
      await queryRunner.dropColumn(EXTERNAL_TOKENS_TABLE, 'timezone');
    }
  }
}
