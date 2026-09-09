import { AreaRepository } from "../repositories/area.repository";
import { NotFoundError } from "@shared/domain/errors";

export class DeleteAreaUseCase {
  constructor(private readonly areaRepository: AreaRepository) {}

  public async execute(id: string): Promise<void> {
    const area = await this.areaRepository.findById(id);
    if (!area) {
      throw new NotFoundError("Area", id.toString());
    }

    await this.areaRepository.delete(id);
  }
}
