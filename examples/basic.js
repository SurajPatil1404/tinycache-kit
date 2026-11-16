'use strict';

const { Cache } = require('../src/index');

// 1. Initialize cache
const cache = new Cache();

console.log('--- 1. Basic Cache Operations ---');

// 2. Set values
cache.set('greeting', 'Hello, World!');
cache.set('user:101', { name: 'Alice', role: 'admin' });
cache.set('count', 42);

// 3. Get values
console.log('greeting:', cache.get('greeting'));
console.log('user:101:', cache.get('user:101'));
console.log('count:', cache.get('count'));

// 4. Check existence with has()
console.log('has user:101?', cache.has('user:101')); // true
console.log('has user:999?', cache.has('user:999')); // false

// 5. Size and active keys
console.log('Current cache size:', cache.size()); // 3
console.log('Cache keys:', cache.keys()); // ['greeting', 'user:101', 'count']

// 6. Delete a key
cache.delete('greeting');
console.log('After delete greeting, has greeting?', cache.has('greeting')); // false
console.log('Size after deletion:', cache.size()); // 2

// 7. Clear all keys
cache.clear();
console.log('Size after clear:', cache.size()); // 0
