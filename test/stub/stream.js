const EventEmitter = require('events')
const sinon = require('sinon')

class StubStream extends EventEmitter {
  constructor (...args) {
    super(...args)
    this.write = sinon.stub()
    this.writeCheckPub = sinon.stub()
  }
}

Object.freeze(StubStream)
Object.freeze(StubStream.prototype)

module.exports = StubStream
