import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateGroupUsersTable1768273194274 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "group_users",
        columns: [
          {
            name: "group_id",
            type: "int",
          },
          {
            name: "user_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    // Foreign key to groups
    await queryRunner.createForeignKey(
      "group_users",
      new TableForeignKey({
        name: "FK_GROUP_USERS_GROUP",
        columnNames: ["group_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "groups",
        onDelete: "CASCADE",
      }),
    );

    // Foreign key to users
    await queryRunner.createForeignKey(
      "group_users",
      new TableForeignKey({
        name: "FK_GROUP_USERS_USER",
        columnNames: ["user_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      }),
    );

    // Unique index to ensure a user can only be in one group
    await queryRunner.createIndex(
      "group_users",
      new TableIndex({
        name: "IDX_GROUP_USERS_USER_ID",
        columnNames: ["user_id"],
        isUnique: true,
      }),
    );

    // Index for querying users by group
    await queryRunner.createIndex(
      "group_users",
      new TableIndex({
        name: "IDX_GROUP_USERS_GROUP_ID",
        columnNames: ["group_id"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("group_users");
  }

}
