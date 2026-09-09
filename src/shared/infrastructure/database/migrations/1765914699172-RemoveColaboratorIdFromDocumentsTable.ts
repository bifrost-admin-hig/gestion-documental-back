import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class RemoveColaboratorIdFromDocumentsTable1765914699172 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key constraint for colaboratorId
    await queryRunner.dropForeignKey('documents', 'FK_DOCUMENTS_COLABORATOR');

    // Drop the colaboratorId column
    await queryRunner.dropColumn('documents', 'colaborator_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the colaboratorId column
    await queryRunner.addColumn(
      'documents',
      new TableColumn({
        name: 'colaborator_id',
        type: 'varchar',
        length: '36',
        isNullable: false,
      }),
    );

    // Add back the foreign key constraint
    await queryRunner.createForeignKey(
      'documents',
      new TableForeignKey({
        name: 'FK_DOCUMENTS_COLABORATOR',
        columnNames: ['colaborator_id'],
        referencedTableName: 'colaborators',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }
}
