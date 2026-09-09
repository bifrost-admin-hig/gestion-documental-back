import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class MakeDocumentHistoryIssuedDateNullable1765997461644 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Alter issued_date column to be nullable in documents_history table
    await queryRunner.changeColumn(
      'documents_history',
      'issued_date',
      new TableColumn({
        name: 'issued_date',
        type: 'date',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert issued_date column to NOT NULL in documents_history table
    await queryRunner.changeColumn(
      'documents_history',
      'issued_date',
      new TableColumn({
        name: 'issued_date',
        type: 'date',
        isNullable: false,
      }),
    );
  }

}
