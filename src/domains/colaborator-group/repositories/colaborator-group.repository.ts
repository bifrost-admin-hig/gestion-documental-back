import { CreateColaboratorGroupProps, ColaboratorGroup, UpdateColaboratorGroupProps } from '../entities/colaborator-group.entity';

export interface ColaboratorGroupRepository {
  assignColaboratorsToGroup(groupId: number, colaboratorIds: string[]): Promise<void>;
  findById(id: number): Promise<ColaboratorGroup | null>;
  findByName(name: string): Promise<ColaboratorGroup | null>;
  findIn(ids: number[]): Promise<ColaboratorGroup[]>;
  findAll(groupId?: number): Promise<ColaboratorGroup[]>;
  save(request: CreateColaboratorGroupProps): Promise<ColaboratorGroup>;
  update(request: UpdateColaboratorGroupProps): Promise<ColaboratorGroup>;
  delete(id: number): Promise<void>;
}
