import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  ManyToMany,
} from 'typeorm';
import { EnumColumn } from '@shared/infrastructure/database/entities/utils/decorators';
import { UserEntity } from '@shared/infrastructure/database/entities/user.entity';
import { ColaboratorEntity } from './colaborators.entity';
import { AreaEntity } from './area.entity';
import { DivisionEntity } from './division.entity';
import { CompanyEntity } from './company.entity';

@Entity('contracts')
@Index('IDX_contracts_rut_sociedad', ['rutSociedad'])
@Index('IDX_contracts_nombre_colaborador', ['nombreColaborador'])
@Index('IDX_contracts_contract_type', ['contractType'])
@Index('IDX_contracts_status', ['status'])
@Index('IDX_contracts_group_id', ['groupId'])
export class ContractEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'rut_sociedad', type: 'varchar', length: 12 })
  rutSociedad!: string;

  @Column({ name: 'nombre_colaborador', type: 'varchar', length: 255, nullable: true })
  nombreColaborador?: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: Date;

  @EnumColumn({
    name: 'contract_type',
    enum: ['indefinido', 'plazo_fijo', 'obra_faena', 'faena', 'consultoria', 'honorarios'],
  })
  contractType!: string;

  @Column({ name: 'administrador_contrato_mandante', type: 'varchar', length: 255 })
  administradorContratoMandante!: string;

  @Column({ name: 'administrador_contrato_empresa', type: 'varchar', length: 255 })
  administradorContratoEmpresa!: string;

  @Column({ name: 'rut_administrador_contrato', type: 'varchar', length: 12 })
  rutAdministradorContrato!: string;

  @Column({ name: 'contract_number', type: 'varchar', length: 50, unique: true })
  contractNumber!: string;

  @Column({ name: 'nombre_mandante', type: 'varchar', length: 255 })
  nombreMandante!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  division?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  area?: string;

  @Column({ name: 'areaId', type: 'varchar', length: 36, nullable: true })
  areaId?: string;

  @ManyToOne(() => AreaEntity)
  @JoinColumn({ name: 'areaId' })
  areaRelation?: AreaEntity;

  @Column({ name: 'divisionId', type: 'varchar', length: 36, nullable: true })
  divisionId?: string;

  @ManyToOne(() => DivisionEntity)
  @JoinColumn({ name: 'divisionId' })
  divisionRelation?: DivisionEntity;

  @Column({ name: 'companyId', type: 'varchar', length: 36, nullable: true })
  companyId?: string;

  @ManyToOne(() => CompanyEntity)
  @JoinColumn({ name: 'companyId' })
  companyRelation?: CompanyEntity;

  @Column({ name: 'dotacion_personal', type: 'int', default: 0 })
  dotacionPersonal!: number;

  @Column({ name: 'dotacion_vehiculos', type: 'int', default: 0 })
  dotacionVehiculos!: number;

  @Column({ name: 'descripcion_servicio', type: 'text', nullable: true })
  descripcionServicio?: string;

  @Column({ name: 'nombre_proyecto', type: 'varchar', length: 255, nullable: true })
  nombreProyecto?: string;

  @EnumColumn({
    name: 'jornada_trabajo',
    enum: ['completa', 'parcial', 'turno', 'especial', 'excepcional'],
    default: 'completa',
  })
  jornadaTrabajo!: string;

  @Column({ name: 'turnos', type: 'varchar', length: 255, nullable: true, default: null })
  turnos?: string;

  @EnumColumn({
    enum: ['draft', 'active', 'suspended', 'terminated', 'expired'],
    default: 'draft',
  })
  status!: string;

  @Column({ name: 'group_id', type: 'integer' })
  groupId!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  // Relations
  @Column({ name: 'employee_id', type: 'uuid', nullable: true })
  employeeId?: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'employee_id' })
  employee?: UserEntity;

  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId?: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'manager_id' })
  manager?: UserEntity;

  @ManyToMany(() => ColaboratorEntity, (colaborator) => colaborator.contracts)
  colaborators?: ColaboratorEntity[];
}

