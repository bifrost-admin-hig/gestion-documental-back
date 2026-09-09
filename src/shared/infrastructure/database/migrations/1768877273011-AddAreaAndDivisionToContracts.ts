import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddAreaAndDivisionToContracts1768877273011 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna areaId
    await queryRunner.addColumn(
      "contracts",
      new TableColumn({
        name: "areaId",
        type: "varchar",
        length: "36",
        isNullable: true,
      }),
    );

    // Agregar columna divisionId
    await queryRunner.addColumn(
      "contracts",
      new TableColumn({
        name: "divisionId",
        type: "varchar",
        length: "36",
        isNullable: true,
      }),
    );

    // Agregar foreign key para areaId
    await queryRunner.createForeignKey(
      "contracts",
      new TableForeignKey({
        columnNames: ["areaId"],
        referencedTableName: "areas",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );

    // Agregar foreign key para divisionId
    await queryRunner.createForeignKey(
      "contracts",
      new TableForeignKey({
        columnNames: ["divisionId"],
        referencedTableName: "divisions",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Obtener las foreign keys
    const table = await queryRunner.getTable("contracts");
    const areaForeignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf("areaId") !== -1,
    );
    const divisionForeignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf("divisionId") !== -1,
    );

    // Eliminar foreign keys
    if (areaForeignKey) {
      await queryRunner.dropForeignKey("contracts", areaForeignKey);
    }
    if (divisionForeignKey) {
      await queryRunner.dropForeignKey("contracts", divisionForeignKey);
    }

    // Eliminar columnas
    await queryRunner.dropColumn("contracts", "divisionId");
    await queryRunner.dropColumn("contracts", "areaId");
  }

}
