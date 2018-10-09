const BitcoinFeeProvider = require('./base')
const StaticBitcoinFeeProvider = require('./static')

Object.assign(module.exports, {
  BitcoinFeeProvider,
  StaticBitcoinFeeProvider
})
