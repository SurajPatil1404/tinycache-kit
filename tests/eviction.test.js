'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Cache, DoublyLinkedList, ListNode } = require('../src/index');

describe('LRU Eviction and DoublyLinkedList', () => {
  it('should evict the least recently used entry when maxSize is reached', () => {
    const cache = new Cache({ maxSize: 3 });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    assert.equal(cache.size(), 3);

    // Adding 'd' should evict 'a' (oldest / LRU)
    cache.set('d', 4);
    assert.equal(cache.size(), 3);
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.get('b'), 2);
    assert.equal(cache.get('c'), 3);
    assert.equal(cache.get('d'), 4);
  });

  it('should refresh recency upon get() to prevent eviction', () => {
    const cache = new Cache({ maxSize: 3 });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Access 'a', making it MRU. The order from MRU to LRU becomes: a, c, b
    cache.get('a');

    // Inserting 'd' should now evict 'b' (which is now the LRU)
    cache.set('d', 4);

    assert.equal(cache.get('b'), undefined); // 'b' was evicted!
    assert.equal(cache.get('a'), 1); // 'a' was preserved!
    assert.equal(cache.get('c'), 3);
    assert.equal(cache.get('d'), 4);
  });

  it('should refresh recency upon set() to an existing key', () => {
    const cache = new Cache({ maxSize: 3 });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Update 'a', making it MRU. LRU is now 'b'
    cache.set('a', 100);

    // Insert 'd', which evicts 'b'
    cache.set('d', 4);

    assert.equal(cache.get('b'), undefined);
    assert.equal(cache.get('a'), 100);
    assert.equal(cache.get('c'), 3);
    assert.equal(cache.get('d'), 4);
  });

  it('should correctly handle capacity of 1', () => {
    const cache = new Cache({ maxSize: 1 });

    cache.set('first', 'hello');
    assert.equal(cache.get('first'), 'hello');

    cache.set('second', 'world');
    assert.equal(cache.get('first'), undefined);
    assert.equal(cache.get('second'), 'world');
    assert.equal(cache.size(), 1);
  });

  describe('DoublyLinkedList standalone tests', () => {
    it('should manage head, tail, moveToHead and popTail properly', () => {
      const list = new DoublyLinkedList();
      assert.equal(list.popTail(), null);

      const node1 = new ListNode('k1', 'v1');
      const node2 = new ListNode('k2', 'v2');
      const node3 = new ListNode('k3', 'v3');

      list.insertHead(node1);
      assert.equal(list.head, node1);
      assert.equal(list.tail, node1);
      assert.equal(list.length, 1);

      list.insertHead(node2);
      assert.equal(list.head, node2);
      assert.equal(list.tail, node1);
      assert.equal(list.length, 2);

      // Move tail (node1) to head
      list.moveToHead(node1);
      assert.equal(list.head, node1);
      assert.equal(list.tail, node2);

      // Move head to head should be a no-op
      list.moveToHead(node1);
      assert.equal(list.head, node1);

      // Insert node3 at head
      list.insertHead(node3);
      // Remove middle node (node1)
      list.remove(node1);
      assert.equal(list.length, 2);
      assert.equal(list.head, node3);
      assert.equal(list.tail, node2);

      // popTail
      const popped = list.popTail();
      assert.equal(popped, node2);
      assert.equal(list.length, 1);
      assert.equal(list.head, node3);
      assert.equal(list.tail, node3);

      // clear
      list.clear();
      assert.equal(list.length, 0);
      assert.equal(list.head, null);
      assert.equal(list.tail, null);
    });

    it('ListNode isExpired method works with custom and default time', () => {
      const node = new ListNode('k', 'v', 5000);
      assert.equal(node.isExpired(4000), false);
      assert.equal(node.isExpired(6000), true);

      const eternalNode = new ListNode('k2', 'v2', null);
      assert.equal(eternalNode.isExpired(9999999), false);
    });
  });
});
