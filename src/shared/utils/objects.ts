import { toArray } from "./array";

/** Takes an object and return a new object with the same keys except the specified keys */
export function except<T extends object, K extends RecordKey>(obj: T, keys: K | readonly K[]): Omit<T, K> {
  const excludeKeys = toArray(keys);
  const includeKeys = Object.keys(obj).filter((key) => !excludeKeys.includes(key)) as (keyof T)[];
  return only(obj, includeKeys);
}

/** Check if the given value is a plain object */
export function isObject(obj: unknown): obj is Record<RecordKey, unknown> {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

/** Validate if a value is in an object/enum */
export function isValid<T extends object>(value: unknown, enumType: T): value is T[keyof T] {
  return Object.values(enumType).includes(value);
}

export const mapObject = <T extends object, U>(obj: T, mapFn: (value: T[keyof T], key: keyof T) => U): Record<keyof T, U> => (
  Object.entries(obj).reduce((acc, [key, value]) => ({ ...acc, [key]: mapFn(value as T[keyof T], key as keyof T) }), {} as Record<keyof T, U>)
);

/** Takes an object and return a new object with the same keys except the empty values */
export function notEmpty<T extends object>(obj: T): FlatPartial<T> {
  const result = { ...obj };
  for (const key in result) {
    if (!result[key]) {
      delete result[key];
    }
  }
  return result;
}

export const only = <T extends object, K extends RecordKey>(obj: T, keys: K | readonly K[]): Pick<T, Extract<K, keyof T>> => (
  toArray(keys).reduce((result, key) => {
    // @ts-expect-error only copy keys that are in both: the object and the keys array
    if (key in obj) result[key] = obj[key];
    return result;
  }, {} as Pick<T, Extract<K, keyof T>>)
);

export const parseEnum = <T extends object>(value: unknown, enumType: T): T[keyof T] | null => (
  isValid(value, enumType) ? value : null
);

export function recordReplace<O extends object>(obj: O, key: RecordKey, value: unknown) {
  if (key in obj) obj[key as keyof O] = value as O[keyof O];
}
