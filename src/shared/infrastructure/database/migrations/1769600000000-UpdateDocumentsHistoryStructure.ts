import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

interface DBDocument {
  id: string;
  document_model_id: string;
  contract_id: string;
  group_id: number;
}

interface DBDocumentHistory {
  id: string;
  document_id: string;
  document_model_id: string;
  document_type_id: string; // before remove it
  document_subtype_id: string; // before remove it
  contract_id: string;
  group_id: number;
}

interface DBDocumentModel {
  id: string;
  document_type_id: string;
  document_subtype_id: string;
}

/**
 * Remover propiedades de documents_history.
 * Agregar: document_model_id
 * Remover: document_type_id, document_subtype_id, required_expiration_date, required_for_colaborator, required_for_contract
 */
export class UpdateDocumentsHistoryStructure1769600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('documents_history');
    if (!table) return;

    // Si document_type_id ya no existe, la migración fue aplicada previamente → no-op
    if (!table.columns.find((c) => c.name === 'document_type_id')) return;

    // 1. Agregar document_model_id si no existe
    if (!table.columns.find((c) => c.name === 'document_model_id')) {
      await queryRunner.addColumn('documents_history', new TableColumn({
        name: 'document_model_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }));
    }

    // 2. Actualizar document_model_id en histories usando SQL directo
    const histories: DBDocumentHistory[] = await queryRunner.query(
      'SELECT id, document_id FROM documents_history',
    );
    for (const history of histories) {
      const docRows: DBDocument[] = await queryRunner.query(
        'SELECT id, document_model_id FROM documents WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [history.document_id],
      );
      const document = docRows[0];
      if (document?.document_model_id) {
        await queryRunner.query(
          'UPDATE documents_history SET document_model_id = ? WHERE id = ?',
          [document.document_model_id, history.id],
        );
      } else {
        await queryRunner.query('DELETE FROM documents_history WHERE id = ?', [history.id]);
      }
    }

    // 3. Hacer que document_model_id no sea nullable
    await queryRunner.changeColumn('documents_history', 'document_model_id', new TableColumn({
      name: 'document_model_id',
      type: 'varchar',
      length: '36',
      isNullable: false,
    }));

    // 4. Añade la foreign key a document_model_id
    await queryRunner.createForeignKey('documents_history', new TableForeignKey({
      columnNames: ['document_model_id'],
      referencedColumnNames: ['id'],
      referencedTableName: 'document_models',
      onDelete: 'RESTRICT',
    }));

    // 5. Remover las foreign keys antiguas
    const foreignKeySubtype = table.foreignKeys.find(fk => fk.columnNames.indexOf('document_subtype_id') !== -1);
    if (foreignKeySubtype) {
      await queryRunner.dropForeignKey('documents_history', foreignKeySubtype);
    }
    const foreignKeyType = table.foreignKeys.find(fk => fk.columnNames.indexOf('document_type_id') !== -1);
    if (foreignKeyType) {
      await queryRunner.dropForeignKey('documents_history', foreignKeyType);
    }

    // 6. Eliminar columnas antiguas
    await queryRunner.dropColumns('documents_history', [
      'document_type_id',
      'document_subtype_id',
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate columns in documents table
    const table = await queryRunner.getTable('documents_history');
    if (!table) return;

    // 1. Restaurar las columnas antiguas
    await queryRunner.addColumns('documents_history', [
      new TableColumn({
        name: 'document_type_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
      new TableColumn({
        name: 'document_subtype_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    ]);
    // 2. Restaurar las foreign keys antiguas primero
    await queryRunner.createForeignKey('documents_history', new TableForeignKey({
      columnNames: ['document_type_id'],
      referencedColumnNames: ['id'],
      referencedTableName: 'document_types',
      onDelete: 'RESTRICT',
    }));
    await queryRunner.createForeignKey('documents_history', new TableForeignKey({
      columnNames: ['document_subtype_id'],
      referencedColumnNames: ['id'],
      referencedTableName: 'document_subtypes',
      onDelete: 'RESTRICT',
    }));

    // 3. Buscamos todo el historial y actualizamos sus propiedades usando el document_model_id
    const histories: DBDocumentHistory[] = await queryRunner.query(
      'SELECT id, document_model_id FROM documents_history',
    );
    for (const history of histories) {
      const modelRows: DBDocumentModel[] = await queryRunner.query(
        'SELECT id, document_type_id, document_subtype_id FROM document_models WHERE id = ? LIMIT 1',
        [history.document_model_id],
      );
      const documentModel = modelRows[0];
      await queryRunner.query(
        'UPDATE documents_history SET document_type_id = ?, document_subtype_id = ? WHERE id = ?',
        [documentModel?.document_type_id ?? null, documentModel?.document_subtype_id ?? null, history.id],
      );
    }
    // 4. Remover la foreign key a la columna document_model_id
    const foreignKeyModel = table?.foreignKeys.find(fk => fk.columnNames.indexOf('document_model_id') !== -1);
    if (foreignKeyModel) {
      await queryRunner.dropForeignKey('documents_history', foreignKeyModel);
    }

    // 5. Eliminar la columna document_model_id
    await queryRunner.dropColumn('documents_history', 'document_model_id');
  }
}
