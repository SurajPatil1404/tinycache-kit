'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Cache } = require('../src/index');

describe('Cache.getOrSet() - Asynchronous Caching and Concurrency Deduplication', () => {
  it('should return cached value if present without executing asyncFunction', async () => {
    const cache = new Cache();
    cache.set('user:1', { name: 'Alice' });

    let called = false;
    const result = await cache.getOrSet('user:1', async () => {
      called = true;
      return { name: 'Bob' };
    });

    assert.equal(called, false);
    assert.deepEqual(result, { name: 'Alice' });
  });

  it('should execute asyncFunction, cache the result, and return it when key is missing', async () => {
    const cache = new Cache();
    let executions = 0;

    const fetcher = async () => {
      executions++;
      return { id: 101, title: 'Item 101' };
    };

    const val1 = await cache.getOrSet('item:101', fetcher);
    assert.equal(executions, 1);
    assert.deepEqual(val1, { id: 101, title: 'Item 101' });

    // Second call should hit cache
    const val2 = await cache.getOrSet('item:101', fetcher);
    assert.equal(executions, 1);
    assert.deepEqual(val2, { id: 101, title: 'Item 101' });
  });

  it('should deduplicate concurrent requests for the same key (stampede protection)', async () => {
    const cache = new Cache();
    let executions = 0;

    const slowFetcher = async () => {
      executions++;
      // Simulate async I/O delay
      await new Promise((r) => setTimeout(r, 20));
      return { data: 'expensive-result' };
    };

    // Fire 5 concurrent getOrSet calls for the same key
    const promises = [
      cache.getOrSet('expensiveKey', slowFetcher),
      cache.getOrSet('expensiveKey', slowFetcher),
      cache.getOrSet('expensiveKey', slowFetcher),
      cache.getOrSet('expensiveKey', slowFetcher),
      cache.getOrSet('expensiveKey', slowFetcher)
    ];

    const results = await Promise.all(promises);

    // All results must be identical
    for (const res of results) {
      assert.deepEqual(res, { data: 'expensive-result' });
    }

    // Must have executed slowFetcher exactly once!
    assert.equal(executions, 1);
    assert.equal(cache.get('expensiveKey').data, 'expensive-result');
  });

  it('should not cache failed promises and allow subsequent retries', async () => {
    const cache = new Cache();
    let attempt = 0;

    const flakyFetcher = async () => {
      attempt++;
      if (attempt === 1) {
        throw new Error('Database connection failed');
      }
      return 'recovered-data';
    };

    // First attempt fails
    await assert.rejects(
      () => cache.getOrSet('flakyKey', flakyFetcher),
      { message: 'Database connection failed' }
    );

    // Verify key was NOT cached
    assert.equal(cache.get('flakyKey'), undefined);
    assert.equal(cache.has('flakyKey'), false);

    // Second attempt should execute and succeed
    const result = await cache.getOrSet('flakyKey', flakyFetcher);
    assert.equal(result, 'recovered-data');
    assert.equal(cache.get('flakyKey'), 'recovered-data');
    assert.equal(attempt, 2);
  });

  it('should honor custom options such as TTL in getOrSet', async () => {
    const originalNow = Date.now;
    let mockTime = 1000000;
    Date.now = () => mockTime;

    try {
      const cache = new Cache();
      await cache.getOrSet('temp', async () => 'data', { ttl: 200 });

      assert.equal(cache.get('temp'), 'data');

      mockTime += 250;
      assert.equal(cache.get('temp'), undefined);
    } finally {
      Date.now = originalNow;
    }
  });
});
