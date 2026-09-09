import { Division } from "../entities/division.entity";
import { DivisionRepository } from "../repositories/division.repository";
import { NotFoundError } from "@shared/domain/errors";

export class GetDivisionUseCase {
  constructor(private readonly divisionRepository: DivisionRepository) {}

  public async execute(id: string): Promise<Division> {
    const division = await this.divisionRepository.findById(id);
    if (!division) {
      throw new NotFoundError('Division', id);
    }
    return division;
  }
}
