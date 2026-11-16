import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import CacheDefault, {
  Cache,
  createCacheMiddleware,
  DoublyLinkedList,
  ListNode,
  Statistics,
  CleanupManager,
  TinyCacheError,
  InvalidOptionError,
  InvalidKeyError
} from '../src/index.mjs';

describe('ESM Compatibility Test', () => {
  it('should export Cache as default and named export', () => {
    assert.equal(typeof CacheDefault, 'function');
    assert.equal(CacheDefault, Cache);
  });

  it('should export all utility classes and errors', () => {
    assert.equal(typeof createCacheMiddleware, 'function');
    assert.equal(typeof DoublyLinkedList, 'function');
    assert.equal(typeof ListNode, 'function');
    assert.equal(typeof Statistics, 'function');
    assert.equal(typeof CleanupManager, 'function');
    assert.equal(typeof TinyCacheError, 'function');
    assert.equal(typeof InvalidOptionError, 'function');
    assert.equal(typeof InvalidKeyError, 'function');
  });

  it('should instantiate and perform basic operations with ESM import', async () => {
    const cache = new CacheDefault({ ttl: 1000, maxSize: 5 });
    cache.set('esmKey', { works: true });
    assert.deepEqual(cache.get('esmKey'), { works: true });

    const computed = await cache.getOrSet('computed', async () => 42);
    assert.equal(computed, 42);
    assert.equal(cache.size(), 2);
  });
});
