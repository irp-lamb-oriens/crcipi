// Firestore rejects `undefined` values (see dreams.md, 2026-08-11). Every new
// write path strips them through this one helper instead of re-implementing it.
export function withoutUndefined<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}
