import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class FixDocumentTemplateCodeVersionUniqueConstraint1778095709242 implements MigrationInterface {
  name = 'FixDocumentTemplateCodeVersionUniqueConstraint1778095709242';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('document_templates');
    if (table?.indices.find(i => i.name === 'IDX_4dfa5bb611939517d690b00524')) {
      await queryRunner.dropIndex('document_templates', 'IDX_4dfa5bb611939517d690b00524');
    }
    if (!table?.indices.find(i => i.name === 'IDX_document_templates_code_version')) {
      await queryRunner.createIndex('document_templates', new TableIndex({
        name: 'IDX_document_templates_code_version',
        columnNames: ['code', 'version'],
        isUnique: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('document_templates', 'IDX_document_templates_code_version');
    await queryRunner.createIndex('document_templates', new TableIndex({
      name: 'IDX_4dfa5bb611939517d690b00524',
      columnNames: ['code'],
      isUnique: true,
    }));
  }
}
