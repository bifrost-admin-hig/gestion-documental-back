import { Area } from "../entities/area.entity";
import { AreaRepository } from "../repositories/area.repository";

export class ListAreasUseCase {
  constructor(private readonly areaRepository: AreaRepository) {}

  public async execute(groupId?: number): Promise<Area[]> {
    return await this.areaRepository.findAll(groupId);
  }
}
