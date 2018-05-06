'use strict'

const bulk = require('bulk-write-stream')
const events = require('events')
const inherits = require('inherits')
const hyperdbput = require('hyperdb/lib/put')
const hyperdbmessages = require('hyperdb/lib/messages')
const messages = require('./messages')
const util = require('./util')

module.exports = Stream

function Stream (db, id, cb) {
  events.EventEmitter.call(this)

  this.db = db
  this.id = id
  this.path = 'streams/' + this.id
  this.feed = null
  this._dbfeed = null

  if (!this.db.opened) throw new Error('not ready')

  var feedKey = util.streamIDToFeedKey(id)

  var self = this
  util.keyToFeeds(this.db, feedKey, function (err, dbfeed, contentfeed) {
    if (err) return cb(err)
    self._dbfeed = dbfeed
    self.feed = contentfeed
    cb(null, self)
  })
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

Stream.prototype.listening = function () {
  return !!this._checkpointwatcher
}

Stream.prototype.ignore = function () {
  if (!this._checkpointwatcher) throw new Error('not listening')
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
  var self = this
  var feeds = [this.feed]
  var feedsGotten = 0

  // seek to spot to make sure root hashes are loaded
  this.feed.seek(checkpoint.byteLength - 1, { hash: true }, seeked)

  for (var i = 1; i < checkpoint._feeds.length; ++i) {
    addFeed(i)
  }

  function seeked (err) {
    if (err) return cb(err)
    ++feedsGotten
    if (feedsGotten === checkpoint._feeds.length) doHash()
  }

  function addFeed (index) {
    util.keyToFeeds(self.db, checkpoint._feeds[i], function (err, feed) {
      if (err) return cb(err)
      feeds[index] = feed
      ++feedsGotten
      if (feedsGotten === checkpoint._feeds.length) doHash()
    })
  }

  function doHash () {
    util.hashRoots(feeds, checkpoint._lengths, function (err, hash, byteLengths) {
      if (err) return cb(err)
      if (byteLengths[0] !== checkpoint.byteLength) return cb(new Error('incorrect byteLength'))
      if (Buffer.compare(checkpoint.rootsHash, hash)) return cb(new Error('hash failure'))
      cb(null, true)
    })
  }
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
      blocks[index - startIndex] = data
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
    self.db.heads(function (err, heads) {
      if (err) return unlock(err)

      var clock = self.db._clock()

      // taken from Writer.prototype.append which is called after the put node is constructed and adjusts local clock
      var hdbid = self.db._byKey.get(self._dbfeed.key.toString('hex'))._id
      if (!clock[hdbid]) clock[hdbid] = self._dbfeed.length

      var checkpoint = {
        length: self.feed.length,
        byteLength: self.feed.byteLength,
        rootsHash: null
      }

      util.hashRoots([self.feed].concat(self.db.feeds), [checkpoint.length].concat(clock), function (err, contentHash) {
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
  checkpoint.author = util.feedToStreamID(this.db.feeds[node.feed])
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
