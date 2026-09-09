import { Area } from "../entities/area.entity";
import { AreaRepository } from "../repositories/area.repository";
import { UpdateAreaDto } from "../dtos/update-area.dto";
import { NotFoundError } from "@shared/domain/errors";

export class UpdateAreaUseCase {
  constructor(private readonly areaRepository: AreaRepository) {}

  public async execute(dto: UpdateAreaDto): Promise<Area> {
    const area = await this.areaRepository.findById(dto.id);
    if (!area) {
      throw new NotFoundError("Area", dto.id.toString());
    }

    if (dto.name) area.name = dto.name;
    if (dto.description) area.description = dto.description;
    if (dto.groupId) area.groupId = dto.groupId;

    return await this.areaRepository.update(area);
  }
}
