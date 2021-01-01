const test = require('ava')
const bcoin = require('bcoin')
const Delay = require('helper/delay')
const BcoinBitcoinBlockchainFixture =
  require('fixture/blockchain/bitcoin/bcoin')
const StaticBitcoinFeeProvider = require('provider/bitcoin/fee/static')
const BcoinBitcoinConnector = require('connector/bitcoin/bcoin')

const regtest = bcoin.Network.get('regtest')
const feeRate = 1000000 // 0.01 BTC

// Watch chain for confirmation of named transaction
function txConfirmed (blockchain, txid) {
  return new Promise(function executeTxConfirmed (resolve, reject) {
    const txidString = txid.toString('hex')
    function handleTimeout () {
      blockchain.chainNode.removeListener('block', checkBlockForTx)
      reject(new Error('timed out'))
    }
    function checkBlockForTx (block) {
      if (block.txs.length < 2) return
      for (const tx of block.txs) {
        if (tx.txid() === txidString) {
          blockchain.chainNode.removeListener('block', checkBlockForTx)
          resolve(tx)
          return
        }
      }
    }
    Delay.seconds(1).then(handleTimeout)
    blockchain.chainNode.on('block', checkBlockForTx)
  })
}

test.beforeEach(async t => {
  const blockchain = new BcoinBitcoinBlockchainFixture()
  await blockchain.setup()
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

test.serial('too much data', async t => {
  const { connector } = t.context
  const data = Buffer.alloc(41)
  const publishDataPromise = connector.publishData(data)
  await t.throwsAsync(
    publishDataPromise,
    'too much data',
    'too much data fails'
  )
})

test.serial('wallet node unavailable', async t => {
  const { blockchain, connector } = t.context
  await blockchain.destroyWalletNode()
  const data = Buffer.alloc(0)
  const publishDataPromise = connector.publishData(data)
  await t.throwsAsync(
    publishDataPromise,
    { code: 'ECONNREFUSED' },
    'publish without wallet node fails'
  )
})

test.serial('chain node unavailable', async t => {
  const { blockchain, connector } = t.context
  await blockchain.mine()
  await blockchain.destroyChainNode()
  const data = Buffer.alloc(0)
  const publishDataPromise = connector.publishData(data)
  await t.throwsAsync(
    publishDataPromise,
    'Request timed out.',
    'publish without chain node fails'
  )
})

test.serial('insufficient funds', async t => {
  const { connector } = t.context
  const data = Buffer.alloc(0)
  const publishDataPromise = connector.publishData(data)
  await t.throwsAsync(
    publishDataPromise,
    /^Not enough funds\./,
    'publish without funds fails'
  )
})

test.serial('success', async t => {
  const { blockchain, connector } = t.context
  await blockchain.mine()
  const data = Buffer.from([ 0x01, 0x02, 0x03 ])
  const txid = await connector.publishData(data)
  t.true(txid instanceof Buffer)
  t.is(txid.length, 32)
  const txConfirmedPromise = txConfirmed(blockchain, txid)
  await blockchain.chainNodeClient.execute('generate', [ 1 ])
  await t.notThrowsAsync(txConfirmedPromise, 'tx published')
  const tx = await txConfirmedPromise
  const output = (function extractOutput () {
    for (const output of tx.outputs) {
      if (output.getType() === 'nulldata') return output
    }
    return null
  })()
  t.truthy(output, 'tx has data')
  const script = output.script
  const code = script.code
  t.is(code[0].value, 106, 'op_return output')
  t.deepEqual(
    code[1].data,
    Buffer.from([ 0x01, 0x02, 0x03 ]),
    'correct data published'
  )
})
