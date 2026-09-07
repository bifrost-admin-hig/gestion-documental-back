import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class FixDocumentTemplateCodeScopeAndUniqueness1788473577823 implements MigrationInterface {
  name = 'FixDocumentTemplateCodeScopeAndUniqueness1788473577823';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('document_templates');

    // El code de una plantilla ya no es único a nivel global: dos grupos distintos
    // pueden usar el mismo code, y la unicidad entre plantillas activas del mismo
    // grupo se valida en la capa de aplicación (permite reutilizar el code de una
    // plantilla eliminada).
    if (table?.indices.find(i => i.name === 'IDX_document_templates_code_version')) {
      await queryRunner.dropIndex('document_templates', 'IDX_document_templates_code_version');
    }

    if (!table?.indices.find(i => i.name === 'IDX_document_templates_group_code_version')) {
      await queryRunner.createIndex('document_templates', new TableIndex({
        name: 'IDX_document_templates_group_code_version',
        columnNames: ['group_id', 'code', 'version'],
        isUnique: false,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('document_templates');

    if (table?.indices.find(i => i.name === 'IDX_document_templates_group_code_version')) {
      await queryRunner.dropIndex('document_templates', 'IDX_document_templates_group_code_version');
    }

    if (!table?.indices.find(i => i.name === 'IDX_document_templates_code_version')) {
      await queryRunner.createIndex('document_templates', new TableIndex({
        name: 'IDX_document_templates_code_version',
        columnNames: ['code', 'version'],
        isUnique: true,
      }));
    }
  }
}
