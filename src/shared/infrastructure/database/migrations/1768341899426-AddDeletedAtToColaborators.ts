import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDeletedAtToColaborators1768341899426 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'colaborators',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamp',
        isNullable: true,
        default: null,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('colaborators', 'deleted_at');
  }

}
