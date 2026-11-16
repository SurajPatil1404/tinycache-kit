'use strict';

/**
 * Base error class for all tinycache-kit errors.
 */
class TinyCacheError extends Error {
  /**
   * @param {string} message
   * @param {string} [code='ERR_TINYCACHE']
   */
  constructor(message, code = 'ERR_TINYCACHE') {
    super(message);
    this.name = 'TinyCacheError';
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when an invalid configuration option or argument is supplied.
 */
class InvalidOptionError extends TinyCacheError {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message, 'ERR_INVALID_OPTION');
    this.name = 'InvalidOptionError';
  }
}

/**
 * Thrown when an invalid key is provided to a cache operation.
 */
class InvalidKeyError extends TinyCacheError {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message, 'ERR_INVALID_KEY');
    this.name = 'InvalidKeyError';
  }
}

module.exports = {
  TinyCacheError,
  InvalidOptionError,
  InvalidKeyError
};
