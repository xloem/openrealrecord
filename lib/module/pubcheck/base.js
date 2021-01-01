const Module = require('../base')

/**
 * Publish stream checkpoints.
 *
 * Publishes checkpoints.
 * Writes reference to published item to stream ancillary feed.
 *
 * Provides timestamping of stream content.
 *
 * @abstract
 */
class PublishCheckpointModule extends Module {
  constructor (...args) {
    super(...args)
    if (new.target === PublishCheckpointModule) {
      throw new Error('constructed abstract class')
    }
  }
}

Object.freeze(PublishCheckpointModule)
Object.freeze(PublishCheckpointModule.prototype)

module.exports = PublishCheckpointModule
