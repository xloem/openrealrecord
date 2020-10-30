class DummyStream {
  constructor () {
    Object.freeze(this)
  }
}

Object.freeze(DummyStream)
Object.freeze(DummyStream.prototype)

module.exports = DummyStream
