import { CreateAreaUseCase } from "../use-cases/create-area.use-case";
import { UpdateAreaUseCase } from "../use-cases/update-area.use-case";
import { DeleteAreaUseCase } from "../use-cases/delete-area.use-case";
import { GetAreaUseCase } from "../use-cases/get-area.use-case";
import { ListAreasUseCase } from "../use-cases/list-areas.use-case";
import { CreateAreaDto } from "../dtos/create-area.dto";
import { UpdateAreaDto } from "../dtos/update-area.dto";

export class AreaController {
  constructor(
    private readonly createAreaUseCase: CreateAreaUseCase,
    private readonly updateAreaUseCase: UpdateAreaUseCase,
    private readonly deleteAreaUseCase: DeleteAreaUseCase,
    private readonly getAreaUseCase: GetAreaUseCase,
    private readonly listAreasUseCase: ListAreasUseCase,
  ) {}

  public async create(dto: CreateAreaDto) {
    return await this.createAreaUseCase.execute(dto);
  }

  public async update(dto: UpdateAreaDto) {
    return await this.updateAreaUseCase.execute(dto);
  }

  public async delete(id: string) {
    return await this.deleteAreaUseCase.execute(id);
  }

  public async get(id: string) {
    return await this.getAreaUseCase.execute(id);
  }

  public async list() {
    return await this.listAreasUseCase.execute();
  }
}
