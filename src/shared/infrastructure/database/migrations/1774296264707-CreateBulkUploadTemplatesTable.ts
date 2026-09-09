import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateBulkUploadTemplatesTable1774296264707 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'bulk_upload_templates',
      columns: [
        {
          name: 'id',
          type: 'varchar',
          length: '36',
          isPrimary: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'type',
          type: 'varchar',
          length: '50',
          isNullable: false,
        },
        {
          name: 'file_id',
          type: 'varchar',
          length: '36',
          isNullable: false,
        },
        {
          name: 'uploaded_by',
          type: 'varchar',
          length: '36',
          isNullable: false,
        },
        {
          name: 'is_active',
          type: 'boolean',
          default: true,
          isNullable: false,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          onUpdate: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
      ],
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bulk_upload_templates');
  }

}
