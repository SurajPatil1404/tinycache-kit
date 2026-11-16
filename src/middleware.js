'use strict';

const { InvalidOptionError } = require('./errors');

/**
 * @typedef {Object} CacheMiddlewareOptions
 * @property {number} [ttl] - Override TTL in milliseconds for cached responses.
 * @property {(req: any) => string} [keyGenerator] - Function to generate cache keys from requests.
 * @property {(req: any) => boolean} [condition] - Custom condition predicate (defaults to GET requests).
 * @property {Array<string|RegExp> | ((req: any) => boolean)} [exclude] - Paths or predicate to exclude from caching.
 * @property {boolean} [headers=true] - Whether to set X-Cache response headers ('HIT' / 'MISS').
 * @property {number[]} [statusCodes=[200]] - List of HTTP status codes eligible for caching.
 */

/**
 * Creates an Express-compatible caching middleware.
 * Zero-dependency: Express is not required at import time.
 *
 * @param {import('./Cache').Cache} cache - TinyCache instance.
 * @param {CacheMiddlewareOptions} [options={}] - Middleware options.
 * @returns {(req: any, res: any, next: (err?: any) => void) => void}
 */
function createCacheMiddleware(cache, options = {}) {
  if (!cache || typeof cache.get !== 'function' || typeof cache.set !== 'function') {
    throw new InvalidOptionError('A valid Cache instance is required for createCacheMiddleware');
  }

  const {
    ttl,
    keyGenerator = (req) => req.originalUrl || req.url,
    condition = (req) => req.method === 'GET',
    exclude = [],
    headers = true,
    statusCodes = [200]
  } = options;

  if (typeof keyGenerator !== 'function') {
    throw new InvalidOptionError('keyGenerator must be a function');
  }

  if (typeof condition !== 'function') {
    throw new InvalidOptionError('condition must be a function');
  }

  return function cacheMiddleware(req, res, next) {
    // 1. Only cache if condition is met (e.g. GET methods)
    if (!condition(req)) {
      return next();
    }

    // 2. Check exclusions
    if (typeof exclude === 'function') {
      if (exclude(req)) {
        return next();
      }
    } else if (Array.isArray(exclude) && exclude.length > 0) {
      const url = req.originalUrl || req.url || '';
      const isExcluded = exclude.some((pattern) => {
        if (pattern instanceof RegExp) {
          return pattern.test(url);
        }
        if (typeof pattern === 'string') {
          return url.startsWith(pattern);
        }
        return false;
      });

      if (isExcluded) {
        return next();
      }
    }

    // 3. Generate key and check cache
    const key = keyGenerator(req);
    const cached = cache.get(key);

    if (cached) {
      if (headers) {
        res.setHeader('X-Cache', 'HIT');
      }

      if (cached.headers) {
        for (const [headerName, headerValue] of Object.entries(cached.headers)) {
          res.setHeader(headerName, headerValue);
        }
      }

      return res.status(cached.statusCode).send(cached.body);
    }

    // 4. Cache miss: intercept response send
    if (headers) {
      res.setHeader('X-Cache', 'MISS');
    }

    const originalSend = res.send.bind(res);

    res.send = function cachedSend(body) {
      // Restore original send to prevent recursion
      res.send = originalSend;

      if (statusCodes.includes(res.statusCode)) {
        const cachedHeaders = {};
        const contentType = typeof res.getHeader === 'function'
          ? res.getHeader('content-type')
          : (res.get ? res.get('content-type') : undefined);

        if (contentType) {
          cachedHeaders['content-type'] = contentType;
        }

        const setOptions = typeof ttl === 'number' ? { ttl } : undefined;
        cache.set(key, {
          statusCode: res.statusCode,
          headers: cachedHeaders,
          body
        }, setOptions);
      }

      return originalSend(body);
    };

    next();
  };
}

module.exports = {
  createCacheMiddleware
};
