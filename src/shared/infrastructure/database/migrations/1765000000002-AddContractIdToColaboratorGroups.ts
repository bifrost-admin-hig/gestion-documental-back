import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddContractIdToColaboratorGroups1765000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Borrar todo el contenido de la tabla colaborator_groups
    await queryRunner.query('DELETE FROM colaborator_groups');

    await queryRunner.addColumn(
      'colaborator_groups',
      new TableColumn({
        name: 'contract_id',
        type: 'varchar',
        length: '36',
        isNullable: false,
      }),
    );

    await queryRunner.createForeignKey(
      'colaborator_groups',
      new TableForeignKey({
        name: 'FK_COLABORATOR_GROUPS_CONTRACT_ID',
        columnNames: ['contract_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'contracts',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('colaborator_groups');
    const foreignKey = table!.foreignKeys.find(fk => fk.columnNames.indexOf('contract_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('colaborator_groups', foreignKey);
    }
    await queryRunner.dropColumn('colaborator_groups', 'contract_id');
  }
}
