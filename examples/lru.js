'use strict';

const { Cache } = require('../src/index');

console.log('--- 3. Least Recently Used (LRU) Eviction ---');

// Cache with capacity of 3 items
const cache = new Cache({ maxSize: 3 });

cache.set('item:1', 'First');
cache.set('item:2', 'Second');
cache.set('item:3', 'Third');

console.log('Current cache keys:', cache.keys()); // ['item:3', 'item:2', 'item:1']

// Access 'item:1' - this marks it as Most Recently Used (MRU)
console.log('Accessing item:1:', cache.get('item:1'));

// Add a 4th item: 'item:4'
// Since maxSize is 3, the LRU item ('item:2') will be evicted!
console.log('Adding item:4...');
cache.set('item:4', 'Fourth');

console.log('Has item:1 (refreshed)?', cache.has('item:1')); // true
console.log('Has item:2 (LRU evicted)?', cache.has('item:2')); // false!
console.log('Has item:3?', cache.has('item:3')); // true
console.log('Has item:4?', cache.has('item:4')); // true

console.log('Current keys in cache:', cache.keys());
console.log('Stats:', cache.stats());
