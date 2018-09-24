const sinon = require('sinon')

class StubModuleControllerPromises {
  constructor (...args) {
    this.args = args
    this.getter = { stop: sinon.stub() }
    Object.defineProperty(this, 'stop', { get: this.getter.stop })
    Object.freeze(this)
  }
}

Object.freeze(StubModuleControllerPromises)
Object.freeze(StubModuleControllerPromises.prototype)

module.exports = StubModuleControllerPromises
