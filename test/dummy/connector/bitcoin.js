class DummyBitcoinConnector {
  constructor () { Object.freeze(this) }
  async init () { throw new Error('dummy method called') }
  async publishData () { throw new Error('dummy method called') }
  async txConfirmed () { throw new Error('dummy method called') }
}

Object.freeze(DummyBitcoinConnector)
Object.freeze(DummyBitcoinConnector.prototype)

module.exports = DummyBitcoinConnector
