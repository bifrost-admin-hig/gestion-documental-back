import { Division } from "../entities/division.entity";
import { DivisionRepository } from "../repositories/division.repository";
import { CreateDivisionDto } from "../dtos/create-division.dto";

export class CreateDivisionUseCase {
  constructor(private readonly divisionRepository: DivisionRepository) {}

  public async execute(dto: CreateDivisionDto): Promise<Division> {
    const division = new Division({
      name: dto.name,
      description: dto.description,
      groupId: dto.groupId,
      areaId: dto.areaId,
    });

    return await this.divisionRepository.create(division);
  }
}
