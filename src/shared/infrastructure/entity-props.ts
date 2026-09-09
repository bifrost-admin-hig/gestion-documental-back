export interface DBProps<K> {
  id?: K;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SoftDeleteProps {
  deletedAt?: Date;
}

export type BaseProps<T, E extends string = ''> = EntityProps<T, E | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export type EntityProps<T, E extends string = ''> = Omit<T, E | 'equals' | 'toJSON'>;
