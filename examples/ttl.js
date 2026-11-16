'use strict';

const { Cache } = require('../src/index');

async function run() {
  console.log('--- 2. TTL Expiration & Auto-Cleanup ---');

  // Initialize with 1000ms default TTL and a 2000ms cleanup interval
  const cache = new Cache({
    ttl: 1000,
    cleanupInterval: 2000
  });

  // Entry with default TTL (1000ms)
  cache.set('session:alpha', { user: 'Alice' });

  // Entry with custom per-entry TTL (500ms)
  cache.set('token:short', 'secret-token-123', { ttl: 500 });

  // Entry that never expires (ttl: 0)
  cache.set('config:app', { env: 'production' }, { ttl: 0 });

  console.log('Initial check:');
  console.log('session:alpha ->', cache.get('session:alpha'));
  console.log('token:short   ->', cache.get('token:short'));
  console.log('config:app    ->', cache.get('config:app'));

  console.log('\nWaiting 600ms...');
  await new Promise((resolve) => setTimeout(resolve, 600));

  console.log('After 600ms:');
  console.log('session:alpha ->', cache.get('session:alpha')); // still valid
  console.log('token:short   ->', cache.get('token:short')); // undefined (expired)
  console.log('config:app    ->', cache.get('config:app')); // still valid

  console.log('\nWaiting another 500ms (total 1100ms)...');
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log('After 1100ms:');
  console.log('session:alpha ->', cache.get('session:alpha')); // undefined (expired)
  console.log('config:app    ->', cache.get('config:app')); // still valid

  // Manual prune
  const pruned = cache.prune();
  console.log(`\nManually pruned ${pruned} expired items.`);
  console.log('Remaining size:', cache.size());

  // Clean shutdown
  cache.destroy();
  console.log('Cache destroyed.');
}

run();
