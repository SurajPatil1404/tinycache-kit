'use strict';

const { DoublyLinkedList, ListNode } = require('./eviction');
const { Statistics } = require('./statistics');
const { CleanupManager } = require('./cleanup');
const { InvalidOptionError, InvalidKeyError } = require('./errors');

/**
 * Options for configuring a Cache instance.
 * @typedef {Object} CacheOptions
 * @property {number} [ttl=0] - Default time-to-live in milliseconds (0 = no expiration).
 * @property {number} [maxSize=Infinity] - Maximum number of entries allowed before LRU eviction.
 * @property {string} [eviction='lru'] - Eviction policy (currently 'lru' is supported).
 * @property {number|null} [cleanupInterval=null] - Periodic interval in milliseconds to prune expired entries.
 * @property {boolean} [trackStats=true] - Whether to track cache performance statistics.
 */

/**
 * Options for setting a cache entry.
 * @typedef {Object} SetOptions
 * @property {number} [ttl] - Override time-to-live in milliseconds for this specific entry.
 */

/**
 * High-performance, zero-dependency in-memory cache with TTL and LRU eviction.
 */
class Cache {
  /**
   * @param {CacheOptions} [options={}]
   */
  constructor(options = {}) {
    if (typeof options !== 'object' || options === null) {
      throw new InvalidOptionError('Cache options must be an object');
    }

    const {
      ttl = 0,
      maxSize = Infinity,
      eviction = 'lru',
      cleanupInterval = null,
      trackStats = true
    } = options;

    if (typeof ttl !== 'number' || ttl < 0 || Number.isNaN(ttl)) {
      throw new InvalidOptionError('Option "ttl" must be a non-negative number');
    }

    if (
      (typeof maxSize !== 'number' || maxSize <= 0 || Number.isNaN(maxSize)) &&
      maxSize !== Infinity
    ) {
      throw new InvalidOptionError('Option "maxSize" must be a positive number');
    }

    if (eviction !== 'lru') {
      throw new InvalidOptionError(`Unsupported eviction policy "${eviction}". Only 'lru' is supported.`);
    }

    if (
      cleanupInterval !== null &&
      (typeof cleanupInterval !== 'number' || cleanupInterval <= 0 || Number.isNaN(cleanupInterval))
    ) {
      throw new InvalidOptionError('Option "cleanupInterval" must be a positive number');
    }

    this.defaultTtl = ttl;
    this.maxSize = maxSize;
    this.evictionPolicy = eviction;

    this._map = new Map();
    this._list = new DoublyLinkedList();
    this._stats = new Statistics(Boolean(trackStats));
    this._inFlight = new Map();

    this._cleanupManager = new CleanupManager(
      () => this.prune(),
      cleanupInterval
    );

    if (cleanupInterval) {
      this._cleanupManager.start();
    }
  }

  /**
   * Validate that a key is provided and valid.
   * @param {*} key
   * @private
   */
  _validateKey(key) {
    if (key === undefined || key === null) {
      throw new InvalidKeyError('Cache key must not be undefined or null');
    }
  }

  /**
   * Calculate expiration timestamp from TTL in milliseconds.
   * @param {number} ttl
   * @returns {number|null}
   * @private
   */
  _computeExpiresAt(ttl) {
    if (typeof ttl === 'number' && ttl > 0 && Number.isFinite(ttl)) {
      return Date.now() + ttl;
    }
    return null;
  }

  /**
   * Store a value in the cache.
   * @param {*} key - Cache key.
   * @param {*} value - Value to cache.
   * @param {SetOptions} [options={}] - Per-entry options.
   * @returns {this}
   */
  set(key, value, options = {}) {
    this._validateKey(key);

    const ttl = options && typeof options.ttl === 'number'
      ? options.ttl
      : this.defaultTtl;

    if (ttl < 0 || Number.isNaN(ttl)) {
      throw new InvalidOptionError('Per-entry "ttl" must be a non-negative number');
    }

    const expiresAt = this._computeExpiresAt(ttl);

    if (this._map.has(key)) {
      const existingNode = this._map.get(key);
      existingNode.value = value;
      existingNode.expiresAt = expiresAt;
      existingNode.lastAccessedAt = Date.now();
      this._list.moveToHead(existingNode);
    } else {
      if (this._map.size >= this.maxSize) {
        const evictedNode = this._list.popTail();
        if (evictedNode) {
          this._map.delete(evictedNode.key);
          this._stats.recordEviction();
        }
      }

      const newNode = new ListNode(key, value, expiresAt);
      this._list.insertHead(newNode);
      this._map.set(key, newNode);
    }

    this._stats.recordSet();
    return this;
  }

  /**
   * Retrieve a value from the cache.
   * Returns undefined if the key is not found or has expired.
   * @param {*} key - Cache key.
   * @returns {*}
   */
  get(key) {
    this._validateKey(key);

    const node = this._map.get(key);
    if (!node) {
      this._stats.recordMiss();
      return undefined;
    }

    if (node.isExpired()) {
      this._list.remove(node);
      this._map.delete(key);
      this._stats.recordExpiration(1);
      this._stats.recordMiss();
      return undefined;
    }

    node.lastAccessedAt = Date.now();
    this._list.moveToHead(node);
    this._stats.recordHit();
    return node.value;
  }

  /**
   * Check if a valid, non-expired key exists in the cache.
   * @param {*} key - Cache key.
   * @returns {boolean}
   */
  has(key) {
    this._validateKey(key);

    const node = this._map.get(key);
    if (!node) {
      return false;
    }

    if (node.isExpired()) {
      this._list.remove(node);
      this._map.delete(key);
      this._stats.recordExpiration(1);
      return false;
    }

    return true;
  }

  /**
   * Delete an entry from the cache.
   * @param {*} key - Cache key.
   * @returns {boolean} True if the entry existed and was removed.
   */
  delete(key) {
    this._validateKey(key);

    const node = this._map.get(key);
    if (!node) {
      return false;
    }

    this._list.remove(node);
    this._map.delete(key);
    this._stats.recordDelete();
    return true;
  }

  /**
   * Remove all entries from the cache.
   * @returns {this}
   */
  clear() {
    this._list.clear();
    this._map.clear();
    this._inFlight.clear();
    return this;
  }

  /**
   * Get the number of entries currently stored in the cache.
   * Note: This reflects current map size; call prune() first for strict active count.
   * @returns {number}
   */
  size() {
    return this._map.size;
  }

  /**
   * Return an array of all active, non-expired keys in the cache.
   * Automatically purges any expired keys encountered.
   * @returns {Array<*>}
   */
  keys() {
    const activeKeys = [];
    const now = Date.now();
    const expiredNodes = [];

    for (const [key, node] of this._map.entries()) {
      if (node.isExpired(now)) {
        expiredNodes.push(node);
      } else {
        activeKeys.push(key);
      }
    }

    if (expiredNodes.length > 0) {
      for (const node of expiredNodes) {
        this._list.remove(node);
        this._map.delete(node.key);
      }
      this._stats.recordExpiration(expiredNodes.length);
    }

    return activeKeys;
  }

  /**
   * Get an existing value or compute, cache, and return it.
   * Protects against concurrent cache stampedes (dogpiling) using singleflight deduplication.
   * If the async function fails, the error is thrown and not cached.
   *
   * @template T
   * @param {*} key - Cache key.
   * @param {() => Promise<T>} asyncFunction - Function that resolves to the value.
   * @param {SetOptions} [options={}] - Set options if computing value.
   * @returns {Promise<T>}
   */
  async getOrSet(key, asyncFunction, options = {}) {
    this._validateKey(key);

    if (typeof asyncFunction !== 'function') {
      throw new TypeError('asyncFunction must be a function');
    }

    const cachedValue = this.get(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    if (this._inFlight.has(key)) {
      return this._inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const result = await asyncFunction();
        this.set(key, result, options);
        return result;
      } finally {
        this._inFlight.delete(key);
      }
    })();

    this._inFlight.set(key, promise);
    return promise;
  }

  /**
   * Prune all expired entries from the cache.
   * @returns {number} The number of pruned entries.
   */
  prune() {
    const now = Date.now();
    let prunedCount = 0;

    for (const [key, node] of this._map.entries()) {
      if (node.isExpired(now)) {
        this._list.remove(node);
        this._map.delete(key);
        prunedCount++;
      }
    }

    if (prunedCount > 0) {
      this._stats.recordExpiration(prunedCount);
    }

    return prunedCount;
  }

  /**
   * Retrieve performance and usage statistics.
   * @returns {{
   *   hits: number,
   *   misses: number,
   *   sets: number,
   *   deletes: number,
   *   evictions: number,
   *   expirations: number,
   *   size: number,
   *   hitRate: number
   * }}
   */
  stats() {
    return this._stats.snapshot(this.size());
  }

  /**
   * Reset all tracked statistics back to zero.
   */
  resetStats() {
    this._stats.reset();
  }

  /**
   * Stop the background cleanup timer if running.
   */
  stopCleanup() {
    this._cleanupManager.stop();
  }

  /**
   * Start or restart the background cleanup timer with an optional interval.
   * @param {number} [interval]
   */
  startCleanup(interval) {
    if (interval !== undefined) {
      if (typeof interval !== 'number' || interval <= 0 || Number.isNaN(interval)) {
        throw new InvalidOptionError('Option "interval" must be a positive number');
      }
    }
    this._cleanupManager.start(interval);
  }

  /**
   * Destroy the cache instance: clear all entries and stop background timers.
   */
  destroy() {
    this.stopCleanup();
    this.clear();
  }
}

module.exports = {
  Cache
};
