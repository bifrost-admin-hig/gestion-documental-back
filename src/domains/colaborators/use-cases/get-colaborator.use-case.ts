import { ColaboratorRepository } from '../repositories/colaborator.repository';
import { Colaborator } from '../entities/colaborator.entity';
import { NotFoundError } from '@shared/domain/errors';

export class GetColaboratorUseCase {
  constructor(private readonly colaboratorRepository: ColaboratorRepository) {}

  public async execute(id: string): Promise<Colaborator> {
    const colaborator = await this.colaboratorRepository.findById(id);

    if (!colaborator) {
      throw new NotFoundError(`Colaborator with id ${id} not found`);
    }

    return colaborator;
  }

  public async getAll(groupId?: number, filters?: { contractId?: string }): Promise<Colaborator[]> {
    return await this.colaboratorRepository.findAll(groupId, filters);
  }

  public async getByDocumentNumber(numeroDocumento: string): Promise<Colaborator> {
    const colaborator = await this.colaboratorRepository.findByNumeroDocumento(numeroDocumento);

    if (!colaborator) {
      throw new NotFoundError(`Colaborator with document number ${numeroDocumento} not found`);
    }

    return colaborator;
  }

  public async getByEmail(email: string): Promise<Colaborator> {
    const colaborator = await this.colaboratorRepository.findByEmail(email);

    if (!colaborator) {
      throw new NotFoundError(`Colaborator with email ${email} not found`);
    }

    return colaborator;
  }

  public async getActiveColaborators(): Promise<Colaborator[]> {
    return await this.colaboratorRepository.findActiveColaborators();
  }

  public async searchByName(searchTerm: string): Promise<Colaborator[]> {
    return await this.colaboratorRepository.searchByName(searchTerm);
  }
}
