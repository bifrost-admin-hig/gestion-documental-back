import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddGroupIdToDocumentModelsTables1768985719154 implements MigrationInterface {
  name = 'AddGroupIdToDocumentModelsTables1768985719154';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.getTable('document_models').then(async (table) => {
      if (table && !table?.columns.some((col) => col.name === 'group_id')) {
        await queryRunner.addColumn(
          'document_models',
          new TableColumn({
            name: 'group_id',
            type: 'int',
            isNullable: false,
          }),
        );

        await queryRunner.createForeignKey(
          'document_models',
          new TableForeignKey({
            name: 'FK_DOCUMENT_MODELS_GROUP',
            columnNames: ['group_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'groups',
            onDelete: 'CASCADE',
          }),
        );
      }
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.getTable('document_models').then(async (table) => {
      if (table?.foreignKeys.some((fk) => fk.name === 'FK_DOCUMENT_MODELS_GROUP')) {
        await queryRunner.dropForeignKey('document_models', 'FK_DOCUMENT_MODELS_GROUP');
      }
      if (table?.columns.some((col) => col.name === 'group_id')) {
        await queryRunner.dropColumn('document_models', 'group_id');
      }
    });
  }
}
