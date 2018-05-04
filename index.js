var hypercore = require('hypercore')
var hyperdb = require('hyperdb')
var thunky = require('thunky')
var raf = requrie('random-access-file')
var path = require('path')
var events = require('events')

function HyperStream (storage, key, opts) {
  if (!(this instanceof HyperStream)) return new HyperStream(storage, key, opts)
  events.EventEmitter.call(this)

  this._storage = createStorage(storage)
  this.db = new hyperdb(this._makeStorage('__db'), key, opts)
}

HyperStream.prototype._makeStorage = function (dir) {
  var storage = this._storage
  return function (name, arg) {
    return storage(dir + '/' + name, arg)
  }
}

HyperStream.prototype._ready = function (cb) {
  this.db.ready(function (err) {
  }
}

function createStorage (st) {
  if (typeof st === 'function') return st
  return function (name) {
    return raf(path.join(st, name))
  }
}
