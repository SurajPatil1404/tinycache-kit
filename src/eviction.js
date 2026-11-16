'use strict';

/**
 * Node in a doubly linked list representing a cached entry.
 */
class ListNode {
  /**
   * @param {*} key
   * @param {*} value
   * @param {number|null} [expiresAt=null]
   */
  constructor(key, value, expiresAt = null) {
    this.key = key;
    this.value = value;
    this.expiresAt = expiresAt;
    this.createdAt = Date.now();
    this.lastAccessedAt = this.createdAt;
    this.prev = null;
    this.next = null;
  }

  /**
   * Check whether this node has expired.
   * @param {number} [now=Date.now()]
   * @returns {boolean}
   */
  isExpired(now = Date.now()) {
    return this.expiresAt !== null && now > this.expiresAt;
  }
}

/**
 * Doubly linked list for O(1) LRU eviction tracking.
 * - `head` points to the Most Recently Used (MRU) node.
 * - `tail` points to the Least Recently Used (LRU) node.
 */
class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  /**
   * Insert a new node at the head (MRU).
   * @param {ListNode} node
   */
  insertHead(node) {
    node.prev = null;
    node.next = this.head;

    if (this.head !== null) {
      this.head.prev = node;
    } else {
      this.tail = node;
    }

    this.head = node;
    this.length++;
  }

  /**
   * Move an existing node in the list to the head (MRU).
   * @param {ListNode} node
   */
  moveToHead(node) {
    if (this.head === node) {
      return;
    }

    this.remove(node);
    this.insertHead(node);
  }

  /**
   * Remove a node from the list.
   * @param {ListNode} node
   */
  remove(node) {
    if (node.prev !== null) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next !== null) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
    this.length--;
  }

  /**
   * Remove and return the tail node (LRU).
   * @returns {ListNode|null}
   */
  popTail() {
    if (this.tail === null) {
      return null;
    }
    const lruNode = this.tail;
    this.remove(lruNode);
    return lruNode;
  }

  /**
   * Clear all nodes from the list.
   */
  clear() {
    let current = this.head;
    while (current !== null) {
      const next = current.next;
      current.prev = null;
      current.next = null;
      current = next;
    }
    this.head = null;
    this.tail = null;
    this.length = 0;
  }
}

module.exports = {
  ListNode,
  DoublyLinkedList
};
