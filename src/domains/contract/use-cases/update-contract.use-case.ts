import { ContractRepository } from '../repositories/contract.repository';
import { Contract, UpdateContractProps } from '../entities/contract.entity';
import { NotFoundError, ValidationError } from '@shared/domain/errors';
import { only } from '@shared/utils/objects';
import { GroupRepository } from '@domains/group/repositories/group.repository';

export class UpdateContractUseCase {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly groupRepository: GroupRepository,
  ) {}

  public async execute(request: UpdateContractProps): Promise<Contract> {
    const contract = await this.contractRepository.findById(request.id);
    if (!contract) {
      throw new NotFoundError('Contract', request.id);
    }

    // Verificar si el usuario es administrador
    const isUserAdmin = request.userRoles?.some(
      role => role.name?.toLowerCase() === 'admin' || role.name?.toLowerCase() === 'administrador',
    );

    // Validar editabilidad: permitir si es admin O si el contrato es editable
    if (!contract.isEditable() && !isUserAdmin) {
      throw new Error('Contract is not editable. Only contracts with start date in the future can be edited.');
    }

    if (request.rutSociedad) {
      contract.updateRutSociedad(request.rutSociedad);
    }

    if (request.nombreColaborador) {
      contract.updateNombreColaborador(request.nombreColaborador);
    }

    if (request.contractNumber) {
      contract.updateContractNumber(request.contractNumber);
    }

    if (request.contractType) {
      contract.updateContractType(request.contractType);
    }

    if (request.startDate) {
      contract.updateStartDate(new Date(request.startDate));
    }

    if (request.administradorContratoMandante) {
      contract.updateAdministradorContratoMandante(request.administradorContratoMandante);
    }

    if (request.administradorContratoEmpresa) {
      contract.updateAdministradorContratoEmpresa(request.administradorContratoEmpresa);
    }

    if (request.rutAdministradorContrato) {
      contract.updateRutAdministradorContrato(request.rutAdministradorContrato);
    }

    if (request.nombreMandante) {
      contract.updateNombreMandante(request.nombreMandante);
    }

    if (request.descripcionServicio !== undefined) {
      contract.updateDescripcionServicio(request.descripcionServicio);
    }

    if (request.division !== undefined) {
      contract.updateDivision(request.division);
    }

    if (request.area !== undefined) {
      contract.updateArea(request.area);
    }

    if (request.nombreProyecto !== undefined) {
      contract.updateNombreProyecto(request.nombreProyecto);
    }

    if (request.turnos !== undefined) {
      contract.updateTurnos(request.turnos);
    }

    if (request.jornadaTrabajo !== undefined) {
      contract.updateJornadaTrabajo(request.jornadaTrabajo);
    }

    if (request.dotacionPersonal !== undefined || request.dotacionVehiculos !== undefined) {
      contract.updateDotaciones(
        request.dotacionPersonal ?? contract.dotacionPersonal,
        request.dotacionVehiculos ?? contract.dotacionVehiculos,
      );
    }

    // Update group if provided
    if (request.groupId !== undefined && request.groupId !== contract.groupId) {
      const group = await this.groupRepository.findById(request.groupId);
      if (!group) {
        throw new ValidationError('Group not found', 'groupId');
      }
      contract.changeGroup(request.groupId);
    }

    if (request.endDate) {
      contract.extendContract(new Date(request.endDate));
    }

    const updateFields = only(contract, [
      'id',
      'rutSociedad',
      'nombreColaborador',
      'contractNumber',
      'startDate',
      'endDate',
      'contractType',
      'administradorContratoMandante',
      'administradorContratoEmpresa',
      'rutAdministradorContrato',
      'nombreMandante',
      'descripcionServicio',
      'nombreProyecto',
      'turnos',
      'division',
      'area',
      'jornadaTrabajo',
      'dotacionPersonal',
      'dotacionVehiculos',
      'groupId',
    ]);

    return await this.contractRepository.update(updateFields);
  }
}

export class ActivateContractUseCase {
  constructor(private readonly contractRepository: ContractRepository) { }

  public async execute(id: string): Promise<Contract> {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new NotFoundError('Contract', id);
    }

    contract.activate();
    return await this.contractRepository.update(contract);
  }
}

export class SuspendContractUseCase {
  constructor(private readonly contractRepository: ContractRepository) { }

  public async execute(id: string): Promise<Contract> {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new NotFoundError('Contract', id);
    }

    contract.suspend();
    return await this.contractRepository.update(contract);
  }
}

export class TerminateContractUseCase {
  constructor(private readonly contractRepository: ContractRepository) { }

  public async execute(id: string): Promise<Contract> {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new NotFoundError('Contract', id);
    }

    contract.terminate();
    return await this.contractRepository.update(contract);
  }
}

export class DeleteContractUseCase {
  constructor(private readonly contractRepository: ContractRepository) { }

  public async execute(id: string): Promise<void> {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new NotFoundError('Contract', id);
    }

    contract.softDelete();
    await this.contractRepository.update(contract);
  }
}
