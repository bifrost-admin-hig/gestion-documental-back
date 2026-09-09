import { TableColumn, TableForeignKey, TableIndex } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class AddSignatureFlowFieldsToDocuments1780606596609 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.addColumn('documents', new TableColumn({
      name: 'signature_flow_id',
      type: 'varchar',
      length: '36',
      isNullable: true,
    }));

    await queryRunner.addColumn('documents', new TableColumn({
      name: 'previous_version_id',
      type: 'varchar',
      length: '36',
      isNullable: true,
    }));

    await queryRunner.addColumn('documents', new TableColumn({
      name: 'is_superseded',
      type: 'boolean',
      isNullable: false,
      default: false,
    }));

    await queryRunner.createForeignKey('documents', new TableForeignKey({
      name: 'FK_documents_signature_flow_id',
      columnNames: ['signature_flow_id'],
      referencedTableName: 'signature_flows',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    }));

    await queryRunner.createForeignKey('documents', new TableForeignKey({
      name: 'FK_documents_previous_version_id',
      columnNames: ['previous_version_id'],
      referencedTableName: 'documents',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    }));

    await queryRunner.createIndex('documents', new TableIndex({
      name: 'IDX_documents_signature_flow_id',
      columnNames: ['signature_flow_id'],
    }));

    await queryRunner.createIndex('documents', new TableIndex({
      name: 'IDX_documents_is_superseded',
      columnNames: ['is_superseded'],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropIndex('documents', 'IDX_documents_is_superseded');
    await queryRunner.dropIndex('documents', 'IDX_documents_signature_flow_id');
    await queryRunner.dropForeignKey('documents', 'FK_documents_previous_version_id');
    await queryRunner.dropForeignKey('documents', 'FK_documents_signature_flow_id');
    await queryRunner.dropColumn('documents', 'is_superseded');
    await queryRunner.dropColumn('documents', 'previous_version_id');
    await queryRunner.dropColumn('documents', 'signature_flow_id');
  }
}

