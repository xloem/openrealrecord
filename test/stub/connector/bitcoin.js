const sinon = require('sinon')

class StubBitcoinConnector {
  constructor (...args) {
    this.args = args
    this.publishCheckpoint = sinon.stub()
    this.transactionConfirmed = sinon.stub()
  }
}

Object.freeze(StubBitcoinConnector)
Object.freeze(StubBitcoinConnector.prototype)

module.exports = StubBitcoinConnector
