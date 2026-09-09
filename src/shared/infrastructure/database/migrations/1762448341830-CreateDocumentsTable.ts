import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateDocumentsTable1762448341830 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create documents table
    await queryRunner.createTable(
      new Table({
        name: 'documents',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'colaborator_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'issued_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'expiration_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'contract_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'document_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'draft'",
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'deleted_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'deleted_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key for colaborator_id
    await queryRunner.createForeignKey(
      'documents',
      new TableForeignKey({
        name: 'FK_DOCUMENTS_COLABORATOR',
        columnNames: ['colaborator_id'],
        referencedTableName: 'colaborators',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // Create foreign key for contract_id
    await queryRunner.createForeignKey(
      'documents',
      new TableForeignKey({
        name: 'FK_DOCUMENTS_CONTRACT',
        columnNames: ['contract_id'],
        referencedTableName: 'contracts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create foreign key for created_by
    await queryRunner.createForeignKey(
      'documents',
      new TableForeignKey({
        name: 'FK_DOCUMENTS_CREATED_BY',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // Create foreign key for deleted_by
    await queryRunner.createForeignKey(
      'documents',
      new TableForeignKey({
        name: 'FK_DOCUMENTS_DELETED_BY',
        columnNames: ['deleted_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    // Create index on contract_id for performance
    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'IDX_DOCUMENTS_CONTRACT_ID',
        columnNames: ['contract_id'],
      }),
    );

    // Create index on colaborator_id for performance
    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'IDX_DOCUMENTS_COLABORATOR_ID',
        columnNames: ['colaborator_id'],
      }),
    );

    // Create index on expiration_date for expiring documents query
    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'IDX_DOCUMENTS_EXPIRATION_DATE',
        columnNames: ['expiration_date'],
      }),
    );

    // Add entity-defined indices
    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'IDX_DOCUMENTS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'IDX_DOCUMENTS_DELETED_AT',
        columnNames: ['deleted_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('documents');

    // Drop foreign keys first (idempotente)
    if (table) {
      const fkContract = table.foreignKeys.find(f => f.name === 'FK_DOCUMENTS_CONTRACT' || f.columnNames.includes('contract_id'));
      if (fkContract) await queryRunner.dropForeignKey('documents', fkContract);
      const fkColaborator = table.foreignKeys.find(f => f.name === 'FK_DOCUMENTS_COLABORATOR' || f.columnNames.includes('colaborator_id'));
      if (fkColaborator) await queryRunner.dropForeignKey('documents', fkColaborator);
      const fkCreatedBy = table.foreignKeys.find(f => f.name === 'FK_DOCUMENTS_CREATED_BY' || f.columnNames.includes('created_by'));
      if (fkCreatedBy) await queryRunner.dropForeignKey('documents', fkCreatedBy);
      const fkDeletedBy = table.foreignKeys.find(f => f.name === 'FK_DOCUMENTS_DELETED_BY' || f.columnNames.includes('deleted_by'));
      if (fkDeletedBy) await queryRunner.dropForeignKey('documents', fkDeletedBy);
    }

    // Drop indices after FKs (idempotente)
    if (table) {
      if (table.indices.find(i => i.name === 'IDX_DOCUMENTS_EXPIRATION_DATE')) {
        await queryRunner.dropIndex('documents', 'IDX_DOCUMENTS_EXPIRATION_DATE');
      }
      if (table.indices.find(i => i.name === 'IDX_DOCUMENTS_COLABORATOR_ID')) {
        await queryRunner.dropIndex('documents', 'IDX_DOCUMENTS_COLABORATOR_ID');
      }
      if (table.indices.find(i => i.name === 'IDX_DOCUMENTS_CONTRACT_ID')) {
        await queryRunner.dropIndex('documents', 'IDX_DOCUMENTS_CONTRACT_ID');
      }
      if (table.indices.find(i => i.name === 'IDX_DOCUMENTS_STATUS')) {
        await queryRunner.dropIndex('documents', 'IDX_DOCUMENTS_STATUS');
      }
      if (table.indices.find(i => i.name === 'IDX_DOCUMENTS_DELETED_AT')) {
        await queryRunner.dropIndex('documents', 'IDX_DOCUMENTS_DELETED_AT');
      }
    }

    // Drop table
    if (await queryRunner.getTable('documents')) {
      await queryRunner.dropTable('documents');
    }
  }
}
