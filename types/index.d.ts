export interface CacheOptions {
  /** Default time-to-live in milliseconds (0 = no expiration). Default: 0 */
  ttl?: number;
  /** Maximum number of items in cache before LRU eviction. Default: Infinity */
  maxSize?: number;
  /** Eviction policy. Currently only 'lru' is supported. Default: 'lru' */
  eviction?: 'lru';
  /** Periodic background cleanup interval in milliseconds. Default: null */
  cleanupInterval?: number | null;
  /** Whether to track cache performance statistics. Default: true */
  trackStats?: boolean;
}

export interface SetOptions {
  /** Specific TTL in milliseconds for this entry */
  ttl?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  expirations: number;
  size: number;
  hitRate: number;
}

export interface CacheMiddlewareOptions {
  /** TTL override for cached HTTP responses in milliseconds */
  ttl?: number;
  /** Custom key generator for incoming requests */
  keyGenerator?: (req: any) => string;
  /** Predicate to decide if request is cacheable (defaults to GET) */
  condition?: (req: any) => boolean;
  /** Route patterns or predicate to exclude from caching */
  exclude?: Array<string | RegExp> | ((req: any) => boolean);
  /** Whether to attach X-Cache: HIT / MISS response headers. Default: true */
  headers?: boolean;
  /** Status codes eligible for caching. Default: [200] */
  statusCodes?: number[];
}

export class TinyCacheError extends Error {
  code: string;
  constructor(message: string, code?: string);
}

export class InvalidOptionError extends TinyCacheError {
  constructor(message: string);
}

export class InvalidKeyError extends TinyCacheError {
  constructor(message: string);
}

export class ListNode<K = any, V = any> {
  key: K;
  value: V;
  expiresAt: number | null;
  createdAt: number;
  lastAccessedAt: number;
  prev: ListNode<K, V> | null;
  next: ListNode<K, V> | null;
  constructor(key: K, value: V, expiresAt?: number | null);
  isExpired(now?: number): boolean;
}

export class DoublyLinkedList<K = any, V = any> {
  head: ListNode<K, V> | null;
  tail: ListNode<K, V> | null;
  length: number;
  constructor();
  insertHead(node: ListNode<K, V>): void;
  moveToHead(node: ListNode<K, V>): void;
  remove(node: ListNode<K, V>): void;
  popTail(): ListNode<K, V> | null;
  clear(): void;
}

export class Statistics {
  enabled: boolean;
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  expirations: number;
  constructor(enabled?: boolean);
  recordHit(): void;
  recordMiss(): void;
  recordSet(): void;
  recordDelete(): void;
  recordEviction(): void;
  recordExpiration(count?: number): void;
  reset(): void;
  snapshot(currentSize?: number): CacheStats;
}

export class CleanupManager {
  constructor(pruneCallback: () => void, interval?: number | null);
  start(interval?: number): void;
  stop(): void;
  isRunning(): boolean;
}

export class Cache<K = any, V = any> {
  defaultTtl: number;
  maxSize: number;
  evictionPolicy: string;

  constructor(options?: CacheOptions);

  set(key: K, value: V, options?: SetOptions): this;
  get(key: K): V | undefined;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): this;
  size(): number;
  keys(): K[];
  getOrSet<T = V>(key: K, asyncFunction: () => Promise<T>, options?: SetOptions): Promise<T>;
  prune(): number;
  stats(): CacheStats;
  resetStats(): void;
  startCleanup(interval?: number): void;
  stopCleanup(): void;
  destroy(): void;
}

export function createCacheMiddleware(
  cache: Cache,
  options?: CacheMiddlewareOptions
): (req: any, res: any, next: (err?: any) => void) => void;

export default Cache;
