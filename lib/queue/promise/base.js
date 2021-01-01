/** @module openrealrecord/queue/promise/base */

const privs = new WeakMap()

/**
 * `Promise` based queue.
 * @implements {IPromiseQueue}
 */
class PromiseQueue {
  /**
   * @param {PromiseQueueRevealer} revealer - Protected component revealer.
   */
  constructor (revealer) {
    const priv = {
      requests: [],
      values: [],
      errored: false,
      error: null
    }
    privs.set(this, priv)
    const fail = protm.fail.bind(this)
    const updated = protm.updated.bind(this)
    if (new.target === PromiseQueue) Object.freeze(this)
    revealer({
      fail,
      updated,
      values: priv.values
    })
  }

  get next () {
    const priv = privs.get(this)
    if (priv.errored) return Promise.reject(priv.error)
    const request = Object.create(null)
    const promise = new Promise((resolve, reject) => {
      request.resolve = resolve
      request.reject = reject
    })
    if (priv.values.length) {
      const value = priv.values.shift()
      request.resolve(value)
    } else priv.requests.push(request)
    return promise
  }
}

Object.freeze(PromiseQueue)
Object.freeze(PromiseQueue.prototype)

// Protected methods
const protm = {
  /**
   * Fail queue.
   *
   * No effect if already errored.
   *
   * @implements {DeliverError}
   */
  fail (error) {
    const priv = privs.get(this)
    if (priv.errored) return
    priv.errored = true
    priv.error = error
    priv.values = null
    for (const request of priv.requests) request.reject(error)
    priv.requests = null
  },

  /**
   * Deliver updated message.
   *
   * @implements {DeliverUpdated}
   */
  updated () {
    const priv = privs.get(this)
    if (priv.errored) {
      const error = new Error('queue update while errored')
      error.cause = priv.error
      throw error
    }
    const { values, requests } = priv
    while (values.length && requests.length) {
      const value = values.shift()
      const request = requests.shift()
      request.resolve(value)
    }
  }
}

/**
 * Deliver error.
 *
 * @callback DeliverError
 *
 * @param {Error} error - Error to deliver.
 *     Message `'queue add while errored'`.
 */

/**
 * Deliver updated message.
 *
 * Delivers values to any queued requests.
 *
 * @callback DeliverUpdated
 *
 * @throws {Error} If the queue is errored.
 */

/**
 * Reveal promise queue protected components.
 *
 * @callback PromiseQueueRevealer
 *
 * @param {object} prot - Protected components revealed by promise queue.
 * @param {DeliverError} prot.fail - Fail queue.
 * @param {DeliverUpdated} prot.updated - Deliver updated message.
 * @param {Array} values - Values list.
 */

module.exports = PromiseQueue
