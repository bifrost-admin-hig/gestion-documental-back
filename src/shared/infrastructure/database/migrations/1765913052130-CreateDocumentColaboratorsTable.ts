import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateDocumentColaboratorsTable1765913052130 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'document_colaborators',
        columns: [
          {
            name: 'document_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'colaborator_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['document_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'documents',
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['colaborator_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'colaborators',
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_DOCUMENT_COLABORATORS_DOCUMENT_ID',
            columnNames: ['document_id'],
          },
          {
            name: 'IDX_DOCUMENT_COLABORATORS_COLABORATOR_ID',
            columnNames: ['colaborator_id'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('document_colaborators');
  }

}
