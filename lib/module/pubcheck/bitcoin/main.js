const { LastNodeEventPromiseQueue } = require('../../../queue/promise')
const { StopSignal } = require('../../../signal')
const messages = require('../../../messages')
const PublishCheckpointModule = require('../base')
const Aid = require('./aid')

const privs = new WeakMap()

/**
 * Publish checkpoints to the [bitcoin][1] chain.
 *
 * [1]: https://bitcoin.org/
 */
class BitcoinPublishCheckpointModule extends PublishCheckpointModule {
  /**
   * @param {Stream} stream - Stream to publish checkpoints of.
   *     References to checkpoint publications are written to an ancillary
   *     feed of the same stream.
   * @param {BitcoinConnector} bitcoin - Interface to the bitcoin network.
   * @param {number} [confirmTimeout=900000] - Maximum time to wait for
   *     confirmation in milliseconds. Default 15 minutes.
   */
  constructor (stream, bitcoin, confirmTimeout = 900000) {
    super(stream, executor)
    const self = this
    function executor (...args) { return privm.executor.call(self, ...args) }
    const priv = {
      stream,
      bitcoin,
      timeout: {
        confirm: confirmTimeout
      }
    }
    privs.set(this, priv)
    if (new.target === BitcoinPublishCheckpointModule) Object.freeze(this)
  }

  get done () {
    const error = new Error('awaited done for indefinite module')
    return Promise.reject(error)
  }
}

// Private methods
const privm = {
  /**
   * Module executor.
   *
   * Watches for checkpoints from stream.
   * Publishes each checkpoint to the bitcoin chain.
   * Writes reference to each publication to stream ancillary feed.
   */
  async executor (controller) {
    const priv = privs.get(this)
    const { bitcoin, stream } = priv
    const { confirm: confirmTimeout } = priv.timeout
    const queue = new LastNodeEventPromiseQueue(stream, 'checkpoint')
    try {
      await privm.iterateCheckpoints.call(
        this,
        controller,
        bitcoin,
        stream,
        queue,
        confirmTimeout
      )
    } finally { queue.stop() }
  },

  /**
   * Iterate checkpoints.
   *
   * Publishes each observed checkpoint.
   *
   * @param {ModuleController} controller - Run controller.
   * @param {IBitcoinConnector} bitcoin - Bitcoin connector.
   * @param {Stream} stream - Stream to publish checkpoints of.
   * @param {NodeEventPromiseQueue} queue - Checkpoint event queue.
   * @param {number} confirmTimeout - Maximum time to wait for confirmation
   *     in milliseconds.
   */
  async iterateCheckpoints (
    controller,
    bitcoin,
    stream,
    queue,
    confirmTimeout
  ) {
    while (!controller.stop) {
      const received = await Promise.race([
        queue.next,
        controller.promise.stop
      ])
      if (received instanceof StopSignal) return
      const checkpoint = received[0]
      await privm.publishCheckpoint.call(
        this,
        bitcoin,
        stream,
        checkpoint,
        confirmTimeout
      )
    }
  },

  /**
   * Publish checkpoint.
   *
   * Publishes checkpoint to the bitcoin chain.
   * Writes reference to publication to stream ancillary feed.
   *
   * @param {IBitcoinConnector} bitcoin - Bitcoin connector.
   * @param {Stream} stream - Stream to write reference to.
   * @param {object} checkpoint - Checkpoint to publish.
   * @param {number} confirmTimeout - Maximum time to wait for confirmation
   *     in milliseconds.
   */
  async publishCheckpoint (bitcoin, stream, checkpoint, confirmTimeout) {
    const message = Aid.packageCheckpoint(checkpoint)
    const txid = await bitcoin.publishData(message)
    await bitcoin.txConfirmed(txid, 1, confirmTimeout)
    const reference = Aid.packageReference(checkpoint, txid)
    const referenceEncoded =
      messages.BitcoinCheckpointPublication.encode(reference)
    await new Promise(function executeWriteCheckPub (resolve, reject) {
      stream.writeCheckPub(
        'bitcoin',
        referenceEncoded,
        handleWriteCheckPubDone
      )
      function handleWriteCheckPubDone (error) {
        if (error) reject(error)
        else resolve()
      }
    })
  }
}

Object.freeze(BitcoinPublishCheckpointModule)
Object.freeze(BitcoinPublishCheckpointModule.prototype)

module.exports = BitcoinPublishCheckpointModule
