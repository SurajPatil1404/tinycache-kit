'use strict';

const { Cache } = require('./Cache');
const { createCacheMiddleware } = require('./middleware');
const { DoublyLinkedList, ListNode } = require('./eviction');
const { Statistics } = require('./statistics');
const { CleanupManager } = require('./cleanup');
const {
  TinyCacheError,
  InvalidOptionError,
  InvalidKeyError
} = require('./errors');

module.exports = {
  Cache,
  createCacheMiddleware,
  DoublyLinkedList,
  ListNode,
  Statistics,
  CleanupManager,
  TinyCacheError,
  InvalidOptionError,
  InvalidKeyError
};
