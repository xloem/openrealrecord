var hyperdb = require('hyperdb')
var thunky = require('thunky')
var path = require('path')
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

  this.db = new hyperdb(storage, key, opts)
  this.ready = thunky(this._ready.bind(this))
  
  this.ready()
}

inherits(HyperStream, events.EventEmitter)

HyperStream.prototype._ready = function (cb) {
  var self = this
  this.db.ready(function (err) {
    if (err) return cb(err);

    self.id = self.db.local.discoveryKey.toString('base64')
    self._feed = self.db.localContent

    cb(null)
  })
}

HyperStream.prototype.write = function(data, cb) {
  var self = this;
  var checkpoint;

  this._feed.append(data, function(err) {
    // if an error is thrown, the batcher will crash and never write again
    try {
      if (err) return cb(err)

      self._writeCheckpoint(cb)
    } catch(e) {
      self.emit("error", e)
    }
  })
}

HyperStream.prototype._writeCheckpoint = function(cb) {
  var self = this;
  var checkpoint = {
    length: this._feed.length,
    byteLength: this._feed.byteLength,
    rootHash: null
  }
    
  hashRoots(this._feed, checkpoint.length - 1, function(err, hash) {
    if (err) return cb(err)

    checkpoint.rootsHash = hash

    self.db.put(self.id + "/checkpoint", messages.Checkpoint.encode(checkpoint), done)
  })

  function done(err) {
    try {
      cb(err)
    } catch(e) {
      self.emit("error", e) 
    }
  }
}

function hashRoots(feed, index, cb)
{
  feed.rootHashes(index, function(err, roots) {
    if (err) return cb(err);

    var digest = bufferAlloc(32)
  
    for (var i = 0; i < roots.length; i++)
      roots[i] = roots[i].hash
  
    sodium.crypto_generichash_batch(digest, roots)
  
    cb(null, digest)
  })
}
