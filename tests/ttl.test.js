'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Cache, InvalidOptionError } = require('../src/index');

describe('TTL Expiration and Pruning', () => {
  it('should expire entries after default TTL', async () => {
    const originalNow = Date.now;
    let mockTime = 1000000;
    Date.now = () => mockTime;

    try {
      const cache = new Cache({ ttl: 500 });
      cache.set('session', { userId: 42 });

      assert.deepEqual(cache.get('session'), { userId: 42 });
      assert.equal(cache.has('session'), true);

      // Advance time by 400ms (not yet expired)
      mockTime += 400;
      assert.deepEqual(cache.get('session'), { userId: 42 });
      assert.equal(cache.has('session'), true);

      // Advance time past 500ms
      mockTime += 150; // Total 550ms
      assert.equal(cache.get('session'), undefined);
      assert.equal(cache.has('session'), false);
    } finally {
      Date.now = originalNow;
    }
  });

  it('should allow per-entry TTL override', () => {
    const originalNow = Date.now;
    let mockTime = 1000000;
    Date.now = () => mockTime;

    try {
      const cache = new Cache({ ttl: 1000 }); // default 1000ms

      // Entry with 200ms TTL
      cache.set('shortLived', 'quick', { ttl: 200 });
      // Entry with 5000ms TTL
      cache.set('longLived', 'stable', { ttl: 5000 });
      // Entry with 0 TTL (no expiration)
      cache.set('permanent', 'forever', { ttl: 0 });

      mockTime += 300;
      assert.equal(cache.get('shortLived'), undefined); // expired
      assert.equal(cache.get('longLived'), 'stable');
      assert.equal(cache.get('permanent'), 'forever');

      mockTime += 1000; // Total 1300ms
      assert.equal(cache.get('longLived'), 'stable');
      assert.equal(cache.get('permanent'), 'forever');

      mockTime += 4000; // Total 5300ms
      assert.equal(cache.get('longLived'), undefined); // expired
      assert.equal(cache.get('permanent'), 'forever');

      // Test has() directly on expired entry without prior get()
      cache.set('lazyExpireCheck', 'value', { ttl: 50 });
      mockTime += 100;
      assert.equal(cache.has('lazyExpireCheck'), false); // triggers lazy removal inside has()
    } finally {
      Date.now = originalNow;
    }
  });

  it('should throw when invalid per-entry TTL is provided', () => {
    const cache = new Cache();
    assert.throws(() => cache.set('k', 'v', { ttl: -10 }), InvalidOptionError);
    assert.throws(() => cache.set('k', 'v', { ttl: NaN }), InvalidOptionError);
  });

  it('should remove expired entries when calling prune()', () => {
    const originalNow = Date.now;
    let mockTime = 1000000;
    Date.now = () => mockTime;

    try {
      const cache = new Cache();
      cache.set('k1', 'v1', { ttl: 100 });
      cache.set('k2', 'v2', { ttl: 200 });
      cache.set('k3', 'v3', { ttl: 500 });

      assert.equal(cache.size(), 3);

      mockTime += 250;
      // k1 and k2 should be expired, k3 is alive
      const pruned = cache.prune();
      assert.equal(pruned, 2);
      assert.equal(cache.size(), 1);
      assert.equal(cache.has('k1'), false);
      assert.equal(cache.has('k2'), false);
      assert.equal(cache.has('k3'), true);
      assert.equal(cache.get('k3'), 'v3');
    } finally {
      Date.now = originalNow;
    }
  });

  it('should filter out expired entries when calling keys()', () => {
    const originalNow = Date.now;
    let mockTime = 1000000;
    Date.now = () => mockTime;

    try {
      const cache = new Cache();
      cache.set('valid', 1, { ttl: 500 });
      cache.set('expired', 2, { ttl: 100 });

      mockTime += 200;
      const keys = cache.keys();
      assert.deepEqual(keys, ['valid']);
      assert.equal(cache.size(), 1);
    } finally {
      Date.now = originalNow;
    }
  });

  it('should safely manage automatic background cleanup timer', async () => {
    const cache = new Cache({ cleanupInterval: 50 });
    cache.set('expiring', 'bye', { ttl: 20 });

    // Wait for the background interval to run
    await new Promise((resolve) => setTimeout(resolve, 80));

    assert.equal(cache.size(), 0);
    cache.stopCleanup();

    // Start with new interval
    cache.startCleanup(100);
    cache.stopCleanup();

    assert.throws(() => cache.startCleanup(-5), InvalidOptionError);
    assert.throws(() => cache.startCleanup(0), InvalidOptionError);
  });

  it('should test CleanupManager directly for coverage and edge cases', async () => {
    const { CleanupManager } = require('../src/index');

    assert.throws(() => new CleanupManager('not-a-function'), TypeError);

    let errorThrown = false;
    const cm = new CleanupManager(() => {
      errorThrown = true;
      throw new Error('Prune failure test');
    }, 20);

    assert.equal(cm.isRunning(), false);
    cm.start();
    assert.equal(cm.isRunning(), true);

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(errorThrown, true);

    cm.stop();
    assert.equal(cm.isRunning(), false);
  });
});
