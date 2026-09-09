import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDeletedAtToFiles1770755493817 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('files');
    if (!table || table.findColumnByName('deleted_at')) return;

    await queryRunner.addColumn(
      'files',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamp',
        isNullable: true,
        default: null,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('files', 'deleted_at');
  }

}
