import { Table } from "typeorm";
import { ImprovedRunner, IQueryRunner } from "../runner";

export class CreateRolePermissionsTable1762315701279 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'role_permissions',
      columns: [
        {
          name: 'role_id',
          type: 'int',
          isPrimary: true,
        },
        {
          name: 'permission_id',
          type: 'int',
          isPrimary: true,
        },
        {
          name: 'created_at',
          type: 'datetime',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
      ],
      foreignKeys: [
        {
          columnNames: ['role_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'roles',
          onDelete: 'CASCADE',
        },
        {
          columnNames: ['permission_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'permissions',
          onDelete: 'CASCADE',
        },
      ],
      indices: [
        {
          name: 'IDX_ROLE_PERMISSIONS_ROLE_ID',
          columnNames: ['role_id'],
        },
        {
          name: 'IDX_ROLE_PERMISSIONS_PERMISSION_ID',
          columnNames: ['permission_id'],
        },
      ],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('role_permissions');
  }

}
