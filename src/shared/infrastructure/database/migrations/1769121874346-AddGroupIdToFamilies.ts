import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddGroupIdToFamilies1769121874346 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add group_id column to families table
    await queryRunner.getTable('families').then(async (table) => {
      if (table && !table.columns.some((col) => col.name === 'group_id')) {
        await queryRunner.addColumn('families', new TableColumn({
          name: 'group_id',
          type: 'integer',
          isNullable: false,
          default: 1,
        }));

        // Create index on families.group_id
        await queryRunner.createIndex('families', new TableIndex({
          name: 'IDX_families_group_id',
          columnNames: ['group_id'],
        }));
      }
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index and column from families table
    await queryRunner.getTable('families').then(async (table) => {
      if (table?.indices.some((i) => i.name === 'IDX_families_group_id')) {
        await queryRunner.dropIndex('families', 'IDX_families_group_id');
      }
      if (table?.columns.some((col) => col.name === 'group_id')) {
        await queryRunner.dropColumn('families', 'group_id');
      }
    });
  }

}
