import { TableColumn, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddMetadataFieldsToDocuments1786119046831 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.addColumn('documents', new TableColumn({
      name: 'code',
      type: 'varchar',
      length: '100',
      isNullable: true,
      comment: 'Código único de identificación del documento (ej. POL-SST-001)',
    }));

    await queryRunner.addColumn('documents', new TableColumn({
      name: 'review_date',
      type: 'date',
      isNullable: true,
      comment: 'Fecha de próxima revisión. Opcional: si no se indica, se calcula automáticamente',
    }));

    await queryRunner.addColumn('documents', new TableColumn({
      name: 'responsible_colaborator_id',
      type: 'varchar',
      length: '36',
      isNullable: true,
    }));

    await queryRunner.addColumn('documents', new TableColumn({
      name: 'area_id',
      type: 'varchar',
      length: '36',
      isNullable: true,
    }));

    await queryRunner.createForeignKey('documents', new TableForeignKey({
      name: 'FK_documents_responsible_colaborator_id',
      columnNames: ['responsible_colaborator_id'],
      referencedTableName: 'colaborators',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    }));

    await queryRunner.createForeignKey('documents', new TableForeignKey({
      name: 'FK_documents_area_id',
      columnNames: ['area_id'],
      referencedTableName: 'areas',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    }));

    // Un mismo código no puede repetirse dentro del mismo grupo/empresa.
    // Postgres no considera iguales los NULL entre sí, así que documentos sin
    // código (aún permitido, es opcional en documentos ya existentes) no chocan.
    await queryRunner.createIndex('documents', new TableIndex({
      name: 'IDX_documents_group_id_code',
      columnNames: ['group_id', 'code'],
      isUnique: true,
    }));

    await queryRunner.createIndex('documents', new TableIndex({
      name: 'IDX_documents_responsible_colaborator_id',
      columnNames: ['responsible_colaborator_id'],
    }));

    await queryRunner.createIndex('documents', new TableIndex({
      name: 'IDX_documents_area_id',
      columnNames: ['area_id'],
    }));

    await queryRunner.createIndex('documents', new TableIndex({
      name: 'IDX_documents_review_date',
      columnNames: ['review_date'],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropIndex('documents', 'IDX_documents_review_date');
    await queryRunner.dropIndex('documents', 'IDX_documents_area_id');
    await queryRunner.dropIndex('documents', 'IDX_documents_responsible_colaborator_id');
    await queryRunner.dropIndex('documents', 'IDX_documents_group_id_code');
    await queryRunner.dropForeignKey('documents', 'FK_documents_area_id');
    await queryRunner.dropForeignKey('documents', 'FK_documents_responsible_colaborator_id');
    await queryRunner.dropColumn('documents', 'area_id');
    await queryRunner.dropColumn('documents', 'responsible_colaborator_id');
    await queryRunner.dropColumn('documents', 'review_date');
    await queryRunner.dropColumn('documents', 'code');
  }
}
