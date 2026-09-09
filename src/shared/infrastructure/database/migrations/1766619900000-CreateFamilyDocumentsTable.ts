import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateFamilyDocumentsTable1766619900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'family_documents',
        columns: [
          {
            name: 'family_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'document_model_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        indices: [
          {
            name: 'IDX_FAMILY_DOCUMENTS_FAMILY',
            columnNames: ['family_id'],
          },
          {
            name: 'IDX_FAMILY_DOCUMENTS_MODEL',
            columnNames: ['document_model_id'],
          },
        ],
      }),
      true,
    );

    // Foreign key hacia families
    await queryRunner.createForeignKey(
      'family_documents',
      new TableForeignKey({
        columnNames: ['family_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'families',
        onDelete: 'CASCADE',
        name: 'FK_FAMILY_DOCUMENTS_FAMILY',
      }),
    );

    // Foreign key hacia document_models
    await queryRunner.createForeignKey(
      'family_documents',
      new TableForeignKey({
        columnNames: ['document_model_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'document_models',
        onDelete: 'CASCADE',
        name: 'FK_FAMILY_DOCUMENTS_MODEL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('family_documents');
    if (table) {
      const fkModel = table.foreignKeys.find(fk => fk.name === 'FK_FAMILY_DOCUMENTS_MODEL');
      if (fkModel) await queryRunner.dropForeignKey('family_documents', fkModel);

      const fkFamily = table.foreignKeys.find(fk => fk.name === 'FK_FAMILY_DOCUMENTS_FAMILY');
      if (fkFamily) await queryRunner.dropForeignKey('family_documents', fkFamily);
    }
    await queryRunner.dropTable('family_documents');
  }
}
