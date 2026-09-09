import { randomUUID } from 'node:crypto';
import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

interface WithGroup {
  id: string;
  group_id: number;
}
interface DBDocumentBase extends WithGroup {
  document_type_id: string;
  document_subtype_id: string;
  required_expiration_date: boolean;
  required_for_colaborator: boolean;
  required_for_contract: boolean;
}
interface DBFamily extends WithGroup {
  contract_id: string;
  name: string;
}
interface DBDocumentModel extends DBDocumentBase {
  family_id: string | null;
}
interface DBDocument extends DBDocumentModel {
  contract_id: string;
  document_model_id: string | null;
}

export class UpdateDocumentsStructure1769572000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable('documents');
    if (!table) throw new Error('Table documents not found');

    // Si document_type_id ya no existe, la migración fue aplicada previamente → no-op
    if (!table.columns.find((c) => c.name === 'document_type_id')) return;

    // 1. Agrega columna document_model_id si no existe
    if (!table.columns.find((c) => c.name === 'document_model_id')) {
      await queryRunner.addColumn('documents', new TableColumn({
        name: 'document_model_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }));
    }

    // 2. Migrar datos: asignar document_model_id a cada documento
    const documents: DBDocument[] = await queryRunner.query(
      `SELECT id, contract_id, group_id, document_type_id, document_subtype_id,
              required_expiration_date, required_for_colaborator, required_for_contract,
              document_model_id
       FROM documents WHERE deleted_at IS NULL`,
    );
    for (const document of documents) {
      // 2.1.1. Buscamos si hay alguna familia que pertenezca al contrato del documento
      const familyRows: DBFamily[] = await queryRunner.query(
        'SELECT id, contract_id, group_id, name FROM families WHERE contract_id = ? AND deleted_at IS NULL LIMIT 1',
        [document.contract_id],
      );
      let family: DBFamily | undefined = familyRows[0];
      if (!family) {
        // 2.1.2. Si no encontramos la familia, se crea una nueva
        const newFamilyId = randomUUID();
        await queryRunner.query(
          'INSERT INTO families (id, contract_id, name, group_id) VALUES (?, ?, ?, ?)',
          [newFamilyId, document.contract_id, `Family for contract ${document.contract_id}`, document.group_id],
        );
        const inserted: DBFamily[] = await queryRunner.query(
          'SELECT id, contract_id, group_id, name FROM families WHERE id = ?',
          [newFamilyId],
        );
        family = inserted[0];
      }
      // 2.2.1. Buscamos un modelo de documento que tenga los mismos datos
      const modelRows: DBDocumentModel[] = await queryRunner.query(
        `SELECT id, document_type_id, document_subtype_id, family_id,
                required_expiration_date, required_for_colaborator, required_for_contract
         FROM document_models
         WHERE document_type_id = ? AND document_subtype_id = ? AND family_id = ?
         LIMIT 1`,
        [document.document_type_id, document.document_subtype_id, family!.id],
      );
      let documentModel: DBDocumentModel | undefined = modelRows[0];
      if (!documentModel) {
        // 2.2.2. Si no encontramos el modelo de documento, se crea uno nuevo
        const newModelId = randomUUID();
        await queryRunner.query(
          `INSERT INTO document_models (id, document_type_id, document_subtype_id, family_id,
                                       required_expiration_date, required_for_colaborator, required_for_contract)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            newModelId,
            document.document_type_id,
            document.document_subtype_id,
            family!.id,
            document.required_expiration_date,
            document.required_for_colaborator,
            document.required_for_contract,
          ],
        );
        const modelInserted: DBDocumentModel[] = await queryRunner.query(
          'SELECT id FROM document_models WHERE id = ?',
          [newModelId],
        );
        documentModel = modelInserted[0];
      }
      if (documentModel?.id) {
        // 2.3. Actualizamos el document_model_id del documento
        await queryRunner.query(
          'UPDATE documents SET document_model_id = ? WHERE id = ?',
          [documentModel.id, document.id],
        );
      } else {
        // 2.4. Si no se pudo asignar un document_model_id, eliminamos el documento
        await queryRunner.query('DELETE FROM documents WHERE id = ?', [document.id]);
      }
    }

    // 3. Hacer que document_model_id no sea nullable
    await queryRunner.changeColumn('documents', 'document_model_id', new TableColumn({
      name: 'document_model_id',
      type: 'varchar',
      length: '36',
      isNullable: false,
    }));

    // 4. Añade la foreign key a document_model_id
    await queryRunner.createForeignKey('documents', new TableForeignKey({
      columnNames: ['document_model_id'],
      referencedColumnNames: ['id'],
      referencedTableName: 'document_models',
      onDelete: 'RESTRICT',
    }));

    // Recargar tabla para obtener FKs actualizadas
    table = await queryRunner.getTable('documents');

    // 5. Remover las foreign keys antiguas
    const foreignKeySubtype = table?.foreignKeys.find(fk => fk.columnNames.indexOf('document_subtype_id') !== -1);
    if (foreignKeySubtype) {
      await queryRunner.dropForeignKey('documents', foreignKeySubtype);
    }
    const foreignKeyType = table?.foreignKeys.find(fk => fk.columnNames.indexOf('document_type_id') !== -1);
    if (foreignKeyType) {
      await queryRunner.dropForeignKey('documents', foreignKeyType);
    }

    // 6. Eliminar columnas antiguas
    await queryRunner.dropColumns('documents', [
      'document_type_id',
      'document_subtype_id',
      'required_for_contract',
      'required_for_colaborator',
      'required_expiration_date',
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Restaurar las columnas antiguas
    await queryRunner.addColumns('documents', [
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
      new TableColumn({
        name: 'required_for_contract',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'required_for_colaborator',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'required_expiration_date',
        type: 'boolean',
        default: false,
      }),
    ]);

    // 2. Restaurar las foreign keys antiguas primero
    await queryRunner.createForeignKey(
      'documents',
      new TableForeignKey({
        columnNames: ['document_type_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'document_types',
        onDelete: 'RESTRICT',
      }),
    );
    await queryRunner.createForeignKey(
      'documents',
      new TableForeignKey({
        columnNames: ['document_subtype_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'document_subtypes',
        onDelete: 'RESTRICT',
      }),
    );

    // 3. Buscamos todos los documentos y actualizamos sus propiedades usando el document_model_id
    const documents: DBDocument[] = await queryRunner.query(
      'SELECT id, document_model_id FROM documents WHERE deleted_at IS NULL',
    );
    for (const document of documents) {
      const modelRows: DBDocumentModel[] = await queryRunner.query(
        `SELECT id, document_type_id, document_subtype_id,
                required_for_contract, required_for_colaborator, required_expiration_date
         FROM document_models WHERE id = ? LIMIT 1`,
        [document.document_model_id],
      );
      const documentModel = modelRows[0];
      if (documentModel) {
        await queryRunner.query(
          `UPDATE documents
           SET document_type_id = ?, document_subtype_id = ?,
               required_for_contract = ?, required_for_colaborator = ?, required_expiration_date = ?
           WHERE id = ?`,
          [
            documentModel.document_type_id,
            documentModel.document_subtype_id,
            documentModel.required_for_contract,
            documentModel.required_for_colaborator,
            documentModel.required_expiration_date,
            document.id,
          ],
        );
      }
    }

    // 4. Remover la foreign key a la columna document_model_id
    const table = await queryRunner.getTable('documents');
    const foreignKeyModel = table?.foreignKeys.find(fk => fk.columnNames.indexOf('document_model_id') !== -1);
    if (foreignKeyModel) {
      await queryRunner.dropForeignKey('documents', foreignKeyModel);
    }

    // 5. Eliminar la columna document_model_id
    await queryRunner.dropColumn('documents', 'document_model_id');
  }
}
