const sinon = require('sinon')

class SpyStream {
  constructor () {
    this.write = sinon.spy()
    Object.freeze(this)
  }
}

Object.freeze(SpyStream)
Object.freeze(SpyStream.prototype)

module.exports = SpyStream
