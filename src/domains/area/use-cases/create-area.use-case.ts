import { Area } from "../entities/area.entity";
import { AreaRepository } from "../repositories/area.repository";
import { CreateAreaDto } from "../dtos/create-area.dto";

export class CreateAreaUseCase {
  constructor(private readonly areaRepository: AreaRepository) {}

  public async execute(dto: CreateAreaDto): Promise<Area> {
    const area = new Area({
      name: dto.name,
      description: dto.description,
      groupId: dto.groupId,
    });

    return await this.areaRepository.create(area);
  }
}
