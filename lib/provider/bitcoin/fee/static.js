/** @module openrealrecord/provider/bitcoin/fee/static */

const BitcoinFeeProvider = require('./base')

const privs = new WeakMap()

/**
 * Static fee rate.
 */
class StaticBitcoinFeeProvider extends BitcoinFeeProvider {
  /**
   * @param {number} rate - Fee rate in satoshis per kibibyte.
   */
  constructor (rate) {
    super()
    const priv = {
      rate
    }
    privs.set(this, priv)
    if (new.target === StaticBitcoinFeeProvider) Object.freeze(this)
  }

  get rate () {
    const priv = privs.get(this)
    return Promise.resolve(priv.rate)
  }
}

Object.freeze(StaticBitcoinFeeProvider)
Object.freeze(StaticBitcoinFeeProvider.prototype)

module.exports = StaticBitcoinFeeProvider
