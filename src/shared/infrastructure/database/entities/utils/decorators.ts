import { Column, ColumnOptions } from 'typeorm';

interface EnumColumnOptions extends Omit<ColumnOptions, 'type'> {
  enum: (string | number)[];
}

export function EnumColumn(options: EnumColumnOptions) {
  const dbType = process.env.DB_TYPE || process.env.TEST_DB_TYPE;
  const isTest = process.env.NODE_ENV === 'test';

  // If dbType is explicitly sqlite/sqljs OR if we are in test mode and no dbType is set (defaults to sqljs)
  const isSqlite = dbType === 'sqljs' || dbType === 'sqlite' || dbType === 'better-sqlite3' || (isTest && !dbType);

  if (!isSqlite) {
    return Column({ type: 'enum', ...options });
  }
  // sqlite/sqljs does not support enum types, so we simulate it
  const length = options.enum.reduce((max: number, val) => Math.max(max, String(val).length), 0) || 5;
  const { enum: _enum, ...rest } = options as any;
  return Column({
    type: 'varchar',
    ...rest,
    length,
    default: String(options.default) || String(options.enum[0]),
  });
}
