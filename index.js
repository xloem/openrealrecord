var hyperdb = require('hyperdb')
var thunky = require('thunky')
var events = require('events')
var inherits = require('inherits')
var sodium = require('sodium-universal')
var bufferAlloc = require('buffer-alloc-unsafe')
var messages = require('./lib/messages')

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
    ret[i] = feedToStreamID(this.db.feeds[i])
  }
  return ret
}

HyperStream.prototype.getStream = function (id) {
  var stream = this._streamCache[id]
  if (!stream) {
    this._streamCache[id] = new Stream(this.db, id)
    stream = this._streamCache[id]
  }
  return stream
}

HyperStream.prototype.write = function (data, cb) {
  if (!this.localStream) return cb(new Error('not ready'))
  this.localStream._write(data, cb)
}

HyperStream.prototype._ready = function (cb) {
  var self = this
  this.db.ready(function (err) {
    if (err) return cb(err)

    self.id = feedToStreamID(self.db.local)
    self.localStream = self.getStream(self.id)

    cb(null)
  })
}

function Stream (db, id) {
  this.db = db
  this.id = id
  this.path = 'streams/' + this.id
  this.feed = null
  this._dbfeed = null

  if (!this.db.opened) throw new Error('not ready')

  var feedKey = streamIDToFeedKey(id)

  // // this approach does not use private members of hyperdb but is O(n)
  // for (var i = 0; i < db.feeds; ++ i) {
  //   if (0 == Buffer.compare(feedKey, db.feeds[i].key)) {
  //     this.feed = db.contentFeeds[i]
  //     this._dbfeed = db.feeds[i]
  //   }
  // }

  // this approach uses private members of hyperdb but is just a map lookup
  var writer = db._byKey.get(feedKey.toString('hex'))
  this.feed = writer._contentFeed
  this._dbfeed = writer._feed
}

Stream.prototype._write = function (data, cb) {
  var self = this

  this.feed.append(data, function (err) {
    // nextTick is used because if an error is thrown here, the hypercore batcher will crash
    if (err) return process.nextTick(cb, err)

    self._writeCheckpoint(cb)
  })
}

Stream.prototype._writeCheckpoint = function (cb) {
  var self = this
  var checkpoint = {
    length: this.feed.length,
    byteLength: this.feed.byteLength,
    rootHash: null
  }

  // TODO: hash the db heads in too, in case hyperdb doesn't implement #41
  hashRoots(this.feed, checkpoint.length - 1, function (err, hash) {
    if (err) return process.nextTick(cb, err)

    checkpoint.rootsHash = hash

    self.db.put('streams/' + self.id + '/checkpoint', messages.Checkpoint.encode(checkpoint), cb)
  })
}

function feedToStreamID (feed) {
  return feed.key.toString('base64')
}

function streamIDToFeedKey (id) {
  return Buffer.from(id, 'base64')
}

function hashRoots (feed, index, cb) {
  feed.rootHashes(index, function (err, roots) {
    if (err) return cb(err)

    var digest = bufferAlloc(32)

    for (var i = 0; i < roots.length; i++) { roots[i] = roots[i].hash }

    sodium.crypto_generichash_batch(digest, roots)

    cb(null, digest)
  })
}
