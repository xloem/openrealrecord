'use strict'

var hyperdb = require('hyperdb')
var thunky = require('thunky')
var events = require('events')
var inherits = require('inherits')
var Stream = require('./stream')
var util = require('./util')

module.exports = HyperStream

function HyperStream (storage, key, opts) {
  if (!(this instanceof HyperStream)) return new HyperStream(storage, key, opts)
  events.EventEmitter.call(this)

  if (typeof key === 'object' && !!key && !Buffer.isBuffer(key)) {
    opts = key
    key = null
  }

  if (!opts) opts = {}
  if (!opts.contentFeed) opts.contentFeed = true

  this.db = hyperdb(storage, key, opts)
  this.localStream = null
  this.ready = thunky(this._ready.bind(this))

  this._streamCache = {}

  this.ready()
}

inherits(HyperStream, events.EventEmitter)

HyperStream.prototype.getStreams = function () {
  var ret = []
  for (var i = 0; i < this.db.feeds.length; ++i) {
    ret[i] = util.feedToStreamID(this.db.feeds[i])
  }
  return ret
}

HyperStream.prototype.getStream = function (id, cb) {
  var stream = this._streamCache[id]
  if (!stream) {
    this._streamCache[id] = new Stream(this.db, id, cb)
    stream = this._streamCache[id]
  } else if (cb) {
    process.nextTick(cb, null, stream)
  }
  return stream
}

HyperStream.prototype.write = function (data, cb) {
  if (!this.localStream) return cb(new Error('not ready'))
  this.localStream.write(data, cb)
}

HyperStream.prototype.createWriteStream = function () {
  if (!this.localStream) throw new Error('not ready')
  return this.localStream.createWriteStream()
}

HyperStream.prototype._ready = function (cb) {
  var self = this
  this.db.ready(function (err) {
    if (err) return cb(err)

    self.id = util.feedToStreamID(self.db.local)
    self.localStream = self.getStream(self.id, cb)
  })
}
