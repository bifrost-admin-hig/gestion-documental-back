import { Repository, IsNull } from 'typeorm';
import { ContractRepository } from '@domains/contract/repositories/contract.repository';
import { Contract, CreateContractProps, UpdateContractProps } from '@domains/contract/entities/contract.entity';
import { Colaborator } from '@domains/colaborators/entities/colaborator.entity';
import { ContractStatus, ContractType, JornadaTrabajo } from '@domains/contract/value-objects/contract-enums';
import { ContractEntity } from '../database/entities/contract.entity';
import { AppDataSource } from '../database/typeorm.config';
import { NotFoundError, ValidationError } from '@shared/domain/errors';
import { DateUtils } from '@shared/utils/date';

export class TypeOrmContractRepository implements ContractRepository {
  private repository: Repository<ContractEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(ContractEntity);
  }

  async findById(id: string): Promise<Contract | null> {
    const contractEntity = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['areaRelation', 'divisionRelation', 'companyRelation'],
    });
    if (!contractEntity) return null;
    return this.toDomain(contractEntity);
  }

  async findAll(groupId?: number): Promise<Contract[]> {
    const where: any = { deletedAt: IsNull() };

    if (groupId !== undefined) {
      where.groupId = groupId;
    }

    const contractEntities = await this.repository.find({
      where,
      relations: ['areaRelation', 'divisionRelation', 'companyRelation'],
      order: { createdAt: 'DESC' },
    });
    return contractEntities.map(entity => this.toDomain(entity));
  }

  async save(contract: CreateContractProps): Promise<Contract> {
    const domain = new Contract(contract);
    const entity = this.toEntity(domain);
    const savedEntity = await this.repository.save(entity);
    return this.toDomain(savedEntity);
  }

  async update(props: UpdateContractProps | Contract): Promise<Contract> {
    // Handle both UpdateContractProps and full Contract objects
    const id = 'id' in props ? props.id : (props as Contract).id;

    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError('Contract not found');
    }

    // If it's a full Contract object (from use case), convert it to entity and save
    if (props instanceof Contract) {
      const updatedEntity = this.toEntity(props);
      const savedEntity = await this.repository.save(updatedEntity);
      return this.toDomain(savedEntity);
    }

    // Otherwise, it's UpdateContractProps - update only provided fields
    const domain = this.toDomain(entity);

    // Update only the fields that are provided
    if (props.rutSociedad !== undefined) domain.rutSociedad = props.rutSociedad;
    if (props.nombreColaborador !== undefined) domain.nombreColaborador = props.nombreColaborador;
    if (props.administradorContratoMandante !== undefined) domain.administradorContratoMandante = props.administradorContratoMandante;
    if (props.administradorContratoEmpresa !== undefined) domain.administradorContratoEmpresa = props.administradorContratoEmpresa;
    if (props.rutAdministradorContrato !== undefined) domain.rutAdministradorContrato = props.rutAdministradorContrato;
    if (props.contractNumber !== undefined) domain.contractNumber = props.contractNumber;
    if (props.nombreMandante !== undefined) domain.nombreMandante = props.nombreMandante;
    if (props.division !== undefined) domain.division = props.division;
    if (props.area !== undefined) domain.area = props.area;
    if (props.areaId !== undefined) domain.areaId = props.areaId;
    if (props.divisionId !== undefined) domain.divisionId = props.divisionId;
    if (props.companyId !== undefined) domain.companyId = props.companyId;
    if (props.descripcionServicio !== undefined) domain.descripcionServicio = props.descripcionServicio;
    if (props.nombreProyecto !== undefined) domain.nombreProyecto = props.nombreProyecto;
    if (props.dotacionPersonal !== undefined) domain.dotacionPersonal = props.dotacionPersonal;
    if (props.dotacionVehiculos !== undefined) domain.dotacionVehiculos = props.dotacionVehiculos;
    if (props.employeeId !== undefined) domain.employeeId = props.employeeId;
    if (props.managerId !== undefined) domain.managerId = props.managerId;
    if (props.contractType !== undefined) domain.contractType = props.contractType as any;
    if (props.jornadaTrabajo !== undefined) domain.jornadaTrabajo = props.jornadaTrabajo as any;
    if (props.status !== undefined) domain.status = props.status as any;

    // Parse dates only if they are provided
    if (props.startDate !== undefined) domain.startDate = DateUtils.parse(props.startDate);
    if (props.endDate !== undefined) domain.endDate = DateUtils.parse(props.endDate);

    const updatedEntity = this.toEntity(domain);
    const savedEntity = await this.repository.save(updatedEntity);
    return this.toDomain(savedEntity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async findByRutSociedad(rutSociedad: string): Promise<Contract[]> {
    const contractEntities = await this.repository.find({
      where: { rutSociedad, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return contractEntities.map(entity => this.toDomain(entity));
  }

  async findByNombreColaborador(nombre: string): Promise<Contract[]> {
    const contractEntities = await this.repository.find({
      where: { nombreColaborador: nombre, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return contractEntities.map(entity => this.toDomain(entity));
  }

  async findByColaboratorId(colaboratorId: string): Promise<Contract[]> {
    const contractEntities = await this.repository.createQueryBuilder('contract')
      .innerJoin('contract.colaborators', 'colaborator')
      .where('colaborator.id = :colaboratorId', { colaboratorId })
      .orderBy('contract.createdAt', 'DESC')
      .getMany();

    return contractEntities.map(entity => this.toDomain(entity));
  }

  async findByStatus(status: ContractStatus): Promise<Contract[]> {
    const contractEntities = await this.repository.find({
      where: { status, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return contractEntities.map(entity => this.toDomain(entity));
  }

  async findByContractType(type: ContractType): Promise<Contract[]> {
    const contractEntities = await this.repository.find({
      where: { contractType: type, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return contractEntities.map(entity => this.toDomain(entity));
  }

  async findByNombreMandante(nombreMandante: string): Promise<Contract[]> {
    const contractEntities = await this.repository.find({
      where: { nombreMandante, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return contractEntities.map(entity => this.toDomain(entity));
  }

  async findByDivision(division: string): Promise<Contract[]> {
    const contractEntities = await this.repository.find({
      where: { division, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return contractEntities.map(entity => this.toDomain(entity));
  }

  async findByArea(area: string): Promise<Contract[]> {
    const contractEntities = await this.repository.find({
      where: { area, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return contractEntities.map(entity => this.toDomain(entity));
  }

  async findByJornadaTrabajo(jornada: JornadaTrabajo): Promise<Contract[]> {
    const contractEntities = await this.repository.find({
      where: { jornadaTrabajo: jornada, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return contractEntities.map(entity => this.toDomain(entity));
  }

  async findByContractNumber(contractNumber: string): Promise<Contract | null> {
    const contractEntity = await this.repository.findOne({
      where: { contractNumber, deletedAt: IsNull() },
    });
    if (!contractEntity) return null;
    return this.toDomain(contractEntity);
  }

  async existsByContractNumber(contractNumber: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { contractNumber, deletedAt: IsNull() },
    });
    return count > 0;
  }

  async findActiveContracts(): Promise<Contract[]> {
    const contractEntities = await this.repository.find({
      where: { status: ContractStatus.ACTIVE, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return contractEntities.map(entity => this.toDomain(entity));
  }

  async findExpiredContracts(): Promise<Contract[]> {
    const now = new Date();
    const contractEntities = await this.repository
      .createQueryBuilder('contract')
      .where('contract.endDate < :now', { now })
      .andWhere('contract.status = :status', { status: ContractStatus.ACTIVE })
      .andWhere('contract.deleted_at IS NULL')
      .orderBy('contract.createdAt', 'DESC')
      .getMany();

    return contractEntities.map(entity => this.toDomain(entity));
  }

  async findContractsEndingBefore(date: Date): Promise<Contract[]> {
    const contractEntities = await this.repository
      .createQueryBuilder('contract')
      .where('contract.endDate <= :date', { date })
      .andWhere('contract.status = :status', { status: ContractStatus.ACTIVE })
      .andWhere('contract.deleted_at IS NULL')
      .orderBy('contract.endDate', 'ASC')
      .getMany();

    return contractEntities.map(entity => this.toDomain(entity));
  }

  // Subcontract management methods
  async addSubcontract(contractId: string, subcontractId: string): Promise<void> {
    // Validate that contract and subcontract exist
    const contract = await this.repository.findOne({ where: { id: contractId } });
    if (!contract) {
      throw new NotFoundError('Contract not found');
    }

    const subcontract = await this.repository.findOne({ where: { id: subcontractId } });
    if (!subcontract) {
      throw new NotFoundError('Subcontract not found');
    }

    // Validate that a contract cannot be assigned to itself
    if (contractId === subcontractId) {
      throw new ValidationError('A contract cannot be assigned as its own subcontract', 'subcontractId');
    }


    // Insert the relationship
    const subcontractRepo = AppDataSource.getRepository('contract_subcontracts');

    try {
      await subcontractRepo
        .createQueryBuilder()
        .insert()
        .into('contract_subcontracts')
        .values({
          contractId,
          subcontractId,
        })
        .execute();
    } catch (error: any) {
      // Handle duplicate relationship error
      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
        throw new Error('This subcontract relationship already exists');
      }
      throw error;
    }
  }

  async removeSubcontract(contractId: string, subcontractId: string): Promise<void> {
    const subcontractRepo = AppDataSource.getRepository('contract_subcontracts');

    const result = await subcontractRepo
      .createQueryBuilder()
      .delete()
      .from('contract_subcontracts')
      .where('contract_id = :contractId', { contractId })
      .andWhere('subcontract_id = :subcontractId', { subcontractId })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundError('Subcontract relationship not found');
    }
  }

  async findSubcontracts(contractId: string): Promise<Contract[]> {
    // Verify contract exists
    const contract = await this.repository.findOne({ where: { id: contractId, deletedAt: IsNull() } });
    if (!contract) {
      throw new NotFoundError('Contract not found');
    }

    // Find all subcontracts using a query builder with join
    const subcontracts = await this.repository
      .createQueryBuilder('contract')
      .innerJoin(
        'contract_subcontracts',
        'cs',
        'cs.subcontract_id = contract.id',
      )
      .where('cs.contract_id = :contractId', { contractId })
      .andWhere('contract.deleted_at IS NULL')
      .orderBy('contract.createdAt', 'DESC')
      .getMany();

    return subcontracts.map(entity => this.toDomain(entity));
  }

  async findParentContracts(contractId: string): Promise<Contract[]> {
    // Verify contract exists
    const contract = await this.repository.findOne({ where: { id: contractId, deletedAt: IsNull() } });
    if (!contract) {
      throw new NotFoundError('Contract not found');
    }

    // Find all parent contracts using a query builder with join
    const parents = await this.repository
      .createQueryBuilder('contract')
      .innerJoin(
        'contract_subcontracts',
        'cs',
        'cs.contract_id = contract.id',
      )
      .where('cs.subcontract_id = :contractId', { contractId })
      .andWhere('contract.deleted_at IS NULL')
      .orderBy('contract.createdAt', 'DESC')
      .getMany();

    return parents.map(entity => this.toDomain(entity));
  }

  // Colaborator management methods
  async addColaborator(contractId: string, colaboratorId: string): Promise<void> {
    const contract = await this.repository.findOne({ where: { id: contractId } });
    if (!contract) {
      throw new NotFoundError('Contract not found');
    }

    try {
      await this.repository
        .createQueryBuilder()
        .relation(ContractEntity, 'colaborators')
        .of(contractId)
        .add(colaboratorId);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
        throw new Error('This colaborator is already assigned to the contract');
      }
      throw error;
    }
  }

  async removeColaborator(contractId: string, colaboratorId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .relation(ContractEntity, 'colaborators')
      .of(contractId)
      .remove(colaboratorId);
  }

  async findColaborators(contractId: string): Promise<Colaborator[]> {
    const contract = await this.repository.findOne({
      where: { id: contractId },
      relations: ['colaborators'],
    });

    if (!contract) {
      throw new NotFoundError('Contract not found');
    }

    return contract.colaborators?.map((entity: any) => Colaborator.fromPersistence(entity)) ?? [];
  }

  private toDomain(entity: ContractEntity): Contract {

    return new Contract({
      id: entity.id,
      rutSociedad: entity.rutSociedad,
      nombreColaborador: entity.nombreColaborador,
      startDate: DateUtils.parse(entity.startDate),
      endDate: DateUtils.parse(entity.endDate),
      contractType: entity.contractType as ContractType,
      administradorContratoMandante: entity.administradorContratoMandante,
      administradorContratoEmpresa: entity.administradorContratoEmpresa,
      rutAdministradorContrato: entity.rutAdministradorContrato,
      contractNumber: entity.contractNumber,
      nombreMandante: entity.nombreMandante,
      division: entity.division,
      area: entity.area,
      areaId: entity.areaId,
      areaName: entity.areaRelation?.name,
      divisionId: entity.divisionId,
      divisionName: entity.divisionRelation?.name,
      companyId: entity.companyId,
      companyName: entity.companyRelation?.name,
      dotacionPersonal: entity.dotacionPersonal,
      dotacionVehiculos: entity.dotacionVehiculos,
      descripcionServicio: entity.descripcionServicio,
      nombreProyecto: entity.nombreProyecto,
      jornadaTrabajo: entity.jornadaTrabajo as JornadaTrabajo,
      status: entity.status as ContractStatus,
      employeeId: entity.employeeId,
      managerId: entity.managerId,
      groupId: entity.groupId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
      colaborators: entity.colaborators?.map((c: any) => Colaborator.fromPersistence(c)) ?? [],
    });
  }

  private toEntity(contract: Contract): ContractEntity {
    return {
      id: contract.id,
      rutSociedad: contract.rutSociedad,
      nombreColaborador: contract.nombreColaborador,
      startDate: DateUtils.toLocalDate(contract.startDate)!,
      endDate: DateUtils.toLocalDate(contract.endDate),
      contractType: contract.contractType,
      administradorContratoMandante: contract.administradorContratoMandante,
      administradorContratoEmpresa: contract.administradorContratoEmpresa,
      rutAdministradorContrato: contract.rutAdministradorContrato,
      contractNumber: contract.contractNumber,
      nombreMandante: contract.nombreMandante,
      division: contract.division,
      area: contract.area,
      areaId: contract.areaId,
      divisionId: contract.divisionId,
      companyId: contract.companyId,
      dotacionPersonal: contract.dotacionPersonal,
      dotacionVehiculos: contract.dotacionVehiculos,
      descripcionServicio: contract.descripcionServicio,
      nombreProyecto: contract.nombreProyecto,
      jornadaTrabajo: contract.jornadaTrabajo,
      status: contract.status,
      employeeId: contract.employeeId,
      managerId: contract.managerId,
      groupId: contract.groupId,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      deletedAt: contract.deletedAt || undefined,
    };
  }
}
