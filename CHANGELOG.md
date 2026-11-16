# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-16

### Added
- Core `Cache` class featuring constant-time $O(1)$ operations for `set`, `get`, `has`, `delete`, `clear`, and `size`.
- Least Recently Used (LRU) eviction algorithm backed by a Doubly Linked List and native JavaScript `Map`.
- Configurable Time-To-Live (TTL) expiration with lazy expiration and per-entry TTL overrides.
- Background memory management via unreferenced periodic cleanup intervals (`cleanupInterval`, `prune()`, `startCleanup()`, `stopCleanup()`).
- Singleflight concurrency deduplication (`getOrSet()`) protecting against cache stampedes (dogpile effect).
- In-memory cache performance statistics tracking hits, misses, sets, deletes, evictions, expirations, and hit rate (`stats()`, `resetStats()`).
- Zero-dependency Express / Connect caching middleware with `X-Cache` response headers and custom key generation (`createCacheMiddleware`).
- Full TypeScript declarations (`types/index.d.ts`).
- Dual module package support with CommonJS (`index.js`) and ES Module (`index.mjs`) exports.
- Native Node.js test suite with 100% source code coverage.
