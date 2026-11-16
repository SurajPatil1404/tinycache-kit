'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Cache, Statistics } = require('../src/index');

describe('Cache Statistics', () => {
  it('should track hits, misses, sets, deletes, evictions, expirations and hitRate', () => {
    const originalNow = Date.now;
    let mockTime = 1000000;
    Date.now = () => mockTime;

    try {
      const cache = new Cache({ maxSize: 2, ttl: 500 });

      // Sets
      cache.set('a', 1);
      cache.set('b', 2);

      // Hits
      cache.get('a');
      cache.get('a');

      // Misses
      cache.get('c'); // missing

      // Eviction: adding 'c' when size is 2 evicts 'b' (LRU)
      cache.set('c', 3);

      // Expirations
      mockTime += 600; // 'a' and 'c' expire
      cache.get('a'); // miss + expiration

      const stats = cache.stats();
      assert.equal(stats.sets, 3);
      assert.equal(stats.hits, 2);
      assert.equal(stats.misses, 2); // 'c' missing + 'a' expired
      assert.equal(stats.evictions, 1);
      assert.equal(stats.expirations, 1);
      assert.equal(stats.hitRate, 0.5); // 2 hits / 4 total gets = 0.5

      // Deletes
      cache.set('d', 4);
      cache.delete('d');
      assert.equal(cache.stats().deletes, 1);

      // Reset
      cache.resetStats();
      const resetStats = cache.stats();
      assert.equal(resetStats.hits, 0);
      assert.equal(resetStats.misses, 0);
      assert.equal(resetStats.sets, 0);
      assert.equal(resetStats.deletes, 0);
      assert.equal(resetStats.evictions, 0);
      assert.equal(resetStats.expirations, 0);
      assert.equal(resetStats.hitRate, 0);
    } finally {
      Date.now = originalNow;
    }
  });

  it('should not track stats when trackStats is false', () => {
    const cache = new Cache({ trackStats: false });
    cache.set('x', 1);
    cache.get('x');
    cache.get('missing');
    cache.delete('x');

    const stats = cache.stats();
    assert.equal(stats.hits, 0);
    assert.equal(stats.misses, 0);
    assert.equal(stats.sets, 0);
    assert.equal(stats.deletes, 0);
  });

  it('standalone Statistics unit tests', () => {
    const s = new Statistics(true);
    s.recordHit();
    s.recordMiss();
    s.recordSet();
    s.recordDelete();
    s.recordEviction();
    s.recordExpiration(3);

    const snapshot = s.snapshot(10);
    assert.equal(snapshot.hits, 1);
    assert.equal(snapshot.misses, 1);
    assert.equal(snapshot.sets, 1);
    assert.equal(snapshot.deletes, 1);
    assert.equal(snapshot.evictions, 1);
    assert.equal(snapshot.expirations, 3);
    assert.equal(snapshot.size, 10);
    assert.equal(snapshot.hitRate, 0.5);
  });
});
