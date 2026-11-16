'use strict';

/**
 * Example demonstrating TinyCache Express Middleware.
 * To run this example:
 *   npm install express
 *   node examples/express.js
 */

let express;
try {
  express = require('express');
} catch (_) {
  console.log('To run this example with a live server, run: npm install express');
  console.log('Below is the standard integration pattern:\n');
}

const { Cache, createCacheMiddleware } = require('../src/index');

const cache = new Cache({
  ttl: 30000, // 30 seconds default
  maxSize: 500,
  trackStats: true
});

if (express) {
  const app = express();
  app.use(express.json());

  // 1. Cached route with custom 10s TTL
  app.get(
    '/products',
    createCacheMiddleware(cache, { ttl: 10000 }),
    (req, res) => {
      console.log('--> Processing /products from database...');
      res.json([
        { id: 1, name: 'Wireless Headphones', price: 99.99 },
        { id: 2, name: 'Mechanical Keyboard', price: 149.99 }
      ]);
    }
  );

  // 2. Cached route with route parameter
  app.get(
    '/products/:id',
    createCacheMiddleware(cache),
    (req, res) => {
      console.log(`--> Fetching product ${req.params.id} from database...`);
      res.json({ id: req.params.id, name: `Product ${req.params.id}`, stock: 45 });
    }
  );

  // 3. Cache statistics endpoint
  app.get('/cache/stats', (req, res) => {
    res.json(cache.stats());
  });

  // 4. Manual cache purge
  app.delete('/cache', (req, res) => {
    cache.clear();
    res.json({ message: 'Cache successfully cleared', stats: cache.stats() });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Try:');
    console.log(`  curl -i http://localhost:${PORT}/products       (1st request: X-Cache: MISS)`);
    console.log(`  curl -i http://localhost:${PORT}/products       (2nd request: X-Cache: HIT)`);
    console.log(`  curl http://localhost:${PORT}/cache/stats`);
  });
} else {
  console.log(`
const express = require('express');
const { Cache, createCacheMiddleware } = require('tinycache-kit');

const app = express();
const cache = new Cache({ ttl: 30000, maxSize: 500 });

app.get('/products', createCacheMiddleware(cache, { ttl: 10000 }), (req, res) => {
  res.json([{ id: 1, name: 'Product' }]);
});

app.get('/cache/stats', (req, res) => {
  res.json(cache.stats());
});

app.listen(3000);
  `);
}
