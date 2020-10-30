const test = require('ava')
const bcoin = require('bcoin')
const BcoinBitcoinConnector = require('connector/bitcoin/bcoin')
const StaticBitcoinFeeProvider = require('provider/bitcoin/fee/static')
const BcoinBitcoinBlockchainFixture =
  require('fixture/blockchain/bitcoin/bcoin')
const StubStream = require('stub/stream')
const messages = require('messages')
const BitcoinPublishCheckpointModule = require('module/pubcheck/bitcoin')

const regtest = bcoin.Network.get('regtest')
const feeRate = 1000000 // 0.01 BTC
const contentHash = Buffer.from([
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10,
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10,
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10,
  0x01, 0x02
])

function txObserved (blockchain) {
  return new Promise(function executeTxObserved (resolve) {
    const socket = blockchain.walletNodeClient.socket
    socket.bind('tx', handleTxObserved)
    function handleTxObserved (...args) {
      const [ , tx ] = args
      const { hash: txidString } = tx
      const txid = Buffer.from(txidString, 'hex')
      socket.unbind('tx', handleTxObserved)
      resolve(txid)
    }
  })
}

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

test.serial('1 checkpoint', async t => {
  // Setup
  const { blockchain, connector } = t.context
  const stream = new StubStream()
  stream.writeCheckPub.callsArgWithAsync(2, null) // Successful write
  const txObservedPromise = txObserved(blockchain)
  const publisher = new BitcoinPublishCheckpointModule(stream, connector)

  // Stimulus
  publisher.start()
  const checkpoint = { rootsHash: contentHash }
  stream.emit('checkpoint', checkpoint)
  const txid = await txObservedPromise
  await blockchain.chainNodeClient.execute('generate', [ 2 ])
  await connector.txConfirmed(txid)
  await publisher.stop()

  // Response
  const call = stream.writeCheckPub.firstCall
  t.truthy(call)
  const args = call.args
  t.is(args[0], 'bitcoin')
  const referenceEncoded = args[1]
  const reference =
    messages.BitcoinCheckpointPublication.decode(referenceEncoded)
  t.deepEqual(reference.hash, contentHash)
  t.deepEqual(reference.txid, txid)
})

test.serial('3 checkpoints', async t => {
  // Setup
  const { blockchain, connector } = t.context
  const stream = new StubStream()
  stream.writeCheckPub.callsArgWithAsync(2, null) // Successful write
  const publisher = new BitcoinPublishCheckpointModule(stream, connector)
  publisher.start()

  for (const i of [ 0, 1, 2 ]) {
    // Stimulus
    const contentHash = Buffer.from([ i ])
    const checkpoint = { rootsHash: contentHash }
    stream.emit('checkpoint', checkpoint)
    const txid = await txObserved(blockchain)
    await blockchain.chainNodeClient.execute('generate', [ 2 ])
    await connector.txConfirmed(txid)

    // Response
    const call = stream.writeCheckPub.getCall(i)
    t.truthy(call)
    const args = call.args
    t.is(args[0], 'bitcoin')
    const referenceEncoded = args[1]
    const reference =
      messages.BitcoinCheckpointPublication.decode(referenceEncoded)
    t.deepEqual(reference.hash, contentHash)
    t.deepEqual(reference.txid, txid)
  }
})

test.serial('discarded checkpoint', async t => {
  // Setup
  const { blockchain, connector } = t.context
  const stream = new StubStream()
  stream.writeCheckPub.callsArgWithAsync(2, null) // Successful write
  const publisher = new BitcoinPublishCheckpointModule(stream, connector)
  publisher.start()

  // Stimulus
  const contentHash1 = Buffer.from([ 1 ])
  const checkpoint1 = { rootsHash: contentHash1 }
  stream.emit('checkpoint', checkpoint1)
  const contentHash2 = Buffer.from([ 2 ])
  const checkpoint2 = { rootsHash: contentHash2 }
  stream.emit('checkpoint', checkpoint2)
  const contentHash3 = Buffer.from([ 3 ])
  const checkpoint3 = { rootsHash: contentHash3 }
  stream.emit('checkpoint', checkpoint3)
  const txids = []
  const txid1 = await txObserved(blockchain)
  txids.push(txid1)
  await blockchain.chainNodeClient.execute('generate', [ 2 ])
  await connector.txConfirmed(txid1)
  const txid2 = await txObserved(blockchain)
  txids.push(txid2)
  await blockchain.chainNodeClient.execute('generate', [ 2 ])
  await connector.txConfirmed(txid2)

  // Response
  const expectedContentHashes = [ contentHash1, contentHash3 ]
  for (const i of [ 0, 1 ]) {
    const call = stream.writeCheckPub.getCall(i)
    t.truthy(call)
    const args = call.args
    t.is(args[0], 'bitcoin')
    const referenceEncoded = args[1]
    const reference =
      messages.BitcoinCheckpointPublication.decode(referenceEncoded)
    t.deepEqual(reference.hash, expectedContentHashes[i])
    t.deepEqual(reference.txid, txids[i])
  }
})
