const test = require('ava')
const DummyBitcoinConnector = require('dummy/connector/bitcoin')
const DummyStream = require('dummy/stream')
const BitcoinPublishCheckpointModule = require('module/pubcheck/bitcoin')

test('construct', t => {
  const stream = new DummyStream()
  const bitcoin = new DummyBitcoinConnector()
  t.notThrows(() => {
    /* eslint-disable-next-line no-new */
    new BitcoinPublishCheckpointModule(stream, bitcoin)
  })
})
