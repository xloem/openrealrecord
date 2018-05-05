var hyperdb = require('hyperdb')
var hyperdbput = require('hyperdb/lib/put')
var hyperdbmessages = require('hyperdb/lib/messages')
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

  var feeds = keyToFeeds(this.db, feedKey)
  this._dbfeed = feeds[0]
  this.feed = feeds[1]
}

inherits(Stream, events.EventEmitter)

Stream.prototype.listen = function () {
  if (this._checkpointwatcher) throw new Error('already listening')

  var self = this

  var seqs = null

  self.db.get(self.path + '/checkpoint', initialize)
  self._checkpointwatcher = this.db.watch(this.path + '/checkpoint', onwatchcheckpoint)

  function initialize (err, checkpoints) {
    seqs = []

    if (err) return emit(err)

    for (var i = 0; i < checkpoints.length; ++i) {
      var cp = checkpoints[i]
      seqs[cp.feed] = cp.seq
    }
  }

  function onwatchcheckpoint () {
    self.db.get(self.path + '/checkpoint', oncheckpoint)
  }

  function oncheckpoint (err, checkpoints) {
    if (err) return emit(err)
    if (checkpoints === []) emit(null, null)

    for (var i = 0; i < checkpoints.length; ++i) {
      var cp = checkpoints[i]
      var feed = cp.feed
      var last = seqs[feed]
      var cur = cp.seq
      if (!last || last !== cur) {
        seqs[feed] = cur
        self._decodeCheckpoint(cp, emit)
      }
    }
  }

  function emit (err, checkpoint) {
    if (err) return self.emit('error', err)
    self.emit('checkpoint', checkpoint)
  }
}

Stream.prototype.ignore = function () {
  this._checkpointwatcher.destroy()
  this._checkpointwatcher = null
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
  if (Buffer.compare(checkpoint._feeds[0], this.feed.key)) return cb(new Error('incorrect feed'))
  var feeds = [this.feed]
  for (var i = 1; i < checkpoint._feeds.length; ++i) {
    feeds[i] = keyToFeeds(this.db, checkpoint._feeds[i])[0]
  }
  hashRoots(feeds, checkpoint._lengths, function (err, hash, byteLengths) {
    if (err) return cb(err)
    if (byteLengths[0] !== checkpoint.byteLength) return cb(new Error('incorrect byteLength'))
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

  // wrapping code taken from HyperDB.prototype.put to ensure our sequence numbers are the same as in the put
  // this is needed because put only lets us know what vector clock it used after it has already submitted the data
  // TODO: submit an issue/pr to hyperdb mentioning this use case and brainstorm a solution to propose
  this.db._lock(function (release) {
    var clock = self.db._clock()
    self.db.heads(function (err, heads) {
      if (err) return unlock(err)

      var checkpoint = {
        length: self.feed.length,
        byteLength: self.feed.byteLength,
        rootsHash: null
      }

      hashRoots([self.feed].concat(self.db.feeds), [checkpoint.length].concat(clock), function (err, contentHash) {
        if (err) return process.nextTick(cb, err)

        checkpoint.rootsHash = contentHash

        hyperdbput(self.db, clock, heads, self.path + '/checkpoint', messages.Checkpoint.encode(checkpoint), unlock)
      })
    })

    function unlock (err) {
      release(cb, err)
    }
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
  checkpoint._lengths = [checkpoint.length].concat(node.clock)
  --checkpoint._lengths[node.feed + 1]
  // TODO: submit an issue / PR to hyperdb to allow for retrieving feeds at an arbitrary point in history
  //       which is needed to interpret historic vector clocks.
  //       For now we use InflatedEntry to decode them by hand.
  this.db.feeds[node.feed].get(node.inflate, function (err, inflatebuf) {
    if (err) return cb(err)

    var inflate = hyperdbmessages.InflatedEntry.decode(inflatebuf)
    checkpoint._feeds = [inflate.contentFeed]
    for (var i = 0; i < inflate.feeds.length; ++i) {
      checkpoint._feeds[i + 1] = inflate.feeds[i].key
    }

    cb(null, checkpoint)
  })
}

function keyToFeeds (db, key) {
  // TODO: submit an issue / PR to hyperdb to allow for public access feeds by key

  // // this approach does not use private members of hyperdb but is O(n)
  // for (var i = 0; i < db.feeds; ++ i) {
  //   if (0 == Buffer.compare(key, db.feeds[i].key)) {
  //     return [db.feeds[i], db.contentFeeds[i]]
  //   }
  // }

  // this approach uses private members of hyperdb but is just a map lookup
  var writer = db._byKey.get(key.toString('hex'))
  return [writer._feed, writer._contentFeed]
}

function feedToStreamID (feed) {
  return feed.key.toString('base64')
}

function streamIDToFeedKey (id) {
  return Buffer.from(id, 'base64')
}

function hashRoots (feeds, lengths, cb) {
  var digest = bufferAlloc(32)
  var hasher = sodium.crypto_generichash_instance(digest.length)

  var totals = []
  var index = 0

  thisFeed()

  function thisFeed () {
    if (!lengths[index]) return nextFeed(null, [])
    feeds[index].rootHashes(lengths[index] - 1, nextFeed)
  }

  function nextFeed (err, roots) {
    if (err) return cb(err)

    var totalbytes = 0

    for (var i = 0; i < roots.length; i++) {
      totalbytes += roots[i].size
      hasher.update(roots[i].hash)
    }

    totals[index] = totalbytes

    ++index
    if (index < feeds.length) {
      thisFeed()
    } else {
      hasher.final(digest)
      cb(null, digest, totals)
    }
  }
}
