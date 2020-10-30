/** @module openrealrecord/module/iterable */

const Module = require('./base')

const privs = new WeakMap()

/**
 * Feed an `Iterable` to a stream.
 *
 * @example
const { IterableModule } = require('openrealrecord/module')

const stream = createStream()
const data = [
  Buffer.from('1234', 'hex'),
  Buffer.from('5678', 'hex'),
  Buffer.from('ddff', 'hex')
]
const module = new IterableModule(stream, data)
module.start()
 */
class IterableModule extends Module {
  /**
   * @param {Stream} stream - Stream to feed data to.
   * @param {Iterable<Buffer>} iterable - Data to feed to stream.
   */
  constructor (stream, iterable) {
    super(stream, executor)
    const self = this
    function executor (...args) { return privm.executor.call(self, ...args) }
    function * relayer () { yield * iterable }
    const iterator = relayer() // Ensures resumable iterator
    const priv = {
      iterator
    }
    privs.set(this, priv)
    if (new.target === IterableModule) Object.freeze(this)
  }
}

// Private methods
const privm = {
  /**
   * Module executor.
   *
   * Writes each item of provided iterable to stream.
   */
  async executor (controller) {
    const priv = privs.get(this)
    const iterator = priv.iterator
    for (const item of iterator) {
      await controller.write(item)
      if (controller.stop) return
    }
    controller.done()
  }
}

Object.freeze(IterableModule)
Object.freeze(IterableModule.prototype)

module.exports = IterableModule
