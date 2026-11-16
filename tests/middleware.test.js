'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  Cache,
  createCacheMiddleware,
  InvalidOptionError
} = require('../src/index');

/**
 * Creates mock req, res, and next helpers for testing middleware.
 */
function createMockHttp({
  method = 'GET',
  url = '/api/items',
  originalUrl = null,
  headers = {}
} = {}) {
  const req = {
    method,
    url,
    originalUrl: originalUrl !== null ? originalUrl : url,
    headers
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, val) {
      this.headers[name.toLowerCase()] = val;
    },
    getHeader(name) {
      return this.headers[name.toLowerCase()];
    },
    get(name) {
      return this.headers[name.toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    }
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, wasNextCalled: () => nextCalled };
}

describe('Express Middleware - createCacheMiddleware', () => {
  it('should validate arguments', () => {
    assert.throws(() => createCacheMiddleware(null), InvalidOptionError);
    assert.throws(() => createCacheMiddleware({}), InvalidOptionError);
    const cache = new Cache();
    assert.throws(() => createCacheMiddleware(cache, { keyGenerator: 'bad' }), InvalidOptionError);
    assert.throws(() => createCacheMiddleware(cache, { condition: 'bad' }), InvalidOptionError);
  });

  it('should cache successful GET responses and serve cache on subsequent request', () => {
    const cache = new Cache();
    const middleware = createCacheMiddleware(cache);

    // Request 1: Cache Miss
    const { req: req1, res: res1, next: next1 } = createMockHttp({ url: '/products' });
    middleware(req1, res1, next1);

    assert.equal(res1.getHeader('x-cache'), 'MISS');
    // Downstream route handler executes:
    res1.setHeader('content-type', 'application/json');
    res1.send(JSON.stringify([{ id: 1, name: 'Laptop' }]));

    assert.equal(cache.size(), 1);

    // Request 2: Cache Hit
    const { req: req2, res: res2, next: next2, wasNextCalled: nextCalled2 } = createMockHttp({ url: '/products' });
    middleware(req2, res2, next2);

    assert.equal(res2.getHeader('x-cache'), 'HIT');
    assert.equal(res2.getHeader('content-type'), 'application/json');
    assert.equal(res2.statusCode, 200);
    assert.equal(res2.body, JSON.stringify([{ id: 1, name: 'Laptop' }]));
    assert.equal(nextCalled2(), false); // Did not proceed downstream
  });

  it('should NOT cache non-GET requests (POST, PUT, DELETE, PATCH)', () => {
    const cache = new Cache();
    const middleware = createCacheMiddleware(cache);

    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const { req, res, next, wasNextCalled } = createMockHttp({ method, url: '/products' });
      middleware(req, res, next);

      assert.equal(wasNextCalled(), true);
      assert.equal(res.getHeader('x-cache'), undefined);

      res.send({ success: true });
      assert.equal(cache.size(), 0);
    }
  });

  it('should NOT cache error responses (4xx, 5xx)', () => {
    const cache = new Cache();
    const middleware = createCacheMiddleware(cache);

    const { req, res, next } = createMockHttp({ url: '/missing' });
    middleware(req, res, next);

    res.status(404).send({ error: 'Not Found' });
    assert.equal(cache.size(), 0);
  });

  it('should support custom keyGenerator', () => {
    const cache = new Cache();
    const middleware = createCacheMiddleware(cache, {
      keyGenerator: (req) => `${req.method}:${req.headers['x-tenant-id']}:${req.url}`
    });

    const { req, res, next } = createMockHttp({
      url: '/tenant-data',
      headers: { 'x-tenant-id': 'tenant-abc' }
    });
    middleware(req, res, next);
    res.send('data-abc');

    assert.equal(cache.has('GET:tenant-abc:/tenant-data'), true);
  });

  it('should support route exclusions via array and predicate', () => {
    const cache = new Cache();
    const middlewareWithArray = createCacheMiddleware(cache, {
      exclude: ['/admin', /^\/private/, 12345] // includes non-matching item to test fallback
    });

    // Excluded by string prefix
    const httpAdmin = createMockHttp({ url: '/admin/settings' });
    middlewareWithArray(httpAdmin.req, httpAdmin.res, httpAdmin.next);
    assert.equal(httpAdmin.wasNextCalled(), true);
    assert.equal(httpAdmin.res.getHeader('x-cache'), undefined);

    // Excluded by RegExp
    const httpPrivate = createMockHttp({ url: '/private/keys' });
    middlewareWithArray(httpPrivate.req, httpPrivate.res, httpPrivate.next);
    assert.equal(httpPrivate.wasNextCalled(), true);
    assert.equal(httpPrivate.res.getHeader('x-cache'), undefined);

    // Non-excluded URL with invalid pattern in array (hits return false fallback)
    const httpOther = createMockHttp({ url: '/other' });
    middlewareWithArray(httpOther.req, httpOther.res, httpOther.next);
    assert.equal(httpOther.wasNextCalled(), true);
    assert.equal(httpOther.res.getHeader('x-cache'), 'MISS');

    // Excluded by predicate function
    const middlewareWithFn = createCacheMiddleware(cache, {
      exclude: (req) => req.url.includes('skip')
    });
    const httpSkip = createMockHttp({ url: '/data?skip=true' });
    middlewareWithFn(httpSkip.req, httpSkip.res, httpSkip.next);
    assert.equal(httpSkip.wasNextCalled(), true);
    assert.equal(httpSkip.res.getHeader('x-cache'), undefined);
  });

  it('should support disabling X-Cache headers', () => {
    const cache = new Cache();
    const middleware = createCacheMiddleware(cache, { headers: false });

    const { req, res, next } = createMockHttp({ url: '/no-headers' });
    middleware(req, res, next);
    assert.equal(res.getHeader('x-cache'), undefined);

    res.send('ok');

    const hit = createMockHttp({ url: '/no-headers' });
    middleware(hit.req, hit.res, hit.next);
    assert.equal(hit.res.getHeader('x-cache'), undefined);
    assert.equal(hit.res.body, 'ok');
  });

  it('should support custom TTL on middleware', () => {
    const originalNow = Date.now;
    let mockTime = 1000000;
    Date.now = () => mockTime;

    try {
      const cache = new Cache({ ttl: 60000 }); // default 60s
      const middleware = createCacheMiddleware(cache, { ttl: 200 }); // override to 200ms

      const { req: req1, res: res1, next: next1 } = createMockHttp({ url: '/quick' });
      middleware(req1, res1, next1);
      res1.send('cached-quick');

      // Check immediate hit
      const { req: req2, res: res2, next: next2 } = createMockHttp({ url: '/quick' });
      middleware(req2, res2, next2);
      assert.equal(res2.getHeader('x-cache'), 'HIT');

      // Advance past 200ms
      mockTime += 250;
      const { req: req3, res: res3, next: next3 } = createMockHttp({ url: '/quick' });
      middleware(req3, res3, next3);
      assert.equal(res3.getHeader('x-cache'), 'MISS');
    } finally {
      Date.now = originalNow;
    }
  });
});
