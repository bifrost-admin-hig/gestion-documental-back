import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddCompanyIdToContracts1770000000000 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("contracts");
    if (!table || table.findColumnByName("companyId")) return;

    await queryRunner.addColumn(
      "contracts",
      new TableColumn({
        name: "companyId",
        type: "varchar",
        length: "36",
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      "contracts",
      new TableForeignKey({
        columnNames: ["companyId"],
        referencedTableName: "companies",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("contracts");
    const companyForeignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf("companyId") !== -1,
    );

    if (companyForeignKey) {
      await queryRunner.dropForeignKey("contracts", companyForeignKey);
    }

    await queryRunner.dropColumn("contracts", "companyId");
  }

}
