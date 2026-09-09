export function parseNum(value: any): number | null {
  if (!value) return null;
  const id = Number(value);
  return isNaN(id) ? null : id;
}
