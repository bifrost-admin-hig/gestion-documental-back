import { Table } from 'typeorm';
import { ImprovedRunner, IQueryRunner } from '../runner';

export class CreateColaboratorsTable1730700000000 extends ImprovedRunner {
  public async onUp(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'colaborators',
      columns: [
        {
          name: 'id',
          type: 'varchar',
          length: '36',
          isPrimary: true,
          generationStrategy: 'uuid',
        },
        {
          name: 'tipo_documento',
          type: 'enum',
          enum: ['rut', 'pasaporte', 'dni', 'otro'],
          isNullable: false,
        },
        {
          name: 'numero_documento',
          type: 'varchar',
          length: '50',
          isNullable: false,
          isUnique: true,
        },
        {
          name: 'nombre',
          type: 'varchar',
          length: '100',
          isNullable: false,
        },
        {
          name: 'apellido_paterno',
          type: 'varchar',
          length: '100',
          isNullable: false,
        },
        {
          name: 'apellido_materno',
          type: 'varchar',
          length: '100',
          isNullable: true,
        },
        {
          name: 'nacionalidad',
          type: 'varchar',
          length: '100',
          isNullable: false,
        },
        {
          name: 'sexo',
          type: 'enum',
          enum: ['masculino', 'femenino', 'otro'],
          isNullable: false,
        },
        {
          name: 'estado_civil',
          type: 'enum',
          enum: ['soltero', 'casado', 'divorciado', 'viudo', 'union_civil'],
          isNullable: false,
        },
        {
          name: 'fecha_nacimiento',
          type: 'date',
          isNullable: false,
        },
        {
          name: 'pais_residencia',
          type: 'varchar',
          length: '2',
          isNullable: false,
          default: "'CL'",
        },
        {
          name: 'region',
          type: 'varchar',
          length: '100',
          isNullable: true,
        },
        {
          name: 'comuna',
          type: 'varchar',
          length: '100',
          isNullable: true,
        },
        {
          name: 'estado_region',
          type: 'varchar',
          length: '100',
          isNullable: true,
        },
        {
          name: 'ciudad_municipio',
          type: 'varchar',
          length: '100',
          isNullable: true,
        },
        {
          name: 'direccion_residencia',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'telefono',
          type: 'varchar',
          length: '20',
          isNullable: false,
        },
        {
          name: 'email',
          type: 'varchar',
          length: '255',
          isNullable: false,
          isUnique: true,
        },
        {
          name: 'contacto_emergencia',
          type: 'varchar',
          length: '100',
          isNullable: true,
        },
        {
          name: 'telefono_emergencia',
          type: 'varchar',
          length: '20',
          isNullable: true,
        },
        {
          name: 'profesion',
          type: 'varchar',
          length: '100',
          isNullable: false,
        },
        {
          name: 'cargo',
          type: 'varchar',
          length: '100',
          isNullable: false,
        },
        {
          name: 'status',
          type: 'enum',
          enum: ['activo', 'inactivo', 'suspendido', 'terminado'],
          default: "'activo'",
          isNullable: false,
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
      indices: [
        {
          name: 'IDX_COLABORATORS_NUMERO_DOCUMENTO',
          columnNames: ['numero_documento'],
          isUnique: true,
        },
        {
          name: 'IDX_COLABORATORS_EMAIL',
          columnNames: ['email'],
          isUnique: true,
        },
        {
          name: 'IDX_COLABORATORS_NAME_SURNAME',
          columnNames: ['nombre', 'apellido_paterno'],
        },
        {
          name: 'IDX_COLABORATORS_STATUS',
          columnNames: ['status'],
        },
      ],
    }));
  }

  public async onDown(queryRunner: IQueryRunner): Promise<void> {
    await queryRunner.dropTable('colaborators');
  }
}
