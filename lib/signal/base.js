/** @module signal/base */

const privs = new WeakMap()

/**
 * Signal base class.
 *
 * @abstract
 */
class Signal {
  /**
   * @param {string} [message=] - Signal message. May use to communicate
   *     source of signal. Useful for distinguishing multiple sources.
   */
  constructor (message) {
    if (new.target === Signal) throw new Error('constructed abstract clas')
    if (typeof message !== 'string') {
      const error = new TypeError('param message')
      error.expected = 'string'
      error.message = message
      throw error
    }
    const priv = {
      message
    }
    privs.set(this, priv)
  }

  /**
   * Signal message.
   *
   * @var {string}
   * @readonly
   */
  get message () {
    const priv = privs.get(this)
    return priv.message
  }
}

Object.freeze(Signal)
Object.freeze(Signal.prototype)

module.exports = Signal
