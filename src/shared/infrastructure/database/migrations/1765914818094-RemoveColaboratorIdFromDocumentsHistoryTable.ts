import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class RemoveColaboratorIdFromDocumentsHistoryTable1765914818094 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key constraint for colaboratorId
    await queryRunner.dropForeignKey('documents_history', 'FK_DOCUMENTS_HISTORY_COLABORATOR');

    // Drop the colaboratorId column
    await queryRunner.dropColumn('documents_history', 'colaborator_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the colaboratorId column
    await queryRunner.addColumn(
      'documents_history',
      new TableColumn({
        name: 'colaborator_id',
        type: 'varchar',
        length: '36',
        isNullable: false,
      }),
    );

    // Add back the foreign key constraint
    await queryRunner.createForeignKey(
      'documents_history',
      new TableForeignKey({
        name: 'FK_DOCUMENTS_HISTORY_COLABORATOR',
        columnNames: ['colaborator_id'],
        referencedTableName: 'colaborators',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }
}
