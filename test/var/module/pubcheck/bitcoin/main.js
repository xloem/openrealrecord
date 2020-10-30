/*
 * Waits up to 1 hour for confirmation.
 *
 * Pass environment variables:
 *
 * ORR_FEE_RATE - Bitcoin transaction fee rate in satoshis per kibibyte.
 *     Nonnegative integer. Default 10000 (0x0001 BTC).
 * ORR_WALLET_HOST - Wallet node hostname. Default `localhost`.
 * ORR_WALLET_PORT - Wallet node port. Default standard `testnet` port.
 * ORR_WALLET_API_KEY - Wallet node API key. Default none.
 * ORR_WALLET_ID - Wallet identifier. Default 'primary'.
 * ORR_WALLET_PASSPHRASE - Wallet passphrase. Default none.
 * ORR_WALLET_ACCOUNT - Wallet account name. Default `default`.
 */

const test = require('ava')
const bcoin = require('bcoin')
const process = require('process')
const BcoinBitcoinConnector = require('connector/bitcoin/bcoin')
const StaticBitcoinFeeProvider = require('provider/bitcoin/fee/static')
const StubStream = require('stub/stream')
const messages = require('messages')
const BitcoinPublishCheckpointModule = require('module/pubcheck/bitcoin')

const undef = void 0

const env = process.env
const testnet = bcoin.Network.get('testnet')
const defaultFeeRate = 10000 // 0.0001 BTC
const contentHash = Buffer.from([
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10,
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10,
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10,
  0x01, 0x02
])

test.beforeEach(async t => {
  const feeRate =
    env.ORR_FEE_RATE !== undef ? env.ORR_FEE_RATE : defaultFeeRate
  console.log('Using fee rate: ' + feeRate)
  const host = env.ORR_WALLET_HOST
  const port = env.ORR_WALLET_PORT
  const apiKey = env.ORR_WALLET_API_KEY
  const id = env.ORR_WALLET_ID
  const passphrase = env.ORR_WALLET_PASSPHRASE
  const account = env.ORR_WALLET_ACCOUNT
  const feeProvider = new StaticBitcoinFeeProvider(feeRate)
  const connector = new BcoinBitcoinConnector({
    network: testnet,
    feeProvider,
    wallet: {
      host,
      port,
      apiKey,
      id,
      passphrase,
      account
    }
  })
  console.log('Connector created')
  await connector.init()
  console.log('Connector initialized')
  Object.assign(t.context, {
    connector
  })
})

test.serial('1 checkpoint', async t => {
  // Setup
  const { connector } = t.context
  const stream = new StubStream()
  const proc = {
    resolve: {}
  }
  const referencePromise = new Promise(
    function revealReferencePromise (resolve) {
      proc.resolve.reference = resolve
    }
  )
  // Reveal data and signal successful write
  stream.writeCheckPub.callsFake(
    function executeStreamWriteCheckPub (type, data, callback) {
      proc.resolve.reference(data)
      process.nextTick(deliverWriteCheckPubDone)
      function deliverWriteCheckPubDone () {
        callback(null)
      }
    }
  )
  const publisher = new BitcoinPublishCheckpointModule(
    stream,
    connector,
    1 * 60 * 60 * 1000 // 1 hour confirm timeout
  )
  console.log('Publisher created')
  publisher.start()
  console.log('Publisher started')

  // Stimulus
  const checkpoint = { rootsHash: contentHash }
  stream.emit('checkpoint', checkpoint)
  console.log('Checkpoint emitted, hash:')
  console.log(checkpoint.rootsHash)

  // Response
  const referenceEncoded = await referencePromise
  const reference =
    messages.BitcoinCheckpointPublication.decode(referenceEncoded)
  console.log('Publication reference observed')
  console.log(reference)
  t.true(reference.txid instanceof Buffer)
  const hash = reference.hash
  t.deepEqual(hash, contentHash)
})
