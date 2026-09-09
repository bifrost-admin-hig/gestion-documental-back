import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ColaboratorGroup } from '@domains/colaborator-group/entities/colaborator-group.entity';
import { Colaborator, ColaboratorProps } from '@domains/colaborators/entities/colaborator.entity';
import { EntityProps } from '@shared/infrastructure/entity-props';
import { ColaboratorEntity } from './colaborators.entity';
import { ContractEntity } from './contract.entity';
import {
  DocumentType,
  Gender,
  CivilStatus,
  ColaboratorStatus,
} from '@domains/colaborators/value-objects/colaborator-enums';

type ColaboratorGroupProps = EntityProps<ColaboratorGroup, 'colaborators'>;

@Entity('colaborator_groups')
export class ColaboratorGroupEntity implements ColaboratorGroupProps {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  name!: string;

  @Column({ name: 'contract_id', type: 'varchar', length: 36 })
  contractId!: string;

  @ManyToOne(() => ContractEntity)
  @JoinColumn({ name: 'contract_id' })
  contract!: ContractEntity;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToMany(() => ColaboratorEntity)
  @JoinTable({
    name: 'colaborator_group_colaborators',
    joinColumn: { name: 'colaborator_group_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'colaborator_id', referencedColumnName: 'id' },
  })
  colaborators!: ColaboratorEntity[];

  static fromDomain(group: ColaboratorGroup): ColaboratorGroupEntity {
    return Object.assign(new ColaboratorGroupEntity(), {
      id: group.id!,
      name: group.name,
      contractId: group.contractId,
      description: group.description,
      colaborators: group.colaborators || [],
    });
  }

  static toDomain(entity: ColaboratorGroupEntity): ColaboratorGroup {
    return new ColaboratorGroup({
      id: entity.id,
      name: entity.name,
      contractId: entity.contractId,
      description: entity.description,
      colaborators: entity.colaborators?.map(c => ColaboratorGroupEntity.colaboratorToDomain(c)) ?? [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private static colaboratorToDomain(entity: ColaboratorEntity): Colaborator {
    const props: ColaboratorProps = {
      id: entity.id,
      tipoDocumento: entity.tipoDocumento as DocumentType,
      numeroDocumento: entity.numeroDocumento,
      nombre: entity.nombre,
      apellidoPaterno: entity.apellidoPaterno,
      apellidoMaterno: entity.apellidoMaterno,
      nacionalidad: entity.nacionalidad,
      sexo: entity.sexo as Gender,
      estadoCivil: entity.estadoCivil as CivilStatus,
      fechaNacimiento: entity.fechaNacimiento instanceof Date
        ? entity.fechaNacimiento
        : new Date(entity.fechaNacimiento),
      paisResidencia: entity.paisResidencia,
      region: entity.region,
      comuna: entity.comuna,
      estadoRegion: entity.estadoRegion,
      ciudadMunicipio: entity.ciudadMunicipio,
      direccionResidencia: entity.direccionResidencia,
      telefono: entity.telefono,
      email: entity.email,
      contactoEmergencia: entity.contactoEmergencia,
      telefonoEmergencia: entity.telefonoEmergencia,
      profesion: entity.profesion,
      cargo: entity.cargo,
      status: entity.status as ColaboratorStatus,
      createdAt: entity.createdAt instanceof Date
        ? entity.createdAt
        : new Date(entity.createdAt),
      updatedAt: entity.updatedAt instanceof Date
        ? entity.updatedAt
        : new Date(entity.updatedAt),
      groupId: entity.groupId,
      contractIds: entity.contracts?.map(c => c.id),
    };
    return Colaborator.fromPersistence(props);
  }
}
