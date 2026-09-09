import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRequiredColaboratorsCountToDocuments1770230203153 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('documents');
    if (!table || table.findColumnByName('required_colaborators_count')) return;

    await queryRunner.addColumn(
      'documents',
      new TableColumn({
        name: 'required_colaborators_count',
        type: 'int',
        isNullable: false,
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('documents', 'required_colaborators_count');
  }
}
