import pkg from './index.js';

export const {
  Cache,
  createCacheMiddleware,
  DoublyLinkedList,
  ListNode,
  Statistics,
  CleanupManager,
  TinyCacheError,
  InvalidOptionError,
  InvalidKeyError
} = pkg;

export default Cache;
