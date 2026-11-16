'use strict';

/**
 * Manages background cleanup intervals for expired cache entries.
 */
class CleanupManager {
  /**
   * @param {() => void} pruneCallback
   * @param {number|null} [interval=null]
   */
  constructor(pruneCallback, interval = null) {
    if (typeof pruneCallback !== 'function') {
      throw new TypeError('pruneCallback must be a function');
    }
    this._pruneCallback = pruneCallback;
    this._interval = interval;
    this._timer = null;
  }

  /**
   * Start the periodic cleanup task.
   * @param {number} [interval]
   */
  start(interval) {
    if (interval !== undefined) {
      this._interval = interval;
    }

    this.stop();

    if (typeof this._interval === 'number' && this._interval > 0 && Number.isFinite(this._interval)) {
      this._timer = setInterval(() => {
        try {
          this._pruneCallback();
        } catch (_) {
          // Prevent unhandled errors from breaking the timer
        }
      }, this._interval);

      // Unref timer so it does not keep the Node.js process alive
      if (typeof this._timer.unref === 'function') {
        this._timer.unref();
      }
    }
  }

  /**
   * Stop the periodic cleanup task.
   */
  stop() {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Check if cleanup timer is currently running.
   * @returns {boolean}
   */
  isRunning() {
    return this._timer !== null;
  }
}

module.exports = {
  CleanupManager
};
