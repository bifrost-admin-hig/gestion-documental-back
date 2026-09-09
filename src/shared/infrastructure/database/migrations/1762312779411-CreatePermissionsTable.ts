import { Table } from "typeorm";
import { ImprovedRunner, IQueryRunner } from "../runner";

export class CreatePermissionsTable1762312779411 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'permissions',
      columns: [
        {
          name: 'id',
          type: 'int',
          isPrimary: true,
          isGenerated: true,
          generationStrategy: 'increment',
        },
        {
          name: 'name',
          type: 'varchar',
          length: '100',
          isUnique: true,
          isNullable: false,
        },
        {
          name: 'description',
          type: 'varchar',
          length: '255',
          isNullable: true,
        },
        {
          name: 'created_at',
          type: 'datetime',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
        {
          name: 'updated_at',
          type: 'datetime',
          default: 'CURRENT_TIMESTAMP',
          onUpdate: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
      ],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('permissions');
  }

}
