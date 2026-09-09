import { Division } from "../entities/division.entity";
import { DivisionRepository } from "../repositories/division.repository";
import { UpdateDivisionDto } from "../dtos/update-division.dto";
import { NotFoundError } from "@shared/domain/errors";

export class UpdateDivisionUseCase {
  constructor(private readonly divisionRepository: DivisionRepository) {}

  public async execute(dto: UpdateDivisionDto): Promise<Division> {
    const existingDivision = await this.divisionRepository.findById(dto.id);
    if (!existingDivision) {
      throw new NotFoundError('Division', dto.id);
    }

    const updatedDivision = new Division({
      id: dto.id,
      name: dto.name ?? existingDivision.name,
      description: dto.description !== undefined ? dto.description : existingDivision.description,
      groupId: dto.groupId ?? existingDivision.groupId,
      areaId: dto.areaId ?? existingDivision.areaId,
    });

    return await this.divisionRepository.update(updatedDivision);
  }
}
