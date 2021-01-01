const bcoin = require('bcoin')
const { NodeClient, WalletClient } = require('bclient')

const regtest = bcoin.Network.get('regtest')

const privs = new WeakMap()

/**
 * `bcoin` based bitcoin blockchain fixture.
 *
 * Sets up an in memory `regtest` chain.
 *
 * Creates these components:
 *
 * - A single chain node.
 * - A chain client connected to the chain node.
 * - A wallet node connected to the chain node.
 * - A wallet client connected to the wallet node.
 *
 * Sets up with this configuration:
 *
 * - Wallet node has 1 wallet created.
 * - Wallet has 1 account created.
 * - Account has 1 receiving address created.
 */
class BcoinBitcoinBlockchainFixture {
  constructor () {
    const priv = {
      chainNode: null,
      chainNodeRpcPort: null,
      chainNodeClient: null,
      walletNode: null,
      walletNodeRpcPort: null,
      walletNodeClient: null,
      walletToken: null,
      walletClient: null,
      address: null
    }
    privs.set(this, priv)
  }

  /**
   * Setup fixture.
   */
  async setup () {
    const priv = privs.get(this)
    const {
      node: chainNode,
      rpcPort: chainNodeRpcPort
    } = await privm.createChainNode.call(this)
    priv.chainNodeRpcPort = chainNodeRpcPort
    const {
      client: chainNodeClient
    } = await privm.createChainNodeClient.call(this)
    const {
      node: walletNode,
      rpcPort: walletNodeRpcPort
    } = await privm.createWalletNode.call(this)
    priv.walletNodeRpcPort = walletNodeRpcPort
    const {
      client: walletNodeClient
    } = await privm.createWalletNodeClient.call(this)
    const walletDetails = await walletNodeClient.createWallet(
      this.walletId,
      { passphrase: this.passphrase }
    )
    const walletClient = walletNodeClient.wallet(this.walletId)
    await walletClient.open()
    await walletClient.createAccount(
      this.walletAccount,
      { name: this.walletAccount, passphrase: this.passphrase }
    )
    const { address } = await walletClient.createAddress(
      this.walletAccount
    )
    Object.assign(priv, {
      chainNode,
      chainNodeClient,
      walletNode,
      walletNodeClient,
      walletToken: walletDetails.token,
      walletClient,
      address
    })
  }

  /**
   * Mine coins into generated address.
   *
   * Mines the specified number of blocks.
   * Waits for propagation to wallet.
   *
   * @param {number} [blocksCount=101] - Number of blocks to mine.
   */
  async mine (blocksCount = 101) {
    const priv = privs.get(this)
    const { address, chainNode, chainNodeClient, walletNodeClient } = priv

    // Watch for completion
    const completePromise = new Promise(
      function watchMineCompletion (resolve, reject) {
        function handleTimedOut () {
          walletNodeClient.socket.unbind('balance', handleBlock)
          reject(new Error('timed out'))
        }
        function handleBlock () {
          blocksMined++
          if (blocksMined === blocksCount) handleComplete()
        }
        function handleComplete () {
          clearTimeout(timer)
          walletNodeClient.socket.unbind('balance', handleBlock)
          resolve()
        }
        let blocksMined = 0
        const timer = setTimeout(handleTimedOut, 5000) // 5 seconds
        walletNodeClient.bind('balance', handleBlock)
      }
    )

    // Mine
    chainNode.miner.addresses.push(address)
    await chainNodeClient.execute('generate', [ blocksCount ])
    await completePromise
  }

  /**
   * Teardown fixture.
   */
  async teardown () {
    const priv = privs.get(this)
    priv.chainClient = null
    await this.destroyChainNode()
    priv.chainNode = null
    priv.chainNodeRpcPort = null
    priv.walletClient = null
    await this.destroyWalletNode()
    priv.walletNode = null
    priv.walletToken = null
  }

  /**
   * Destroy chain node.
   *
   * No effect if fixture is inactive.
   * No effect if chain node is inactive.
   */
  async destroyChainNode () {
    const priv = privs.get(this)
    const chainNode = priv.chainNode
    if (!chainNode) return
    if (chainNode.pool.connected) await chainNode.disconnect()
    if (chainNode.opened) await chainNode.close()
  }

  /**
   * Destroy wallet node.
   *
   * No effect if fixture is inactive.
   * No effect if wallet node is inactive.
   */
  async destroyWalletNode () {
    const priv = privs.get(this)
    const walletNode = priv.walletNode
    if (!walletNode) return
    if (walletNode.opened) await walletNode.close()
  }

  /**
   * API key for chain node.
   *
   * @constant {string}
   * @default 'ChainNodeApiKey'
   */
  get chainNodeApiKey () { return 'ChainNodeApiKey' }

  /**
   * API key for wallet node.
   *
   * @constant {string}
   * @default 'WalletNodeApiKey'
   */
  get walletNodeApiKey () { return 'WalletNodeApiKey' }

  /**
   * Identifier of created wallet.
   *
   * @constant {string}
   * @default 'WalletId'
   */
  get walletId () { return 'WalletId' }

  /**
   * Passphrase of created wallet.
   *
   * @constant {string}
   * @default 'passphrase'
   */
  get walletPassphrase () { return 'passphrase' }

  /**
   * Name of created account.
   *
   * @constant {string}
   * @default 'AccountName'
   */
  get walletAccount () { return 'AccountName' }

  /**
   * Token of created wallet.
   *
   * `null` if fixture is inactive.
   *
   * @var {string}
   * @readonly
   */
  get walletToken () {
    const priv = privs.get(this)
    return priv.walletToken
  }

  /**
   * Generated receiving address.
   *
   * `null` if fixture is inactive.
   *
   * @var {string}
   * @readonly
   */
  get address () {
    const priv = privs.get(this)
    return priv.address
  }

  /**
   * Chain node.
   *
   * `null` if fixutre is inactive.
   *
   * @var {?bcoin.FullNode}
   * @readonly
   */
  get chainNode () {
    const priv = privs.get(this)
    return priv.chainNode
  }

  /**
   * Chain node client.
   *
   * `null` if fixture is inactive.
   *
   * @var {?bclient.NodeClient}
   * @readonly
   */
  get chainNodeClient () {
    const priv = privs.get(this)
    return priv.chainNodeClient
  }

  /**
   * Chain node RPC server port.
   *
   * `null` if fixture is inactive.
   *
   * @var {?number}
   * @readonly
   */
  get chainNodeRpcPort () {
    const priv = privs.get(this)
    return priv.chainNodeRpcPort
  }

  /**
   * Wallet node.
   *
   * `null` if fixture is inactive.
   *
   * @var {?bcoin.wallet.Node}
   * @readonly
   */
  get walletNode () {
    const priv = privs.get(this)
    return priv.walletNode
  }

  /**
   * Wallet node client.
   *
   * `null` if fixture is inactive.
   *
   * @var {?bclient.WalletClient}
   * @readonly
   */
  get walletNodeClient () {
    const priv = privs.get(this)
    return priv.walletNodeClient
  }

  /**
   * Wallet node RPC server port.
   *
   * `null` if fixture is inactive.
   *
   * @var {?number}
   * @readonly
   */
  get walletNodeRpcPort () {
    const priv = privs.get(this)
    return priv.walletNodeRpcPort
  }

  /**
   * Wallet client for created wallet.
   *
   * `null` if fixture is inactive.
   *
   * @var {?bclient.Wallet}
   * @readonly
   */
  get walletClient () {
    const priv = privs.get(this)
    return priv.walletClient
  }
}

// Private methods
const privm = {
  /**
   * Create chain node.
   *
   * @return {CreateChainNodeReturn}
   */
  async createChainNode () {
    const node = new bcoin.FullNode({
      network: regtest.type,
      listen: false,
      httpPort: 0, // Arbitrary unused port
      memory: true,
      workers: true,
      logFile: false,
      logConsole: false,
      logLevel: 'debug',
      apiKey: this.chainNodeApiKey,

      // Ignore external configuration
      argv: false,
      env: false,
      query: false,
      hash: false
    })
    await node.open()
    const httpServer = node.http.http
    const { port: rpcPort } = httpServer.address()
    return { node, rpcPort }
  },

  /**
   * Create chain node client.
   *
   * Connects to chain node.
   *
   * @return {CreateChainNodeClientReturn}
   */
  async createChainNodeClient () {
    const client = new NodeClient({
      network: regtest.type,
      port: this.chainNodeRpcPort,
      apiKey: this.chainNodeApiKey
    })
    await client.open()
    return { client }
  },

  /**
   * Create wallet node.
   *
   * Connects to chain node.
   *
   * @return {CreateWalletNodeReturn}
   */
  async createWalletNode () {
    const node = new bcoin.wallet.Node({
      network: regtest.type,
      listen: false,
      nodePort: this.chainNodeRpcPort,
      httpPort: 0, // Arbitrary unused port
      memory: true,
      workers: false,
      logFile: false,
      logConsole: false,
      logLevel: 'debug',
      nodeApiKey: this.chainNodeApiKey,
      apiKey: this.walletNodeApiKey,

      // Ignore external configuration
      argv: false,
      env: false,
      query: false,
      hash: false
    })
    await node.open()
    const httpServer = node.http.http
    const { port: rpcPort } = httpServer.address()
    return { node, rpcPort }
  },

  /**
   * Create wallet node client.
   *
   * Connects to wallet node.
   *
   * @return {CreateWalletNodeClientReturn}
   */
  async createWalletNodeClient () {
    const client = new WalletClient({
      network: regtest.type,
      port: this.walletNodeRpcPort,
      apiKey: this.walletNodeApiKey
    })
    await client.open()
    return { client }
  }
}

/**
 * @typedef {object} CreateChainNodeReturn
 *
 * @prop {bcoin.FullNode} node - Chain node.
 * @prop {number} rpcPort - RPC server port.
 */

/**
 * @typedef {object} CreateChainNodeClientReturn
 *
 * @prop {bclient.NodeClient} client - Chain node client.
 */

/**
 * @typedef {object} CreateWalletNodeReturn
 *
 * @prop {bcoin.wallet.Node} node - Wallet node.
 * @prop {number} rpcPort - RPC server port.
 */

/**
 * @typedef {object} CreateWalletNodeClientReturn
 *
 * @prop {bclient.WalletClient} client - Wallet node client.
 */

module.exports = BcoinBitcoinBlockchainFixture
