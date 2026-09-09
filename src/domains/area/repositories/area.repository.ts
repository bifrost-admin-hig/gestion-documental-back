import { Area } from "../entities/area.entity";

export interface AreaRepository {
  findById(id: string): Promise<Area | null>;
  findAll(groupId?: number): Promise<Area[]>;
  create(area: Area): Promise<Area>;
  update(area: Area): Promise<Area>;
  delete(id: string): Promise<void>;
}
