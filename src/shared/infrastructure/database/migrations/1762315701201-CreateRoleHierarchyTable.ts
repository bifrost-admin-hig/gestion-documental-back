import { Table } from "typeorm";
import { ImprovedRunner, IQueryRunner } from "../runner";

export class CreateRoleHierarchyTable1762315701201 extends ImprovedRunner {

  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    // Create role_hierarchy table
    await queryRunner.createTable(new Table({
      name: 'role_hierarchy',
      columns: [
        {
          name: 'parent_role_id',
          type: 'int',
          isPrimary: true,
          isNullable: false,
        },
        {
          name: 'child_role_id',
          type: 'int',
          isPrimary: true,
          isNullable: false,
        },
      ],
      indices: [
        {
          name: 'IDX_ROLE_HIERARCHY_PARENT_ROLE_ID',
          columnNames: ['parent_role_id'],
        },
        {
          name: 'IDX_ROLE_HIERARCHY_CHILD_ROLE_ID',
          columnNames: ['child_role_id'],
        },
      ],
      foreignKeys: [
        {
          name: 'FK_ROLE_HIERARCHY_PARENT',
          columnNames: ['parent_role_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'roles',
          onDelete: 'CASCADE',
        },
        {
          name: 'FK_ROLE_HIERARCHY_CHILD',
          columnNames: ['child_role_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'roles',
          onDelete: 'CASCADE',
        },
      ],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    // Drop role_hierarchy table if exists
    await queryRunner.dropTable('role_hierarchy');
  }

}
