const sinon = require('sinon')

class StubModuleRelay {
  constructor ({ deliverStop }, revealer) {
    this.deliverStop = sinon.spy(deliverStop)
    this.promise = { done: null }
    this.resolve = { done: null }
    this.reject = { done: null }
    const donePromise = new Promise((resolve, reject) => {
      this.resolve.done = resolve
      this.reject.done = reject
    })
    this.getter = {
      done: sinon.stub().returns(donePromise)
    }
    Object.defineProperty(this, 'done', { get: this.getter.done })
    this.stop = sinon.stub()
    const deliverDone = this.deliverDone = sinon.stub()
    Object.freeze(this)
    revealer({ deliverDone })
  }
}

Object.freeze(StubModuleRelay)
Object.freeze(StubModuleRelay.prototype)

module.exports = StubModuleRelay
