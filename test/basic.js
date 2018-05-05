var hyperstream = require('../')
var ram = require('random-access-memory')
var tape = require('tape')

var hs = hyperstream(ram)

tape('ready', function (t) {
  hs.ready(function (err) {
    t.error(err, 'no error')
    t.end()
  })
})

tape('getStream localStream', function (t) {
  t.same(hs.getStream(hs.localStream.id), hs.localStream)
  t.end()
})

tape('write', function (t) {
  hs.write('hello!', function (err) {
    t.error(err, 'no error')
    hs.write('world!', function (err) {
      t.error(err, 'no error')
      t.end()
    })
  })
})

tape('read', function (t) {
  hs.localStream.read(1, 10, {}, function (err, data) {
    t.error(err, 'no error')
    t.same(data.toString(), 'ello!world')
    t.end()
  })
})

tape('checkpoints', function (t) {
  var cp1, cp2
  var it = hs.localStream.checkpoints()
  it.next(function (err, checkpoint) {
    t.error(err, 'no error')
    cp1 = checkpoint
    t.same(checkpoint.length, 1)
    t.same(checkpoint.byteLength, 6)
    it.next(function (err, checkpoint) {
      t.error(err, 'no error')
      cp2 = checkpoint
      t.same(checkpoint.length, 2)
      t.same(checkpoint.byteLength, 12)
      it.next(function (err, checkpoint) {
        t.error(err, 'no error')
        t.same(checkpoint, null)
        verifies()
      })
    })
  })
  function verifies () {
    hs.localStream.verify(cp1, function (err, success) {
      t.error(err, 'no error')
      t.same(success, true)
      hs.localStream.verify(cp2, function (err, success) {
        t.error(err, 'no error')
        t.same(success, true)
        t.end()
      })
    })
  }
})
