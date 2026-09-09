import { Table, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateInAppNotificationsTable1780870948440 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'in_app_notifications',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'entity_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'read_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'in_app_notifications',
      new TableForeignKey({
        name: 'FK_in_app_notifications_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'in_app_notifications',
      new TableIndex({
        name: 'IDX_in_app_notifications_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'in_app_notifications',
      new TableIndex({
        name: 'IDX_in_app_notifications_read_at',
        columnNames: ['read_at'],
      }),
    );

    await queryRunner.createIndex(
      'in_app_notifications',
      new TableIndex({
        name: 'IDX_in_app_notifications_entity',
        columnNames: ['entity_type', 'entity_id'],
      }),
    );
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('in_app_notifications');
  }
}
