import { Area } from "../entities/area.entity";
import { AreaRepository } from "../repositories/area.repository";
import { NotFoundError } from "@shared/domain/errors";

export class GetAreaUseCase {
  constructor(private readonly areaRepository: AreaRepository) {}

  public async execute(id: string): Promise<Area> {
    const area = await this.areaRepository.findById(id);
    if (!area) {
      throw new NotFoundError("Area", id.toString());
    }

    return area;
  }
}
