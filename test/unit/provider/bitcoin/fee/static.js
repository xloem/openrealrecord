const test = require('ava')
const StaticBitcoinFeeProvider = require('provider/bitcoin/fee/static')

test('construct', t => {
  t.notThrows(() => {
    new StaticBitcoinFeeProvider(0) /* eslint-disable-line no-new */
  })
})

test('1 access', async t => {
  const fee = new StaticBitcoinFeeProvider(7)
  t.is(await fee.rate, 7)
})

test('3 accesses', async t => {
  const fee = new StaticBitcoinFeeProvider(5)
  t.is(await fee.rate, 5)
  t.is(await fee.rate, 5)
  t.is(await fee.rate, 5)
})
