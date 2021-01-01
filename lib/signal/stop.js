/** @module signal/stop */

const Signal = require('./base')

/**
 * Stop signal.
 *
 * Requests stop of a process.
 */
class StopSignal extends Signal {
  constructor (...args) {
    super(...args)
    if (new.target === StopSignal) Object.freeze(this)
  }
}

Object.freeze(StopSignal)
Object.freeze(StopSignal.prototype)

module.exports = StopSignal
