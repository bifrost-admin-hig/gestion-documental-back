import { IFamilyRepository } from '../repositories/family.repository.interface';
import { Family } from '../entities/family.entity';
import { NotFoundError } from '@shared/domain/errors';

export class GetFamilyByIdUseCase {
  constructor(private readonly familyRepository: IFamilyRepository) {}

  public async execute(id: string): Promise<Family> {
    const family = await this.familyRepository.findById(id);
    if (!family) {
      throw new NotFoundError('Familia no encontrada');
    }
    return family;
  }
}

export class GetAllFamiliesUseCase {
  constructor(private readonly familyRepository: IFamilyRepository) {}

  public async execute(groupId?: number): Promise<Family[]> {
    return await this.familyRepository.findAll(groupId);
  }
}
