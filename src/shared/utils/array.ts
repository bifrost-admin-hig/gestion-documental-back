export const randomElement = <A>(array: A[]): A | undefined => {
  if (array.length === 0) return undefined;
  const index = Math.floor(Math.random() * array.length);
  return array[index];
};

/** Takes a value or an array and return an array */
// @ts-expect-error returns an array
export const toArray = <T>(array: T): T extends (infer U)[] ? U[] : T[] => Array.isArray(array) ? array : [array];

/** Merge two arrays removing duplicates. */
export const unique = <A>(array: A[]): A[] => [...new Set(array)];
