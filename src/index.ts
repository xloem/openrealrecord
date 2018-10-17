'use strict'

import * as hyperdb from 'hyperdb'
import * as thunky from 'thunky'
const events = require('events')
const inherits = require('inherits')
const Stream = require('./stream')
import {feedToStreamID} from './util'

export const HyperStream = (storage, key, opts): void => {
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

HyperStream.prototype.getStreams = () => {
  return this.db.feeds.map(feed => feedToStreamID(feed))
}

HyperStream.prototype.getStream = (id, cb) => {
  let stream = this._streamCache[id]
  if (!stream) {
    stream = new Stream(this.db, id, cb)
    this._streamCache[id] = stream 
  } else if (cb) {
    process.nextTick(cb, null, stream)
  }
  return stream
}

HyperStream.prototype.write = (data, cb) => {
  if (!this.localStream) return cb(new Error('not ready'))
  this.localStream.write(data, cb)
}

HyperStream.prototype.createWriteStream = () => {
  if (!this.localStream) throw new Error('not ready')
  return this.localStream.createWriteStream()
}

HyperStream.prototype._ready = cb => {
  this.db.ready(err => {
    if (err) return cb(err)

    this.id = feedToStreamID(this.db.local)
    this.localStream = this.getStream(this.id, cb)
  })
}
