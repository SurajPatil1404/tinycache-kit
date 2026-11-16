# tinycache-kit

[![npm version](https://img.shields.io/badge/npm-1.0.0-blue.svg)](https://www.npmjs.com/package/tinycache-kit)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)]()
[![zero-dependencies](https://img.shields.io/badge/dependencies-0-success.svg)]()

> A lightweight, blazing-fast, zero-dependency in-memory caching library for Node.js applications featuring TTL expiration, O(1) LRU eviction, singleflight stampede protection, cache metrics, and optional Express middleware.

---

## Table of Contents

1. [Project Introduction](#1-project-introduction)
2. [Features](#2-features)
3. [Installation](#3-installation)
4. [Quick Start](#4-quick-start)
5. [Basic Usage](#5-basic-usage)
6. [Complete API Reference](#6-complete-api-reference)
7. [TTL (Time-To-Live) Explanation](#7-ttl-time-to-live-explanation)
8. [LRU (Least Recently Used) Eviction](#8-lru-least-recently-used-eviction)
9. [Cache Statistics & Monitoring](#9-cache-statistics--monitoring)
10. [Async getOrSet & Stampede Protection](#10-async-getorset--stampede-protection)
11. [Express Integration](#11-express-integration)
12. [Configuration Options](#12-configuration-options)
13. [Error Handling](#13-error-handling)
14. [Examples](#14-examples)
15. [Performance Considerations](#15-performance-considerations)
16. [Limitations](#16-limitations)
17. [Contributing](#17-contributing)
18. [License](#18-license)

---

## 1. Project Introduction

**`tinycache-kit`** is built for modern Node.js backends that need predictable, high-throughput in-memory caching without the overhead of heavy external dependencies. It combines a JavaScript `Map` with a doubly linked list to achieve strict **$O(1)$** time complexity for all read, write, update, and eviction operations.

Whether you need to cache database queries, third-party API responses, computed tokens, or entire HTTP route responses in Express, `tinycache-kit` provides a clean, robust, and type-safe API.

---

## 2. Features

- **Zero Runtime Dependencies**: The core package has 0 dependencies. Express is completely optional.
- **O(1) LRU Eviction**: Constant-time Least Recently Used eviction prevents memory exhaustion under heavy load.
- **Flexible TTL Expiration**: Configure default global expiration and per-entry TTL overrides.
- **Singleflight / Dogpile Prevention**: `getOrSet()` deduplicates concurrent async operations for the same key.
- **Memory-Safe Auto-Pruning**: Periodic background cleanup using unreferenced timers that never block Node process shutdown.
- **Built-in Performance Statistics**: Real-time tracking of hits, misses, hit rate, sets, deletes, evictions, and expirations.
- **Dual Module Support**: Native CommonJS (`require`) and ES Module (`import`) support, including TypeScript declarations (`.d.ts`).
- **Express Middleware**: Optional zero-dependency middleware with response header tracking (`X-Cache: HIT/MISS`) and customizable key generation.
- **100% Tested**: Deterministic test suite running on Node.js's native test runner with 100% line coverage.

---

## 3. Installation

```bash
npm install tinycache-kit
```

Or using Yarn / pnpm:

```bash
# yarn
yarn add tinycache-kit

# pnpm
pnpm add tinycache-kit
```

**System Requirements:**
- Node.js version `>= 18.0.0` (LTS versions 18, 20, 22+ recommended).

---

## 4. Quick Start

### CommonJS (CJS)

```javascript
const { Cache } = require('tinycache-kit');

const cache = new Cache({
  ttl: 60000,     // 60 seconds default TTL
  maxSize: 1000   // Hold up to 1,000 entries
});

cache.set('user:42', { name: 'Alice', role: 'admin' });
const user = cache.get('user:42');

console.log(user); // { name: 'Alice', role: 'admin' }
```

### ES Modules (ESM) / TypeScript

```typescript
import Cache, { createCacheMiddleware } from 'tinycache-kit';

const cache = new Cache<string, number>({
  ttl: 5000,
  maxSize: 500
});

cache.set('counter', 10);
console.log(cache.get('counter')); // 10
```

---

## 5. Basic Usage

### Setting and Getting Values

```javascript
const cache = new Cache();

// Store any data type
cache.set('name', 'Antigravity');
cache.set('count', 100);
cache.set('config', { debug: true });
cache.set('flags', [true, false]);

// Retrieve
console.log(cache.get('name')); // 'Antigravity'
console.log(cache.get('missing')); // undefined
```

### Existence and Size

```javascript
if (cache.has('config')) {
  console.log('Config is cached!');
}

console.log('Total items in cache:', cache.size());
console.log('Active keys:', cache.keys());
```

### Deletion and Clearing

```javascript
cache.delete('name'); // returns true if existed, false otherwise
cache.clear();        // removes all entries immediately
```

---

## 6. Complete API Reference

### `new Cache(options)`

Creates a new `Cache` instance.

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `ttl` | `number` | `0` | Default time-to-live in milliseconds (`0` means no expiration). |
| `maxSize` | `number` | `Infinity` | Maximum number of entries before LRU eviction triggers. |
| `eviction` | `string` | `'lru'` | Eviction algorithm. Currently `'lru'` is supported. |
| `cleanupInterval`| `number \| null` | `null` | Milliseconds between background prune runs. |
| `trackStats` | `boolean` | `true` | Enables or disables cache metrics collection. |

### Instance Methods

#### `cache.set(key, value, options?)`
- **Arguments:**
  - `key` (`any`): Non-null, non-undefined cache key.
  - `value` (`any`): Any JavaScript value (object, primitive, array, etc.).
  - `options` (`object`, optional):
    - `options.ttl` (`number`): Milliseconds before this specific entry expires.
- **Returns:** `this` (enables chaining).

#### `cache.get(key)`
- **Arguments:** `key` (`any`).
- **Returns:** Cached value, or `undefined` if key does not exist or has expired. Refreshes LRU position on hit.

#### `cache.has(key)`
- **Arguments:** `key` (`any`).
- **Returns:** `boolean`. Checks whether key exists and is non-expired. Lazily removes expired entry.

#### `cache.delete(key)`
- **Arguments:** `key` (`any`).
- **Returns:** `boolean` (`true` if entry existed and was removed, `false` otherwise).

#### `cache.clear()`
- **Returns:** `this`. Flushes all entries and pending promises.

#### `cache.size()`
- **Returns:** `number`. Returns the current number of items stored in the internal map.

#### `cache.keys()`
- **Returns:** `Array<any>`. Returns an array of non-expired keys, purging any expired entries encountered.

#### `cache.getOrSet(key, asyncFunction, options?)`
- **Arguments:**
  - `key` (`any`): Cache key.
  - `asyncFunction` (`() => Promise<any>`): Async resolver executed only on a cache miss.
  - `options` (`object`, optional): Per-entry options (e.g. `{ ttl: 10000 }`).
- **Returns:** `Promise<any>`. Deduplicates concurrent executions for identical keys.

#### `cache.prune()`
- **Returns:** `number`. Scans all entries, deletes expired keys, and returns the count of pruned items.

#### `cache.stats()`
- **Returns:** Object with current metrics:
  - `hits` (`number`): Successful retrievals.
  - `misses` (`number`): Missing or expired retrievals.
  - `sets` (`number`): Total insertions and updates.
  - `deletes` (`number`): Total deletions.
  - `evictions` (`number`): Total LRU capacity evictions.
  - `expirations` (`number`): Total expired entries evicted.
  - `size` (`number`): Current cache size.
  - `hitRate` (`number`): Ratio of `hits / (hits + misses)` (from `0.0` to `1.0`).

#### `cache.resetStats()`
- Resets all statistics counters back to zero.

#### `cache.startCleanup(interval?)`
- Starts background cleanup timer with the specified interval in milliseconds.

#### `cache.stopCleanup()`
- Stops the background cleanup timer if running.

#### `cache.destroy()`
- Stops any background cleanup timers and clears all cached data.

---

## 7. TTL (Time-To-Live) Explanation

`tinycache-kit` uses a hybrid TTL strategy that is both CPU-efficient and memory-safe:

1. **Lazy Expiration (Zero CPU Overhead)**: When `get(key)` or `has(key)` is invoked, the entry's timestamp is checked. If `Date.now() > entry.expiresAt`, the item is evicted immediately, marked as an expiration in the statistics, and `undefined` is returned. Expired entries are **never** returned.
2. **Periodic Background Pruning (Optional)**: If you store items that may never be accessed again, configure `cleanupInterval: 60000` (e.g., 60 seconds). A lightweight, unreferenced timer calls `cache.prune()` in the background to reclaim memory.
3. **Manual Pruning**: Call `cache.prune()` whenever your application is under high memory pressure.

```javascript
// Default 5 second TTL
const cache = new Cache({ ttl: 5000 });

cache.set('session:1', { user: 'Bob' });
cache.set('token:temp', 'xyz', { ttl: 1000 }); // overrides to 1 second
cache.set('system:config', { live: true }, { ttl: 0 }); // never expires
```

---

## 8. LRU (Least Recently Used) Eviction

When working with limited memory, setting a `maxSize` protects your application from out-of-memory (`OOM`) crashes.

### How LRU Works

`tinycache-kit` implements LRU using a **Doubly Linked List** combined with a native `Map`:

```
   [MRU / Head] <---> [Node B] <---> [Node C] <---> [Tail / LRU]
      ^                                                   |
      |                                                   v
   Most Recently Accessed                           Eviction Target
```

- When an item is read (`get`) or updated (`set`), it is moved to the **Head** (Most Recently Used).
- When a new item is added and `cache.size() >= maxSize`, the node at the **Tail** (Least Recently Used) is popped in $O(1)$ time and removed from the map.
- The `evictions` counter is incremented.

```javascript
const cache = new Cache({ maxSize: 3 });

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);

// Read 'a' -> 'a' moves to MRU. Order: a, c, b (b is now LRU)
cache.get('a');

// Add 'd' -> 'b' is evicted!
cache.set('d', 4);

console.log(cache.has('b')); // false
console.log(cache.has('a')); // true
```

---

## 9. Cache Statistics & Monitoring

Understanding cache hit rates is critical for tuning system performance and database load.

```javascript
const cache = new Cache({ maxSize: 1000 });

// Perform operations...
cache.get('profile:1'); // miss
cache.set('profile:1', { name: 'Sarah' });
cache.get('profile:1'); // hit

console.log(cache.stats());
```

Output:
```javascript
{
  hits: 1,
  misses: 1,
  sets: 1,
  deletes: 0,
  evictions: 0,
  expirations: 0,
  size: 1,
  hitRate: 0.5 // 50% hit rate
}
```

To reset counters (e.g., at the start of each monitoring interval):
```javascript
cache.resetStats();
```

---

## 10. Async getOrSet & Stampede Protection

The **cache stampede** (or "dogpile" effect) occurs when a popular cache key expires and dozens of concurrent requests simultaneously query your database to regenerate the same cached value.

`tinycache-kit` includes built-in **Singleflight Promise Deduplication**:

```javascript
const cache = new Cache({ ttl: 30000 });

async function getProduct(productId) {
  return cache.getOrSet(`product:${productId}`, async () => {
    console.log('Querying database...'); // Executes only ONCE across concurrent calls
    const product = await db.products.findById(productId);
    return product;
  }, { ttl: 15000 });
}

// 10 concurrent requests arrive simultaneously:
const results = await Promise.all([
  getProduct('prod_99'),
  getProduct('prod_99'),
  getProduct('prod_99'),
  getProduct('prod_99'),
  getProduct('prod_99')
]);
// Database was queried exactly once! All 5 callers received the result.
```

### Error Safety
If the `asyncFunction` throws an error or rejects, the promise is **not** cached, and subsequent calls can retry immediately without being stuck on a cached error.

---

## 11. Express Integration

`tinycache-kit` provides optional, zero-dependency middleware for Express and Connect-compatible web frameworks.

```javascript
const express = require('express');
const { Cache, createCacheMiddleware } = require('tinycache-kit');

const app = express();
const cache = new Cache({ ttl: 60000, maxSize: 500 });

// Cache all successful GET requests for 30 seconds
app.get(
  '/api/catalog',
  createCacheMiddleware(cache, { ttl: 30000 }),
  async (req, res) => {
    const catalog = await fetchCatalogFromDB();
    res.json(catalog);
  }
);
```

### Middleware Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `ttl` | `number` | Cache default | Override TTL in milliseconds for responses on this route. |
| `keyGenerator` | `(req) => string` | `req.originalUrl \|\| req.url` | Custom function to derive cache keys. |
| `condition` | `(req) => boolean` | `req.method === 'GET'` | Filter which requests can be cached. |
| `exclude` | `Array<string \| RegExp> \| Function` | `[]` | Exclude specific URL patterns from caching. |
| `headers` | `boolean` | `true` | Attach `X-Cache: HIT` or `X-Cache: MISS` headers. |
| `statusCodes` | `number[]` | `[200]` | HTTP status codes eligible for caching (errors are ignored). |

### Custom Key Generation & Multi-Tenant Example

```javascript
const middleware = createCacheMiddleware(cache, {
  // Partition cache by tenant ID and query params
  keyGenerator: (req) => `${req.headers['x-tenant-id'] || 'default'}:${req.originalUrl}`,
  exclude: ['/api/catalog/live', /^\/api\/catalog\/internal/],
  headers: true
});

app.use('/api/catalog', middleware);
```

---

## 12. Configuration Options

Summary of constructor options for `new Cache(options)`:

```typescript
interface CacheOptions {
  ttl?: number;              // Milliseconds, default 0 (no expiration)
  maxSize?: number;          // Positive integer, default Infinity
  eviction?: 'lru';          // Eviction policy, default 'lru'
  cleanupInterval?: number;  // Milliseconds, default null (disabled)
  trackStats?: boolean;      // Collect metrics, default true
}
```

---

## 13. Error Handling

`tinycache-kit` exports custom, inspectable error classes:

```javascript
const {
  Cache,
  TinyCacheError,
  InvalidOptionError,
  InvalidKeyError
} = require('tinycache-kit');

try {
  const cache = new Cache({ maxSize: -10 });
} catch (err) {
  if (err instanceof InvalidOptionError) {
    console.error('Invalid option passed:', err.message, err.code);
    // code: 'ERR_INVALID_OPTION'
  }
}

try {
  const cache = new Cache();
  cache.set(null, 'value');
} catch (err) {
  if (err instanceof InvalidKeyError) {
    console.error('Invalid key passed:', err.message, err.code);
    // code: 'ERR_INVALID_KEY'
  }
}
```

---

## 14. Examples

Check out the executable scripts in the `examples/` directory:

- [basic.js](./examples/basic.js): Core operations (`set`, `get`, `has`, `delete`, `clear`, `keys`).
- [ttl.js](./examples/ttl.js): Global TTL, per-entry overrides, and background pruning.
- [lru.js](./examples/lru.js): LRU eviction behavior under capacity constraints.
- [statistics.js](./examples/statistics.js): Performance metrics tracking and hit rate computation.
- [express.js](./examples/express.js): Express server route caching and metrics endpoints.

Run any example directly:
```bash
node examples/basic.js
node examples/ttl.js
node examples/lru.js
node examples/statistics.js
```

---

## 15. Performance Considerations

- **O(1) Everything**: All lookups, insertions, deletions, and LRU updates operate in constant $O(1)$ time complexity using direct pointer manipulation in a doubly linked list and native JavaScript `Map` indexing.
- **No Event Loop Blocking**: Expirations are evaluated lazily on demand. If background cleanup is enabled, it uses non-blocking intervals with `.unref()`, preventing open handle leaks when your server is shutting down.
- **Low Memory Overhead**: Nodes contain only necessary pointer references and timestamps, avoiding hidden closures or complex object wrappers.

---

## 16. Limitations

> [!IMPORTANT]
> **Process-Local In-Memory Cache**: `tinycache-kit` stores all cached entries within the local memory of the current Node.js process. It does **not** provide distributed or shared storage across multiple cluster workers or server instances.
>
> If your application is scaled horizontally across multiple servers or Kubernetes pods and requires global cache coherence, consider a distributed cache (e.g., Redis or Memcached), or use `tinycache-kit` as an L1 (in-process) cache paired with Redis as an L2 (network) cache.

---

## 17. Contributing

Contributions, bug reports, and pull requests are warmly welcome!

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct, development workflow, and testing requirements.

```bash
# Clone the repository
git clone https://github.com/taranveersingh/tinycache-kit.git
cd tinycache-kit

# Run tests
npm test

# Run tests with code coverage
npm run test:coverage
```

---

## 18. License

This project is licensed under the terms of the [MIT License](./LICENSE).

Copyright (c) 2026 Taranveer Singh.
