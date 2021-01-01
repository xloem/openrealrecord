const test = require('ava')
const bcoin = require('bcoin')
const BcoinBitcoinBlockchainFixture =
  require('fixture/blockchain/bitcoin/bcoin')
const StaticBitcoinFeeProvider = require('provider/bitcoin/fee/static')
const BcoinBitcoinConnector = require('connector/bitcoin/bcoin')

const regtest = bcoin.Network.get('regtest')
const feeRate = 1000000 // 0.01 BTC
const outputAddress = 'RWSK19TJ6W8siH7tciERmrK8C9xzbhr3wD'
const timeout = 1000 // 1 second

test.beforeEach(async t => {
  const blockchain = new BcoinBitcoinBlockchainFixture()
  await blockchain.setup()
  await blockchain.mine()
  const feeProvider = new StaticBitcoinFeeProvider(feeRate)
  const connector = new BcoinBitcoinConnector({
    network: regtest,
    feeProvider,
    wallet: {
      port: blockchain.walletNodeRpcPort,
      apiKey: blockchain.walletNodeApiKey,
      id: blockchain.walletId,
      passphrase: blockchain.walletPassphrase,
      account: blockchain.walletAccount
    }
  })
  await connector.init()
  Object.assign(t.context, {
    blockchain,
    connector
  })
})

test.afterEach.always(async t => {
  const { blockchain } = t.context
  if (blockchain) await blockchain.teardown()
})

test.serial('already confirmed', async t => {
  const { blockchain, connector } = t.context
  const output = { value: 50000, address: outputAddress }
  const { hash: txidString } = await blockchain.walletClient.send({
    passphrase: blockchain.walletPassphrase,
    rate: feeRate,
    outputs: [ output ]
  })
  const txid = Buffer.from(txidString, 'hex')
  await blockchain.chainNodeClient.execute('generate', [ 1 ])
  const txConfirmedPromise = connector.txConfirmed(txid, 1, timeout)
  await t.notThrowsAsync(txConfirmedPromise, 'tx confirmed')
})

test.serial('confirmed subsequent', async t => {
  const { blockchain, connector } = t.context
  const output = { value: 50000, address: outputAddress }
  const { hash: txidString } = await blockchain.walletClient.send({
    passphrase: blockchain.walletPassphrase,
    rate: feeRate,
    outputs: [ output ]
  })
  const txid = Buffer.from(txidString, 'hex')
  const txConfirmedPromise = connector.txConfirmed(txid, 1, timeout)
  await blockchain.chainNodeClient.execute('generate', [ 1 ])
  await t.notThrowsAsync(txConfirmedPromise, 'tx confirmed')
})

test.serial('timeout', async t => {
  const { connector } = t.context
  const txidString =
    '0123456789012345678901234567890123456789012345678901234567890123'
  const txid = Buffer.from(txidString, 'hex')
  const txConfirmedPromise = connector.txConfirmed(txid, 1, 0)
  await t.throwsAsync(
    txConfirmedPromise,
    'timed out',
    'wait timed out'
  )
})
