import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateColaboratorGroupColaboratorsTable1764718650911 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'colaborator_group_colaborators',
        columns: [
          {
            name: 'colaborator_group_id',
            type: 'int',
            isPrimary: true,
          },
          {
            name: 'colaborator_id',
            type: 'varchar',
            length: '36',
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
            columnNames: ['colaborator_group_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'colaborator_groups',
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['colaborator_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'colaborators',
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_COLABORATOR_GROUP_COLABORATORS_GROUP_ID',
            columnNames: ['colaborator_group_id'],
          },
          {
            name: 'IDX_COLABORATOR_GROUP_COLABORATORS_COLABORATOR_ID',
            columnNames: ['colaborator_id'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('colaborator_group_colaborators');
  }

}
