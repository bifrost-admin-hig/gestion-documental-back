// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const isFunction = (value: unknown): value is Function => typeof value === 'function';

export const isString = (value: unknown): value is string => typeof value === 'string';
