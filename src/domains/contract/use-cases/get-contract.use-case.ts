import { ContractRepository } from '../repositories/contract.repository';
import { Contract } from '../entities/contract.entity';
import { NotFoundError } from '@shared/domain/errors';
import { ContractStatus, ContractType, JornadaTrabajo } from '../value-objects/contract-enums';

export class GetContractByIdUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(id: string): Promise<Contract> {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new NotFoundError('Contract', id);
    }
    return contract;
  }
}

export class GetAllContractsUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(groupId?: number): Promise<Contract[]> {
    return await this.contractRepository.findAll(groupId);
  }
}

export class GetContractsByRutSociedadUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(rutSociedad: string): Promise<Contract[]> {
    return await this.contractRepository.findByRutSociedad(rutSociedad);
  }
}

export class GetContractsByNombreColaboradorUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(nombre: string): Promise<Contract[]> {
    return await this.contractRepository.findByNombreColaborador(nombre);
  }
}

export class GetContractsByStatusUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(status: ContractStatus): Promise<Contract[]> {
    return await this.contractRepository.findByStatus(status);
  }
}

export class GetContractsByTypeUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(type: ContractType): Promise<Contract[]> {
    return await this.contractRepository.findByContractType(type);
  }
}

export class GetContractsByMandanteUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(nombreMandante: string): Promise<Contract[]> {
    return await this.contractRepository.findByNombreMandante(nombreMandante);
  }
}

export class GetContractsByDivisionUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(division: string): Promise<Contract[]> {
    return await this.contractRepository.findByDivision(division);
  }
}

export class GetContractsByAreaUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(area: string): Promise<Contract[]> {
    return await this.contractRepository.findByArea(area);
  }
}

export class GetContractsByJornadaTrabajoUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(jornada: JornadaTrabajo): Promise<Contract[]> {
    return await this.contractRepository.findByJornadaTrabajo(jornada);
  }
}

export class GetContractByNumberUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(contractNumber: string): Promise<Contract> {
    const contract = await this.contractRepository.findByContractNumber(contractNumber);
    if (!contract) {
      throw new NotFoundError('Contract with number ' + contractNumber);
    }
    return contract;
  }
}

export class GetActiveContractsUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(): Promise<Contract[]> {
    return await this.contractRepository.findActiveContracts();
  }
}

export class GetExpiredContractsUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(): Promise<Contract[]> {
    return await this.contractRepository.findExpiredContracts();
  }
}

export class GetContractsEndingBeforeUseCase {
  constructor(private readonly contractRepository: ContractRepository) {}

  public async execute(date: Date): Promise<Contract[]> {
    return await this.contractRepository.findContractsEndingBefore(date);
  }
}
