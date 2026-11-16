'use strict';

/**
 * Tracks performance and operation metrics for a Cache instance.
 */
class Statistics {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
    this.evictions = 0;
    this.expirations = 0;
  }

  /**
   * Record a cache hit.
   */
  recordHit() {
    if (this.enabled) {
      this.hits++;
    }
  }

  /**
   * Record a cache miss.
   */
  recordMiss() {
    if (this.enabled) {
      this.misses++;
    }
  }

  /**
   * Record a cache set.
   */
  recordSet() {
    if (this.enabled) {
      this.sets++;
    }
  }

  /**
   * Record a cache delete.
   */
  recordDelete() {
    if (this.enabled) {
      this.deletes++;
    }
  }

  /**
   * Record an LRU eviction.
   */
  recordEviction() {
    if (this.enabled) {
      this.evictions++;
    }
  }

  /**
   * Record expired entries.
   * @param {number} [count=1]
   */
  recordExpiration(count = 1) {
    if (this.enabled && count > 0) {
      this.expirations += count;
    }
  }

  /**
   * Reset all counters to zero.
   */
  reset() {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
    this.evictions = 0;
    this.expirations = 0;
  }

  /**
   * Return a snapshot of the current statistics.
   * @param {number} currentSize
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
  snapshot(currentSize = 0) {
    const totalGets = this.hits + this.misses;
    const hitRate = totalGets > 0 ? Number((this.hits / totalGets).toFixed(4)) : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      evictions: this.evictions,
      expirations: this.expirations,
      size: currentSize,
      hitRate
    };
  }
}

module.exports = {
  Statistics
};
