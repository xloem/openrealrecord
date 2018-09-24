const sinon = require('sinon')
const StubModuleRelay = require('./relay')

class StubModuleController {
  constructor (...args) {
    this.args = args
    this.stream = args[0]
    const revealer = this.revealer = args[1]
    const self = this
    this.done = sinon.stub()
    this.write = sinon.stub()
    this.getter = { stop: sinon.stub() }
    Object.defineProperty(this, 'stop', { get: this.getter.stop })
    const receiveStop = this.receiveStop = sinon.stub()
    const relay = this.relay = new StubModuleRelay(
      { deliverStop: receiveStop },
      function receiveRelayProtected ({ deliverDone }) {
        self.deliverDone = deliverDone
      }
    )
    Object.freeze(this)
    revealer({ relay })
  }
}

Object.freeze(StubModuleController)
Object.freeze(StubModuleController.prototype)

module.exports = StubModuleController
