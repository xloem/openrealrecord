var hyperdb = require('hyperdb')
var thunky = require('thunky')
var events = require('events')
var inherits = require('inherits')
var sodium = require('sodium-universal')
// var from = require('from2') // for checkpoint read stream
var bulk = require('bulk-write-stream')
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
  this.localStream.write(data, cb)
}

HyperStream.prototype.createWriteStream = function () {
  if (!this.localStream) throw new Error('not ready')
  return this.localStream.createCheckpointedWriteStream()
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

function Stream (db, id, cb) {
  events.EventEmitter.call(this)

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

inherits(Stream, events.EventEmitter)

Stream.prototype.listen = function () {
  var self = this

  self._checkpointwatcher = this.db.watch(this.path + '/checkpoint', onwatchcheckpoint)

  function onwatchcheckpoint () {
    this.db.get(this.path + '/checkpoint', oncheckpoint)
  }

  function oncheckpoint (err, checkpointMessage) {
    if (err) return emit(err)

    self._decodeCheckpoint(checkpointMessage, emit)
  }

  function emit (err, checkpoint) {
    if (err) return self.emit('error', err)
    self.emit('checkpoint', checkpoint)
  }
}

Stream.prototype.ignore = function () {
  this._checkpointwatcher.destroy()
}

Stream.prototype.checkpoints = function (opts) {
  var self = this
  var it = this.db.history(opts)
  var _next = it._next
  it._next = next
  function next (cb) {
    _next.call(it, function (err, val) {
      if (err) return cb(err)
      if (!val) return cb(null, null)
      if (val.key !== self.path + '/checkpoint') return next.call(it, cb)
      self._decodeCheckpoint(val, cb)
    })
  }
  return it
}

Stream.prototype.verify = function (checkpoint, cb) {
  if (checkpoint.author !== this.id) return cb(new Error('incorrect author'))
  hashRoots(this.feed, checkpoint.length - 1, function (err, hash, byteLength) {
    if (err) return cb(err)
    if (byteLength !== checkpoint.byteLength) return cb(new Error('incorrect byteLength'))
    if (Buffer.compare(checkpoint.rootsHash, hash)) return cb(new Error('hash failure'))
    cb(null, true)
  })
}

Stream.prototype.createWriteStream = function () {
  var self = this
  return bulk.obj(write)

  function write (batch, cb) {
    self.feed.append(batch, function (err) {
      // nextTick is used because if an error is thrown here, the hypercore batcher will crash
      if (err) return process.nextTick(cb, err)
      self._writeCheckpoint(cb)
    })
  }
}

Stream.prototype.write = function (data, cb) {
  var self = this

  this.feed.append(data, function (err) {
    // nextTick is used because if an error is thrown here, the hypercore batcher will crash
    if (err) return process.nextTick(cb, err)

    self._writeCheckpoint(cb)
  })
}

Stream.prototype.read = function (start, length, opts, cb) {
  // TODO: find a checkpoint that covers this data and verify it

  var self = this

  if (!start) start = 0
  if (!length) length = this.feed.byteLength - start
  if (!opts) opts = {}
  opts.valueEncoding = 'binary'

  var startIndex = null
  var startOffset = null
  var tailIndex = null
  var blocks = []
  var totalBlocks = null
  var completedBlocks = 0

  this.feed.seek(start, {}, seekStart)
  this.feed.seek(start + length - 1, {}, seekTail)

  function seekStart (err, index, offset) {
    if (err) return cb(err)
    startIndex = index
    startOffset = offset
    if (tailIndex != null) seekDone()
  }

  function seekTail (err, index, offset) {
    if (err) return cb(err)
    tailIndex = index
    if (startIndex != null) seekDone()
  }

  function seekDone () {
    totalBlocks = 1 + tailIndex - startIndex
    for (var i = startIndex; i <= tailIndex; ++i) {
      getOne(i)
    }
  }

  function getOne (index) {
    self.feed.get(index, opts, function (err, data) {
      if (err) return cb(err)
      blocks[index] = data
      ++completedBlocks
      if (totalBlocks === completedBlocks) finish()
    })
  }

  function finish () {
    blocks[0] = blocks[0].slice(startOffset)
    cb(null, Buffer.concat(blocks, length))
  }
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

    self.db.put(self.path + '/checkpoint', messages.Checkpoint.encode(checkpoint), cb)
  })
}

Stream.prototype._decodeCheckpoint = function (node, cb) {
  var checkpoint
  try {
    checkpoint = messages.Checkpoint.decode(node.value)
  } catch (e) {
    return cb(e)
  }
  checkpoint.author = feedToStreamID(this.db.feeds[node.feed])
  cb(null, checkpoint)
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

    var totalbytes = 0
    var digest = bufferAlloc(32)

    for (var i = 0; i < roots.length; i++) {
      totalbytes += roots[i].size
      roots[i] = roots[i].hash
    }

    sodium.crypto_generichash_batch(digest, roots)

    cb(null, digest, totalbytes)
  })
}
