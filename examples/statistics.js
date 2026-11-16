'use strict';

const { Cache } = require('../src/index');

console.log('--- 4. Cache Statistics & Metrics ---');

const cache = new Cache({
  maxSize: 2,
  ttl: 500,
  trackStats: true
});

// Sets
cache.set('a', 1);
cache.set('b', 2);

// Hits
cache.get('a');
cache.get('a');

// Misses
cache.get('c'); // missing key
cache.get('d'); // missing key

// Eviction (adding 'e' evicts LRU 'b')
cache.set('e', 5);

// Inspect statistics
console.log('Cache stats after operations:');
console.table(cache.stats());

// Reset statistics
cache.resetStats();
console.log('Cache stats after reset:');
console.table(cache.stats());
