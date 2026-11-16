'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  Cache,
  InvalidOptionError,
  InvalidKeyError
} = require('../src/index');

describe('Cache - Basic Operations and Configuration', () => {
  it('should initialize with default configuration', () => {
    const cache = new Cache();
    assert.equal(cache.defaultTtl, 0);
    assert.equal(cache.maxSize, Infinity);
    assert.equal(cache.evictionPolicy, 'lru');
    assert.equal(cache.size(), 0);
  });

  it('should initialize with valid custom options', () => {
    const cache = new Cache({
      ttl: 5000,
      maxSize: 100,
      eviction: 'lru',
      trackStats: false
    });
    assert.equal(cache.defaultTtl, 5000);
    assert.equal(cache.maxSize, 100);
    assert.equal(cache.evictionPolicy, 'lru');
  });

  it('should throw InvalidOptionError on invalid constructor arguments', () => {
    assert.throws(() => new Cache(null), InvalidOptionError);
    assert.throws(() => new Cache('not-an-object'), InvalidOptionError);
    assert.throws(() => new Cache({ ttl: -10 }), InvalidOptionError);
    assert.throws(() => new Cache({ ttl: NaN }), InvalidOptionError);
    assert.throws(() => new Cache({ maxSize: 0 }), InvalidOptionError);
    assert.throws(() => new Cache({ maxSize: -5 }), InvalidOptionError);
    assert.throws(() => new Cache({ maxSize: NaN }), InvalidOptionError);
    assert.throws(() => new Cache({ eviction: 'fifo' }), InvalidOptionError);
    assert.throws(() => new Cache({ cleanupInterval: -100 }), InvalidOptionError);
    assert.throws(() => new Cache({ cleanupInterval: 0 }), InvalidOptionError);
  });

  it('should validate keys on set, get, has, delete, and getOrSet', async () => {
    const cache = new Cache();

    assert.throws(() => cache.set(undefined, 'val'), InvalidKeyError);
    assert.throws(() => cache.set(null, 'val'), InvalidKeyError);
    assert.throws(() => cache.get(undefined), InvalidKeyError);
    assert.throws(() => cache.get(null), InvalidKeyError);
    assert.throws(() => cache.has(undefined), InvalidKeyError);
    assert.throws(() => cache.has(null), InvalidKeyError);
    assert.throws(() => cache.delete(undefined), InvalidKeyError);
    assert.throws(() => cache.delete(null), InvalidKeyError);
    await assert.rejects(() => cache.getOrSet(undefined, async () => 1), InvalidKeyError);
    await assert.rejects(() => cache.getOrSet('key', 'not-a-fn'), TypeError);
  });

  it('should support storing and retrieving various value types', () => {
    const cache = new Cache();

    cache.set('string', 'hello');
    cache.set('number', 42);
    cache.set('boolean', false);
    cache.set('nullValue', null);
    cache.set('object', { id: 1, name: 'Cache' });
    cache.set('array', [1, 2, 3]);

    assert.equal(cache.get('string'), 'hello');
    assert.equal(cache.get('number'), 42);
    assert.equal(cache.get('boolean'), false);
    assert.equal(cache.get('nullValue'), null);
    assert.deepEqual(cache.get('object'), { id: 1, name: 'Cache' });
    assert.deepEqual(cache.get('array'), [1, 2, 3]);

    // has checks
    assert.equal(cache.has('nullValue'), true);
    assert.equal(cache.has('boolean'), true);
    assert.equal(cache.has('nonExistent'), false);
  });

  it('should return undefined for missing keys', () => {
    const cache = new Cache();
    assert.equal(cache.get('missing'), undefined);
    assert.equal(cache.has('missing'), false);
  });

  it('should update existing keys in place', () => {
    const cache = new Cache();
    cache.set('user', 'Alice');
    assert.equal(cache.get('user'), 'Alice');
    assert.equal(cache.size(), 1);

    cache.set('user', 'Bob');
    assert.equal(cache.get('user'), 'Bob');
    assert.equal(cache.size(), 1);
  });

  it('should delete keys properly', () => {
    const cache = new Cache();
    cache.set('a', 1);
    cache.set('b', 2);

    assert.equal(cache.delete('a'), true);
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.has('a'), false);
    assert.equal(cache.size(), 1);

    // Deleting non-existent key returns false
    assert.equal(cache.delete('a'), false);
    assert.equal(cache.delete('nonExistent'), false);
  });

  it('should clear all entries', () => {
    const cache = new Cache();
    cache.set('a', 1).set('b', 2).set('c', 3);
    assert.equal(cache.size(), 3);

    cache.clear();
    assert.equal(cache.size(), 0);
    assert.equal(cache.get('a'), undefined);
    assert.deepEqual(cache.keys(), []);
  });

  it('should return active keys with keys()', () => {
    const cache = new Cache();
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.set(100, 'numberKey');

    const keys = cache.keys();
    assert.equal(keys.length, 3);
    assert.ok(keys.includes('k1'));
    assert.ok(keys.includes('k2'));
    assert.ok(keys.includes(100));
  });

  it('should support destroying cache', () => {
    const cache = new Cache({ cleanupInterval: 1000 });
    cache.set('x', 1);
    assert.equal(cache.size(), 1);

    cache.destroy();
    assert.equal(cache.size(), 0);
    assert.equal(cache.get('x'), undefined);
  });
});
