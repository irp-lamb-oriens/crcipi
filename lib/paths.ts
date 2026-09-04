// Pure path helpers for reading and mutating nested content objects.
// Paths use dot notation with numeric segments for array indices, e.g.
// "home.initiatives.items.0.title".

type UnknownRecord = Record<string, unknown>;

export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => deepClone(item)) as T;
  const out: UnknownRecord = {};
  for (const key of Object.keys(value as UnknownRecord)) {
    out[key] = deepClone((value as UnknownRecord)[key]);
  }
  return out as T;
}

function parsePath(path: string): string[] {
  return path
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getByPath(root: unknown, path: string): unknown {
  const parts = parsePath(path);
  let current = root;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as UnknownRecord)[part];
  }
  return current;
}

export function setByPath(root: unknown, path: string, value: unknown): unknown {
  const parts = parsePath(path);
  if (parts.length === 0) return value;

  const clone = deepClone(root as unknown);
  let current = clone as UnknownRecord;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextKey = parts[i + 1];
    const isArrayIndex = /^\d+$/.test(nextKey);

    const existing = current[key];
    if (isArrayIndex) {
      if (!Array.isArray(existing)) {
        current[key] = [];
      }
    } else if (typeof existing !== "object" || existing === null) {
      current[key] = {};
    }
    current = current[key] as UnknownRecord;
  }

  (current as UnknownRecord)[parts[parts.length - 1]] = value;
  return clone;
}

export function addItemAtPath(
  root: unknown,
  path: string,
  item: unknown
): unknown {
  const current = getByPath(root, path);
  const arr = Array.isArray(current) ? current : [];
  return setByPath(root, path, [...arr, deepClone(item)]);
}

export function removeItemAtPath(
  root: unknown,
  path: string,
  index: number
): unknown {
  const current = getByPath(root, path);
  const arr = Array.isArray(current) ? current : [];
  const next = arr.filter((_, i) => i !== index);
  return setByPath(root, path, next);
}

export function moveItemAtPath(
  root: unknown,
  path: string,
  from: number,
  to: number
): unknown {
  const current = getByPath(root, path);
  const arr = Array.isArray(current) ? current : [];
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) {
    return root;
  }
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return setByPath(root, path, next);
}