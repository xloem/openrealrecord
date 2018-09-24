const sinon = require('sinon')

class StubStream {
  constructor () {
    this.write = sinon.stub()
    Object.freeze(this)
  }
}

Object.freeze(StubStream)
Object.freeze(StubStream.prototype)

module.exports = StubStream
