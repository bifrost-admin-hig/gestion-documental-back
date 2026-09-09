import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToMany,
  JoinTable,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { EnumColumn } from '@shared/infrastructure/database/entities/utils/decorators';
import { ColaboratorGroupEntity } from './colaborator-group.entity';
import { ContractEntity } from './contract.entity';
import { DocumentEntity } from './document.entity';
import { UserEntity } from './user.entity';

@Entity('colaborators')
@Index('IDX_colaborators_name_surname', ['nombre', 'apellidoPaterno'])
@Index('IDX_colaborators_status', ['status'])
@Index('IDX_colaborators_numero_documento_group_id', ['numeroDocumento', 'groupId'], { unique: true })
@Index('IDX_colaborators_email_group_id', ['email', 'groupId'], { unique: true })
export class ColaboratorEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @EnumColumn({
    enum: ['rut', 'pasaporte', 'dni', 'otro'],
    name: 'tipo_documento',
  })
  tipoDocumento!: string;

  @Column({ type: 'varchar', length: 50, name: 'numero_documento' })
  numeroDocumento!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 100, name: 'apellido_paterno' })
  apellidoPaterno!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'apellido_materno' })
  apellidoMaterno?: string;

  @Column({ type: 'varchar', length: 100 })
  nacionalidad!: string;

  @EnumColumn({
    enum: ['masculino', 'femenino', 'otro'],
  })
  sexo!: string;

  @EnumColumn({
    enum: ['soltero', 'casado', 'divorciado', 'viudo', 'union_civil'],
    name: 'estado_civil',
  })
  estadoCivil!: string;

  @Column({ type: 'date', name: 'fecha_nacimiento' })
  fechaNacimiento!: Date;

  @Column({ type: 'varchar', length: 2, name: 'pais_residencia', default: 'CL' })
  paisResidencia!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  comuna?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'estado_region' })
  estadoRegion?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'ciudad_municipio' })
  ciudadMunicipio?: string;

  @Column({ type: 'varchar', length: 255, name: 'direccion_residencia' })
  direccionResidencia!: string;

  @Column({ type: 'varchar', length: 20 })
  telefono!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'contacto_emergencia' })
  contactoEmergencia?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'telefono_emergencia' })
  telefonoEmergencia?: string;

  @Column({ type: 'varchar', length: 100 })
  profesion!: string;

  @Column({ type: 'varchar', length: 100 })
  cargo!: string;

  @Column({ type: 'integer', name: 'group_id' })
  @Index('IDX_colaborators_group_id')
  groupId!: number;

  @EnumColumn({
    enum: ['activo', 'inactivo', 'suspendido', 'terminado'],
    default: 'activo',
  })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;

  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  userId?: string | null;

  @OneToOne(() => UserEntity, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity | null;

  @ManyToMany(() => ColaboratorGroupEntity, (group) => group.colaborators)
  groups!: ColaboratorGroupEntity[];

  @ManyToMany(() => ContractEntity, (contract) => contract.colaborators)
  @JoinTable({
    name: 'contract_colaborators',
    joinColumn: { name: 'colaborator_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'contract_id', referencedColumnName: 'id' },
  })
  contracts!: ContractEntity[];

  @ManyToMany(() => DocumentEntity)
  @JoinTable({
    name: 'document_colaborators',
    joinColumn: { name: 'colaborator_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'document_id', referencedColumnName: 'id' },
  })
  documents!: DocumentEntity[];
}
