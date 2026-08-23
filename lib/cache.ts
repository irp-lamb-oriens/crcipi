// Layered cache: localStorage > in-memory semi-LIFO stack > DB.
//
// Goals, all enforced here:
//   * Granular path keying — every entry is a precise document or subdocument
//     path, never one glued blob, so a mutation only touches its own subtree
//     and can never race a sibling node.
//   * Real-CRUD only — incoming values are canonical-serialized and compared
//     against the stored value before committing, so no-change operations from
//     multiple sources are dropped (no write, no invalidation). This is the
//     guard against a no-change op storm from several writers.
//   * Semi-LIFO eviction — when a layer exceeds its byte budget, the newest
//     entries are popped first, keeping older anchors intact.
//   * Exponential trigger — a read schema must repeat (dedup map) before it is
//     cached, and the cached copy re-validates only on power-of-two counts, so
//     hot queries hit the DB exponentially less often while cold, single-use
//     queries never populate the cache.
//   * Cross-environment — uses TextEncoder (never Buffer) for byte counting and
//     Web Crypto SHA-256 (with a deterministic fallback) for hashing, so it runs
//     in both Node and the browser.
//   * Non-blocking storage I/O — localStorage writes are deferred to idle
//     callbacks / microtasks, never on the hot memory-cache path.

// ---------------------------------------------------------------------------
// Canonical form + hashing
// ---------------------------------------------------------------------------

// Recursively sort object keys so { a: 1, b: 2 } and { b: 2, a: 1 } produce the
// same serialization and therefore the same hash and equality result.
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      out[key] = canonicalize(record[key]);
    }
    return out;
  }
  return value;
}

export function serialize(value: unknown): string {
  // JSON.stringify(undefined) returns `undefined` (not a string), which would
  // break equality checks and byte counting. Normalize to a stable string.
  return JSON.stringify(canonicalize(value)) ?? "undefined";
}

export function byteSize(value: unknown): number {
  // TextEncoder exists in both Node and browsers; Buffer does not.
  return new TextEncoder().encode(serialize(value)).length;
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

// Deterministic non-crypto fallback (FNV-1a). Used only when Web Crypto is
// unavailable. The dedup map needs determinism, not cryptographic strength.
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return "fnv-" + h.toString(16).padStart(8, "0");
}

type SubtleLike = {
  digest: (algorithm: string, data: Uint8Array) => Promise<ArrayBuffer>;
};

export async function sha256Hex(input: string): Promise<string> {
  const subtle = (globalThis as { crypto?: { subtle?: SubtleLike } }).crypto
    ?.subtle;
  if (subtle?.digest) {
    const data = new TextEncoder().encode(input);
    const digest = new Uint8Array(await subtle.digest("SHA-256", data));
    return toHex(digest);
  }
  return fnv1a(input);
}

// ---------------------------------------------------------------------------
// Semi-LIFO in-memory cache
// ---------------------------------------------------------------------------

interface Sized<T> {
  value: T;
  size: number;
}

export class SemiLifoCache<T = unknown> {
  private map = new Map<string, Sized<T>>();
  private bytes = 0;

  constructor(
    private maxBytes: number,
    private maxEntries = Number.POSITIVE_INFINITY
  ) {}

  get size(): number {
    return this.map.size;
  }

  get byteSize(): number {
    return this.bytes;
  }

  get(key: string): T | undefined {
    return this.map.get(key)?.value;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  set(key: string, value: T): void {
    const size = byteSize(value);
    const existing = this.map.get(key);
    if (existing) {
      this.bytes -= existing.size;
      this.map.delete(key);
    }
    this.map.set(key, { value, size });
    this.bytes += size;
    this.evict();
  }

  delete(key: string): void {
    const entry = this.map.get(key);
    if (!entry) return;
    this.bytes -= entry.size;
    this.map.delete(key);
  }

  // Returns keys equal to `prefix` or any descendant (`prefix/...`).
  keysWithPrefix(prefix: string): string[] {
    const withSep = prefix + "/";
    const out: string[] = [];
    for (const key of this.map.keys()) {
      if (key === prefix || key.startsWith(withSep)) out.push(key);
    }
    return out;
  }

  clear(): void {
    this.map.clear();
    this.bytes = 0;
  }

  private evict(): void {
    // LIFO: pop the most recently inserted entry until within budget. This is
    // "semi"-LIFO because get() never promotes (no LRU reshuffle); the stack
    // order is pure insertion order and removal hits the newest first.
    while (
      (this.bytes > this.maxBytes || this.map.size > this.maxEntries) &&
      this.map.size > 0
    ) {
      const newest = Array.from(this.map.keys()).pop();
      if (newest === undefined) break;
      this.delete(newest);
    }
  }
}

// ---------------------------------------------------------------------------
// Request deduplicator (sliding window + hard cap)
// ---------------------------------------------------------------------------

interface DedupRecord {
  count: number;
  lastSeen: number;
}

export class RequestDeduplicator {
  private counts = new Map<string, DedupRecord>();

  constructor(
    private ttlMs: number,
    private maxKeys: number
  ) {}

  // Registers a schema and returns its new repeat count. Prunes stale keys and
  // enforces the key cap so the map cannot grow without bound (memory-leak fix).
  async count(schemaKey: string): Promise<number> {
    const now = Date.now();
    this.flush(now);

    const existing = this.counts.get(schemaKey);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = now;
      return existing.count;
    }

    this.counts.set(schemaKey, { count: 1, lastSeen: now });
    this.enforceCap();
    return 1;
  }

  get keyCount(): number {
    return this.counts.size;
  }

  private flush(now: number): void {
    for (const [key, record] of this.counts) {
      if (now - record.lastSeen > this.ttlMs) this.counts.delete(key);
    }
  }

  private enforceCap(): void {
    while (this.counts.size > this.maxKeys) {
      const oldest = this.counts.keys().next().value;
      if (oldest === undefined) break;
      this.counts.delete(oldest);
    }
  }
}

// ---------------------------------------------------------------------------
// Storage adapter (localStorage)
// ---------------------------------------------------------------------------

export interface StorageAdapter {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createLocalStorageAdapter(
  namespace: string
): StorageAdapter | undefined {
  if (typeof localStorage === "undefined") return undefined;
  const prefixed = (key: string) => namespace + key;
  return {
    async get(key) {
      const raw = localStorage.getItem(prefixed(key));
      if (raw == null) return undefined;
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    },
    async set(key, value) {
      localStorage.setItem(prefixed(key), serialize(value));
    },
    async remove(key) {
      localStorage.removeItem(prefixed(key));
    },
  };
}

// ---------------------------------------------------------------------------
// Layered cache
// ---------------------------------------------------------------------------

export interface DbBackend<T = unknown> {
  get(path: string): Promise<T | null>;
  set(path: string, value: T): Promise<void>;
}

export interface LayeredCacheOptions {
  maxBytes?: number;
  /** A schema must repeat this many times before it is cached. */
  minRepeats?: number;
  /** Sliding-window TTL for the dedup map (milliseconds). */
  dedupTtlMs?: number;
  /** Hard cap on dedup keys to prevent unbounded growth. */
  maxKeys?: number;
}

export class LayeredCache<T = unknown> {
  private memory: SemiLifoCache<T>;
  private dedup: RequestDeduplicator;
  private minRepeats: number;

  private storageWrites = new Map<string, T>();
  private storageRemoves = new Set<string>();
  private storageFlushScheduled = false;

  constructor(
    private backend: DbBackend<T>,
    private storage?: StorageAdapter,
    opts: LayeredCacheOptions = {}
  ) {
    this.memory = new SemiLifoCache<T>(opts.maxBytes ?? 1_000_000);
    this.minRepeats = opts.minRepeats ?? 2;
    this.dedup = new RequestDeduplicator(
      opts.dedupTtlMs ?? 24 * 60 * 60 * 1000,
      opts.maxKeys ?? 1000
    );
  }

  async get(path: string): Promise<T | null> {
    const schemaKey = await sha256Hex("GET:" + path);
    const count = await this.dedup.count(schemaKey);
    const isPowerOfTwo = (count & (count - 1)) === 0;

    // Cold / single-use schemas bypass the cache entirely: serving and storing
    // a one-off read pollutes every layer without benefit.
    if (count < this.minRepeats) {
      return this.backend.get(path);
    }

    // Between power-of-two checkpoints, serve the cached copy without touching
    // the DB. Only a miss falls through to a fresh read.
    if (!isPowerOfTwo) {
      const cached = this.memory.get(path) ?? (this.storage ? await this.storage.get(path) : undefined);
      if (cached !== undefined && cached !== null) return cached as T;
    }

    // Power-of-two checkpoint: re-validate against the authoritative DB.
    const value = await this.backend.get(path);
    if (value !== null && value !== undefined) {
      this.writeThrough(path, value);
    }
    return value;
  }

  async set(path: string, value: T): Promise<void> {
    // Real-CRUD detection: a canonical equality check drops no-change writes,
    // so multiple sources issuing the same value do not storm the DB or the
    // cache with pointless invalidations.
    const current = await this.backend.get(path);
    if (serialize(current) === serialize(value)) {
      return;
    }

    await this.backend.set(path, value);
    this.writeThrough(path, value);
  }

  // Clears a path and all cached descendants (used when an external writer
  // mutates a subtree this cache does not own, e.g. history entries).
  invalidate(path: string): void {
    const keys = this.memory.keysWithPrefix(path);
    for (const key of keys) {
      this.memory.delete(key);
      this.queueStorageRemove(key);
    }
  }

  private writeThrough(path: string, value: T): void {
    // A parent write supersedes every cached descendant. Drop them so no stale
    // child survives; the exact path keeps its fresh value. Children re-hydrate
    // lazily on their own schema cadence.
    const descendants = this.memory
      .keysWithPrefix(path)
      .filter((key) => key !== path);
    this.memory.set(path, value);
    for (const key of descendants) {
      this.memory.delete(key);
      this.queueStorageRemove(key);
    }
    this.queueStorageWrite(path, value);
  }

  private queueStorageWrite(path: string, value: T): void {
    if (!this.storage) return;
    this.storageRemoves.delete(path);
    this.storageWrites.set(path, value);
    this.scheduleFlush();
  }

  private queueStorageRemove(path: string): void {
    if (!this.storage) return;
    this.storageWrites.delete(path);
    this.storageRemoves.add(path);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.storageFlushScheduled) return;
    this.storageFlushScheduled = true;
    this.defer(() => {
      void this.flushStorage();
    });
  }

  private async flushStorage(): Promise<void> {
    this.storageFlushScheduled = false;
    if (!this.storage) return;
    const writes = Array.from(this.storageWrites.entries());
    const removes = Array.from(this.storageRemoves);
    this.storageWrites.clear();
    this.storageRemoves.clear();
    for (const [key, value] of writes) {
      await this.storage.set(key, value).catch(() => {});
    }
    for (const key of removes) {
      await this.storage.remove(key).catch(() => {});
    }
  }

  private defer(fn: () => void): void {
    const w = globalThis as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(fn, { timeout: 1500 });
    } else if (typeof queueMicrotask === "function") {
      queueMicrotask(fn);
    } else {
      setTimeout(fn, 0);
    }
  }
}