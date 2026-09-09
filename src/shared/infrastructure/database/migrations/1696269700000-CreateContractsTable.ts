import { Table } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateContractsTable1696269700000 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'contracts',
      columns: [
        {
          name: 'id',
          type: 'varchar',
          length: '36',
          isPrimary: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'rut_sociedad',
          type: 'varchar',
          length: '12',
          isNullable: false,
        },
        {
          name: 'nombre_colaborador',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'start_date',
          type: 'date',
          isNullable: false,
        },
        {
          name: 'end_date',
          type: 'date',
          isNullable: false,
        },
        {
          name: 'contract_type',
          type: 'enum',
          enum: ['indefinido', 'plazo_fijo', 'obra_faena', 'consultoria', 'honorarios'],
          isNullable: false,
        },
        {
          name: 'administrador_contrato_mandante',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'administrador_contrato_empresa',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'rut_administrador_contrato',
          type: 'varchar',
          length: '12',
          isNullable: false,
        },
        {
          name: 'contract_number',
          type: 'varchar',
          length: '50',
          isNullable: false,
          isUnique: true,
        },
        {
          name: 'nombre_mandante',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'division',
          type: 'varchar',
          length: '100',
          isNullable: true,
        },
        {
          name: 'area',
          type: 'varchar',
          length: '100',
          isNullable: true,
        },
        {
          name: 'dotacion_personal',
          type: 'int',
          isNullable: true,
          default: 0,
        },
        {
          name: 'dotacion_vehiculos',
          type: 'int',
          isNullable: true,
          default: 0,
        },
        {
          name: 'descripcion_servicio',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'nombre_proyecto',
          type: 'varchar',
          length: '255',
          isNullable: true,
        },
        {
          name: 'jornada_trabajo',
          type: 'enum',
          enum: ['completa', 'parcial', 'turno', 'especial'],
          isNullable: false,
          default: "'completa'",
        },
        {
          name: 'status',
          type: 'enum',
          enum: ['draft', 'active', 'suspended', 'terminated', 'expired'],
          default: "'draft'",
          isNullable: false,
        },
        {
          name: 'employee_id',
          type: 'varchar',
          length: '36',
          isNullable: true,
        },
        {
          name: 'manager_id',
          type: 'varchar',
          length: '36',
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
        {
          name: 'deleted_at',
          type: 'datetime',
          isNullable: true,
        },
      ],
      indices: [
        {
          name: 'IDX_CONTRACTS_RUT_SOCIEDAD',
          columnNames: ['rut_sociedad'],
        },
        {
          name: 'IDX_CONTRACTS_NOMBRE_COLABORADOR',
          columnNames: ['nombre_colaborador'],
        },
        {
          name: 'IDX_CONTRACTS_CONTRACT_NUMBER',
          columnNames: ['contract_number'],
          isUnique: true,
        },
        {
          name: 'IDX_CONTRACTS_CONTRACT_TYPE',
          columnNames: ['contract_type'],
        },
        {
          name: 'IDX_CONTRACTS_STATUS',
          columnNames: ['status'],
        },
        {
          name: 'IDX_CONTRACTS_START_DATE',
          columnNames: ['start_date'],
        },
        {
          name: 'IDX_CONTRACTS_END_DATE',
          columnNames: ['end_date'],
        },
        {
          name: 'IDX_CONTRACTS_NOMBRE_MANDANTE',
          columnNames: ['nombre_mandante'],
        },
        {
          name: 'IDX_CONTRACTS_DIVISION',
          columnNames: ['division'],
        },
        {
          name: 'IDX_CONTRACTS_AREA',
          columnNames: ['area'],
        },
        {
          name: 'IDX_CONTRACTS_RUT_ADMIN',
          columnNames: ['rut_administrador_contrato'],
        },
      ],
      foreignKeys: [
        {
          name: 'FK_CONTRACTS_EMPLOYEE_ID',
          columnNames: ['employee_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        {
          name: 'FK_CONTRACTS_MANAGER_ID',
          columnNames: ['manager_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
      ],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('contracts');
  }
}
