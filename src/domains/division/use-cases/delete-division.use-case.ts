import { DivisionRepository } from "../repositories/division.repository";
import { NotFoundError } from "@shared/domain/errors";

export class DeleteDivisionUseCase {
  constructor(private readonly divisionRepository: DivisionRepository) {}

  public async execute(id: string): Promise<void> {
    const division = await this.divisionRepository.findById(id);
    if (!division) {
      throw new NotFoundError('Division', id);
    }
    await this.divisionRepository.delete(id);
  }
}
