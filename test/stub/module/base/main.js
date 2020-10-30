const sinon = require('sinon')
const StubModuleController = require('./controller')

class StubModule {
  constructor (...args) {
    this.args = args
    this.stream = args[0]
    this.executor = args[1]
    this.start = sinon.stub()
    this.stop = sinon.stub()
    this.getter = { done: sinon.stub() }
    Object.defineProperty(this, 'done', { get: this.getter.done })
    const controller = new StubModuleController(this.stream, () => {})
    this.controller = controller
    Object.freeze(this)
  }
}

Object.freeze(StubModule)
Object.freeze(StubModule.prototype)

module.exports = StubModule
