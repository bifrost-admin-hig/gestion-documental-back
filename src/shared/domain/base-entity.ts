export type BasicProps<WithSoftDelete extends boolean = false, KeyType = unknown> = {
  id: KeyType;
} & (WithSoftDelete extends true ? SoftDeleteProps : DateProps);

export interface DateProps {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeleteProps extends DateProps {
  deletedAt: Date | null;
}

export type NotNullId<Cl extends BasicProps<boolean>> = Partial<Omit<Cl, 'id'>> & {id: NonNullable<Cl['id']>};

export abstract class BaseEntity {
  abstract id: unknown;
  abstract createdAt: Date;
  abstract updatedAt: Date;

  equals<T extends BaseEntity>(other: T): boolean {
    return this.id !== null && this.id === other.id;
  }

  abstract toJSON(): unknown;
}

export abstract class SoftDeleteEntity extends BaseEntity {
  abstract deletedAt: Date | null;

  softDelete(): void {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  restore(): void {
    this.deletedAt = null;
    this.updatedAt = new Date();
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}

export interface Repository<Cl extends BaseEntity, IdType = Cl['id']> {
  findById(id: Exclude<IdType, null>): Promise<Cl | null>;
  findAll(): Promise<Cl[]>;
  save(request: Partial<Omit<Cl, 'id'>>): Promise<Cl>;
  update(request: NotNullId<Cl>): Promise<Cl>;
  delete(id: Exclude<IdType, null>): Promise<void>;
}
