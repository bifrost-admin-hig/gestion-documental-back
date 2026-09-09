import { CreateDivisionUseCase } from "../use-cases/create-division.use-case";
import { UpdateDivisionUseCase } from "../use-cases/update-division.use-case";
import { DeleteDivisionUseCase } from "../use-cases/delete-division.use-case";
import { GetDivisionUseCase } from "../use-cases/get-division.use-case";
import { ListDivisionsUseCase } from "../use-cases/list-divisions.use-case";
import { CreateDivisionDto } from "../dtos/create-division.dto";
import { UpdateDivisionDto } from "../dtos/update-division.dto";

export class DivisionController {
  constructor(
    private readonly createDivisionUseCase: CreateDivisionUseCase,
    private readonly updateDivisionUseCase: UpdateDivisionUseCase,
    private readonly deleteDivisionUseCase: DeleteDivisionUseCase,
    private readonly getDivisionUseCase: GetDivisionUseCase,
    private readonly listDivisionsUseCase: ListDivisionsUseCase,
  ) {}

  public async create(dto: CreateDivisionDto) {
    return await this.createDivisionUseCase.execute(dto);
  }

  public async update(dto: UpdateDivisionDto) {
    return await this.updateDivisionUseCase.execute(dto);
  }

  public async delete(id: string) {
    return await this.deleteDivisionUseCase.execute(id);
  }

  public async get(id: string) {
    return await this.getDivisionUseCase.execute(id);
  }

  public async list() {
    return await this.listDivisionsUseCase.execute();
  }
}
