import { Repository, IsNull } from 'typeorm';
import { ColaboratorRepository } from '@domains/colaborators/repositories/colaborator.repository';
import { Colaborator, ColaboratorProps } from '@domains/colaborators/entities/colaborator.entity';
import {
  ColaboratorStatus,
  DocumentType,
  Gender,
  CivilStatus,
} from '@domains/colaborators/value-objects/colaborator-enums';
import { ColaboratorEntity } from '../database/entities/colaborators.entity';
import { ContractEntity } from '../database/entities/contract.entity';
import { AppDataSource } from '../database/typeorm.config';

export class TypeOrmColaboratorRepository implements ColaboratorRepository {
  private repository: Repository<ColaboratorEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(ColaboratorEntity);
  }

  async findById(id: string): Promise<Colaborator | null> {
    const colaboratorEntity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['contracts', 'user'],
    });
    if (!colaboratorEntity) return null;
    return this.toDomain(colaboratorEntity);
  }

  async findAll(groupId?: number, filters?: { contractId?: string }): Promise<Colaborator[]> {
    const query = this.repository
      .createQueryBuilder('colaborator')
      .leftJoinAndSelect('colaborator.contracts', 'contracts')
      .where('colaborator.deleted_at IS NULL')
      .orderBy('colaborator.createdAt', 'DESC');

    if (groupId) {
      query.andWhere('colaborator.group_id = :groupId', { groupId });
    }

    if (filters?.contractId && filters.contractId !== 'undefined' && filters.contractId !== 'null' && filters.contractId.trim() !== '') {
      query.andWhere('contracts.id = :contractId', { contractId: filters.contractId });
    }

    const colaboratorEntities = await query.getMany();
    return colaboratorEntities.map((entity) => this.toDomain(entity));
  }

  async save(colaborator: Colaborator): Promise<Colaborator> {
    const colaboratorEntity = this.toEntity(colaborator);
    const savedEntity = await this.repository.save(colaboratorEntity);
    // Reload to get relations
    return (await this.findById(savedEntity.id!))!;
  }

  async update(colaborator: Colaborator): Promise<Colaborator> {
    const colaboratorEntity = this.toEntity(colaborator);
    // Exclude relations (many-to-many) from update
    const { contracts: _contracts, ...colaboratorData } = colaboratorEntity;
    await this.repository.update(colaborator.id, colaboratorData);
    return (await this.findById(colaborator.id))!;
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async findByNumeroDocumento(
    numeroDocumento: string,
  ): Promise<Colaborator | null> {
    const colaboratorEntity = await this.repository.findOne({
      where: { numeroDocumento, deletedAt: IsNull() },
      relations: ['contracts', 'user'],
    });
    if (!colaboratorEntity) return null;
    return this.toDomain(colaboratorEntity);
  }

  async findByNumeroDocumentoAndGroupId(
    numeroDocumento: string,
    groupId: number,
  ): Promise<Colaborator | null> {
    const entity = await this.repository.findOne({
      where: { numeroDocumento, groupId, deletedAt: IsNull() },
      relations: ['contracts'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<Colaborator | null> {
    const colaboratorEntity = await this.repository.findOne({
      where: { email: email.toLowerCase(), deletedAt: IsNull() },
      relations: ['contracts', 'user'],
    });
    if (!colaboratorEntity) return null;
    return this.toDomain(colaboratorEntity);
  }

  async findByEmailAndGroupId(email: string, groupId: number): Promise<Colaborator | null> {
    const entity = await this.repository.findOne({
      where: { email: email.toLowerCase(), groupId, deletedAt: IsNull() },
      relations: ['contracts', 'user'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByNombre(nombre: string): Promise<Colaborator[]> {
    const colaboratorEntities = await this.repository.find({
      where: { nombre, deletedAt: IsNull() },
      relations: ['contracts'],
      order: { createdAt: 'DESC' },
    });
    return colaboratorEntities.map((entity) => this.toDomain(entity));
  }

  async findByStatus(status: ColaboratorStatus): Promise<Colaborator[]> {
    const colaboratorEntities = await this.repository.find({
      where: { status, deletedAt: IsNull() },
      relations: ['contracts'],
      order: { createdAt: 'DESC' },
    });
    return colaboratorEntities.map((entity) => this.toDomain(entity));
  }

  async findByDocumentType(tipo: DocumentType): Promise<Colaborator[]> {
    const colaboratorEntities = await this.repository.find({
      where: { tipoDocumento: tipo, deletedAt: IsNull() },
      relations: ['contracts'],
      order: { createdAt: 'DESC' },
    });
    return colaboratorEntities.map((entity) => this.toDomain(entity));
  }

  async findByNacionalidad(nacionalidad: string): Promise<Colaborator[]> {
    const colaboratorEntities = await this.repository.find({
      where: { nacionalidad, deletedAt: IsNull() },
      relations: ['contracts'],
      order: { createdAt: 'DESC' },
    });
    return colaboratorEntities.map((entity) => this.toDomain(entity));
  }

  async findByPaisResidencia(pais: string): Promise<Colaborator[]> {
    const colaboratorEntities = await this.repository.find({
      where: { paisResidencia: pais, deletedAt: IsNull() },
      relations: ['contracts'],
      order: { createdAt: 'DESC' },
    });
    return colaboratorEntities.map((entity) => this.toDomain(entity));
  }

  async findByRegion(region: string): Promise<Colaborator[]> {
    const colaboratorEntities = await this.repository.find({
      where: { region, deletedAt: IsNull() },
      relations: ['contracts'],
      order: { createdAt: 'DESC' },
    });
    return colaboratorEntities.map((entity) => this.toDomain(entity));
  }

  async findByComuna(comuna: string): Promise<Colaborator[]> {
    const colaboratorEntities = await this.repository.find({
      where: { comuna, deletedAt: IsNull() },
      relations: ['contracts'],
      order: { createdAt: 'DESC' },
    });
    return colaboratorEntities.map((entity) => this.toDomain(entity));
  }

  async findByCargo(cargo: string): Promise<Colaborator[]> {
    const colaboratorEntities = await this.repository.find({
      where: { cargo, deletedAt: IsNull() },
      relations: ['contracts'],
      order: { createdAt: 'DESC' },
    });
    return colaboratorEntities.map((entity) => this.toDomain(entity));
  }

  async findActiveColaborators(): Promise<Colaborator[]> {
    const colaboratorEntities = await this.repository.find({
      where: { status: ColaboratorStatus.ACTIVE, deletedAt: IsNull() },
      relations: ['contracts'],
      order: { createdAt: 'DESC' },
    });
    return colaboratorEntities.map((entity) => this.toDomain(entity));
  }

  async searchByName(searchTerm: string): Promise<Colaborator[]> {
    const colaboratorEntities = await this.repository
      .createQueryBuilder('colaborator')
      .leftJoinAndSelect('colaborator.contracts', 'contracts')
      .where('colaborator.deleted_at IS NULL')
      .andWhere(
        '(colaborator.nombre ILIKE :searchTerm OR colaborator.apellidoPaterno ILIKE :searchTerm OR colaborator.apellidoMaterno ILIKE :searchTerm)',
        { searchTerm: `%${searchTerm}%` },
      )
      .orderBy('colaborator.createdAt', 'DESC')
      .getMany();

    return colaboratorEntities.map((entity) => this.toDomain(entity));
  }

  async findIn(ids: string[]): Promise<Colaborator[]> {
    const colaboratorEntities = await this.repository
      .createQueryBuilder('colaborator')
      .leftJoinAndSelect('colaborator.contracts', 'contracts')
      .where('colaborator.deleted_at IS NULL')
      .andWhereInIds(ids)
      .getMany();

    return colaboratorEntities.map((entity) => this.toDomain(entity));
  }

  async findByIdWithGroups(id: string): Promise<Colaborator | null> {
    const colaboratorEntity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['groups', 'contracts', 'user'],
    });
    if (!colaboratorEntity) return null;
    return this.toDomain(colaboratorEntity);
  }

  async updateContracts(
    colaboratorId: string,
    contractIds: string[],
  ): Promise<void> {
    const colaborator = await this.repository.findOne({
      where: { id: colaboratorId, deletedAt: IsNull() },
      relations: ['contracts'],
    });

    if (!colaborator) {
      throw new Error('Colaborator not found');
    }

    // We can use the repository to save the relation
    // Or we can use query builder to replace relations
    colaborator.contracts = contractIds.map((id) => ({ id } as ContractEntity));
    await this.repository.save(colaborator);
  }

  async findByUserId(userId: string): Promise<Colaborator | null> {
    const entity = await this.repository.findOne({
      where: { userId, deletedAt: IsNull() },
      relations: ['contracts', 'user'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  private toDomain(entity: ColaboratorEntity): Colaborator {
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
      fechaNacimiento:
        entity.fechaNacimiento instanceof Date
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
      groupId: entity.groupId,
      status: entity.status as ColaboratorStatus,
      createdAt:
        entity.createdAt instanceof Date
          ? entity.createdAt
          : new Date(entity.createdAt),
      updatedAt:
        entity.updatedAt instanceof Date
          ? entity.updatedAt
          : new Date(entity.updatedAt),
      deletedAt: entity.deletedAt
        ? (entity.deletedAt instanceof Date
          ? entity.deletedAt
          : new Date(entity.deletedAt))
        : null,
      contractIds: entity.contracts?.map((c) => c.id),
      userId: entity.userId ?? null,
    };
    return Colaborator.fromPersistence(props);
  }

  private toEntity(colaborator: Colaborator): Partial<ColaboratorEntity> {
    return {
      id: colaborator.id,
      tipoDocumento: colaborator.tipoDocumento,
      numeroDocumento: colaborator.numeroDocumento,
      nombre: colaborator.nombre,
      apellidoPaterno: colaborator.apellidoPaterno,
      apellidoMaterno: colaborator.apellidoMaterno,
      nacionalidad: colaborator.nacionalidad,
      sexo: colaborator.sexo,
      estadoCivil: colaborator.estadoCivil,
      fechaNacimiento: colaborator.fechaNacimiento,
      paisResidencia: colaborator.paisResidencia,
      region: colaborator.region,
      comuna: colaborator.comuna,
      estadoRegion: colaborator.estadoRegion,
      ciudadMunicipio: colaborator.ciudadMunicipio,
      direccionResidencia: colaborator.direccionResidencia,
      telefono: colaborator.telefono,
      email: colaborator.email,
      contactoEmergencia: colaborator.contactoEmergencia,
      telefonoEmergencia: colaborator.telefonoEmergencia,
      profesion: colaborator.profesion,
      cargo: colaborator.cargo,
      groupId: colaborator.groupId,
      status: colaborator.status,
      createdAt: colaborator.createdAt,
      updatedAt: colaborator.updatedAt,
      deletedAt: colaborator.deletedAt,
      userId: colaborator.userId ?? null,
      contracts: colaborator.contractIds?.map((id) => ({ id } as ContractEntity)),
    };
  }
}
