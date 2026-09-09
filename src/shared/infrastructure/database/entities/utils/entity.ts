export abstract class EntityFillable<C> {
  constructor(partial?: Partial<C>) {
    Object.assign(this, partial);
  }
}
