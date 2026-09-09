import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRequiredFieldsToDocuments1766619700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columnas como nullable primero
    await queryRunner.addColumn(
      'documents',
      new TableColumn({
        name: 'required_for_contract',
        type: 'boolean',
        isNullable: true,
        default: null,
      }),
    );

    await queryRunner.addColumn(
      'documents',
      new TableColumn({
        name: 'required_for_colaborator',
        type: 'boolean',
        isNullable: true,
        default: null,
      }),
    );

    // Actualizar todos los registros existentes a false
    await queryRunner.query(
      'UPDATE documents SET required_for_contract = false WHERE required_for_contract IS NULL',
    );
    await queryRunner.query(
      'UPDATE documents SET required_for_colaborator = false WHERE required_for_colaborator IS NULL',
    );

    // Cambiar las columnas a NOT NULL
    await queryRunner.changeColumn(
      'documents',
      'required_for_contract',
      new TableColumn({
        name: 'required_for_contract',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );

    await queryRunner.changeColumn(
      'documents',
      'required_for_colaborator',
      new TableColumn({
        name: 'required_for_colaborator',
        type: 'boolean',
        isNullable: false,
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('documents', 'required_for_colaborator');
    await queryRunner.dropColumn('documents', 'required_for_contract');
  }
}
