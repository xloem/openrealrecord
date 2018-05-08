'use strict'

const bulk = require('bulk-write-stream')
const events = require('events')
const inherits = require('inherits')
const hyperdbput = require('hyperdb/lib/put')
const hyperdbmessages = require('hyperdb/lib/messages')
const messages = require('./messages')
const util = require('./util')

module.exports = Stream

const MESSAGE_STREAM_REGISTRY = {
  timestamp: require('./timestamp')
}

function Stream (db, id, cb) {
  events.EventEmitter.call(this)

  this.db = db
  this.id = id
  this.path = 'streams/' + this.id
  this.feed = null
  this.metadata = null
  this._dbfeed = null

  if (!this.db.opened) throw new Error('not ready')

  var feedKey = util.streamIDToFeedKey(id)

  var self = this
  this.getMetadata(function (err, metadata) {
    if (err) return cb(err)
    self._updateMetadata(metadata)

    // done here because the feeds may be inadvertently loaded in the request for metadata
    util.keyToFeeds(self.db, feedKey, onfeeds)
  })

  function onfeeds (err, dbfeed, contentfeed) {
    if (err) return cb(err)
    self._dbfeed = dbfeed
    self.feed = contentfeed
    cb(null, self)
  }
}

inherits(Stream, events.EventEmitter)

Stream.prototype.getMetadata = function (cb) {
  const self = this

  this.db.get(this.path + '/stream.json', onstreamjson)

  // TODO: since hyperdb doesn't have access restrictions yet, ignore updates to this file by others
  // (can catch in fsck too)
  function onstreamjson (err, nodes) {
    if (err) return cb(err)

    if (nodes.length > 1) return cb(new Error('metadata conflict'))

    if (!nodes[0]) {
      // TODO: set owner to the feed that authorized this feed, or at least provide a way to easily do this
      cb(null, {
        name: self.id,
        owner: self.id,
        media: 'application/octet-stream',
        source: 'unknown'
      })
    } else {
      cb(null, JSON.parse(nodes[0].value.toString()))
    }
  }
}

Stream.prototype.generateMetadata = function (metadata, opts) {
  if (opts['my-name']) metadata.name = opts['my-name']
  if (opts['my-origin']) metadata.origin = opts['my-origin']
  var found = null
  for (var message in MESSAGE_STREAM_REGISTRY) {
    if (opts['my-messages'] === message) {
      if (found) throw new Error(message + ' and ' + found + ' conflict')
      metadata.media = 'application/x.hyper-protobuf'
      metadata.message = message
      MESSAGE_STREAM_REGISTRY[message].generate(metadata, opts)
      found = message
    }
  }
  return metadata
}

Stream.prototype.validateMetadata = function (metadata, cb) {
  if (!metadata.name || metadata.name === this.id) {
    return cb(new Error('stream has no name'))
  }

  if ((this.metadata.media === 'application/x.hyper-protobuf' || metadata.media === 'application/x.hyper-protobuf')) {
    if (metadata.media !== this.metadata.media && this.feed.length > 0) {
      return cb(new Error('cannot change special media type'))
    }
  }
  if (metadata.media === 'application/x.hyper-protobuf') {
    if (!(metadata.message in MESSAGE_STREAM_REGISTRY)) {
      return cb(new Error('message field must be one of ' + Object.keys(MESSAGE_STREAM_REGISTRY).join(' ')))
    }
    MESSAGE_STREAM_REGISTRY[metadata.message].validate(metadata, cb)
  }

  util.keyToFeeds(this.db, util.streamIDToFeedKey(metadata.owner), function (err) {
    if (err) return cb(new Error('can\'t find owner feed: ' + err.message))

    cb(null)
  })
}

Stream.prototype.setMetadata = function (metadata, cb) {
  const self = this
  this.validateMetadata(metadata, function (err) {
    if (err) return cb(err)
    self.db.put(self.path + '/stream.json', JSON.stringify(metadata), function (err, node) {
      if (err) return cb(err)
      self._updateMetadata(JSON.parse(node.value.toString()))
      cb(null, self.metadata)
    })
  })
}

Stream.prototype.start = function (startedCB, stoppedCB) {
  var self = this
  var session = {}
  session.startTime = Date.now()
  if (this.messageStream) {
    this.messageStream.start(session, stopped).then(started, startedCB)
  } else {
    startedCB(new Error('stream messages not set'))
  }
  function started () {
    self.db.put(self.path + '/session.json', JSON.stringify(session), function (err, node) {
      if (err) return startedCB(err)
      startedCB()
    })
  }
  function stopped (err) {
    session.stopTime = Date.now()
    if (err) return stoppedCB(err)
    self.messageStream.stop(session).then(function (err) {
      if (err) return stoppedCB(err)
      self.db.put(self.path + '/session.json', JSON.stringify(session), function (err, node) {
        if (err) return stoppedCB(err)
        stoppedCB()
      })
    })
  }
}

Stream.prototype.requestStop = function () {
  if (this.messageStream) {
    this.messageStream.requestStop()
  }
}

Stream.prototype.listen = function () {
  if (this._checkpointwatcher) throw new Error('already listening')

  var self = this

  var seqs = null

  self.db.get(self.path + '/checkpoint.protobuf', initialize)
  self._checkpointwatcher = this.db.watch(this.path + '/checkpoint.protobuf', onwatchcheckpoint)

  function initialize (err, checkpoints) {
    seqs = []

    if (err) return emit(err)

    for (var i = 0; i < checkpoints.length; ++i) {
      var cp = checkpoints[i]
      seqs[cp.feed] = cp.seq
    }
  }

  function onwatchcheckpoint () {
    self.db.get(self.path + '/checkpoint.protobuf', oncheckpoint)
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

Stream.prototype._updateMetadata = function (metadata) {
  this.metadata = metadata
  if (metadata.media === 'application/x.hyper-protobuf' && !this.messageStream) {
    this.messageStream = new MESSAGE_STREAM_REGISTRY[metadata.message](this)
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
      if (val.key !== self.path + '/checkpoint.protobuf') return next.call(it, cb)
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

Stream.prototype.findValidCheckpoint = function (opts, cb, invalidcb) {
  var self = this
  var checkpoints = this.checkpoints(opts)

  checkpoints.next(seekValid)

  function seekValid (err, checkpoint) {
    if (err) {
      if (invalidcb) invalidcb(err)
      return checkpoints.next(seekValid)
    }

    if (checkpoint === null) return cb()

    self.verify(checkpoint, function (err) {
      if (err) {
        if (invalidcb) invalidcb(err, checkpoint)
        return checkpoints.next(seekValid)
      } else {
        return cb(null, checkpoint)
      }
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
        rootsHash: null,
        timestamp: Date.now(),
        length: self.feed.length,
        byteLength: self.feed.byteLength
      }

      util.hashRoots([self.feed].concat(self.db.feeds), [checkpoint.length].concat(clock), function (err, contentHash) {
        if (err) return process.nextTick(cb, err)

        checkpoint.rootsHash = contentHash

        hyperdbput(self.db, clock, heads, self.path + '/checkpoint.protobuf', messages.Checkpoint.encode(checkpoint), unlock)
      })
    })

    function unlock (err, node) {
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

  // TODO: submit an issue / PR to hyperdb to include original raw clocks in node results which are needed for
  //       for comparing root hashes correctly
  // this hack converts the returned clock to the original clock
  const writer = this.db._byKey.get(this._dbfeed.key.toString('hex'))
  node.clock = writer._mapList(node.clock, writer._encodeMap, null)

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
