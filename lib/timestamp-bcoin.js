'use strict'

const bclient = require('bclient')
const events = require('events')

var opts = {
  port: 8332
}

exports.Tip = class extends events.EventEmitter {
  static generate (metadata, opts) {
    collectClientOptions(opts)
  }

  static validate (metadata, cb) { }

  constructor (stream) {
    super()
    this.stream = stream
    this.tip = Buffer.from('')

    this.client = new bclient.NodeClient(opts)
    this.client.bind('block connect', this.onBlock.bind(this))

    const self = this

    this.stream.feed.head({valueEncoding: 'binary'}, function (err, data) {
      if (err) self.emit('error', err)
      if (data && !self.tip.length) {
        self.tip = data
      }
      self.emit('ready')
    })
  }

  async start (session, stoppedCB) {
    this.stoppedCB = stoppedCB
    await this.client.open()
    await setSession(session, this.client, this.stream)
  }

  async requestStop (session) {
    await this.client.close()
    this.stoppedCB()
  }

  static async onBlock () {
    const self = this
    const info = await this.client.getInfo()
    const tip = Buffer.from(info.chain.tip, 'hex')
    if (Buffer.compare(this.tip, tip)) {
      this.tip = tip
      this.stream.write(tip, function (err) {
        if (err) {
          return self.emit('error', err)
        } else {
          self.emit('timestamp', tip)
        }
      })
    }
  }
}

async function setSession (session, client, stream) {
  var info = await client.getInfo()
  session.bcoin = {
    version: info.version,
    network: info.network
  }
}

function collectClientOptions (o) {
  if (o['bcoin-port']) opts.port = o['bcoin-port']
  if (o['bcoin-host']) opts.host = o['bcoin-host']
}
