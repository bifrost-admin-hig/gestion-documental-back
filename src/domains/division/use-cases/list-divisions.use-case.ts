import { Division } from "../entities/division.entity";
import { DivisionRepository } from "../repositories/division.repository";

export class ListDivisionsUseCase {
  constructor(private readonly divisionRepository: DivisionRepository) {}

  public async execute(groupId?: number): Promise<Division[]> {
    return await this.divisionRepository.findAll(groupId);
  }
}
