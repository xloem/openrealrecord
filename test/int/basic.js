const test = require('ava')
const orr = require('../..')
const ram = require('random-access-memory')

const hs = orr(ram)

test.serial.cb('ready', t => {
  hs.ready(err => {
    t.falsy(err, 'no error')
    t.end()
  })
})

test.serial.cb('getStream localStream', t => {
  t.is(hs.getStream(hs.localStream.id), hs.localStream)
  t.end()
})

test.serial.cb('write', t => {
  hs.write('hello ', err => {
    t.falsy(err, 'no error')
    hs.write('world!', err => {
      t.falsy(err, 'no error')
      t.end()
    })
  })
})

test.serial.cb('local read', t => {
  hs.localStream.read(1, 10, {}, (err, data) => {
    t.falsy(err, 'no error')
    t.is(data.toString(), 'ello world')
    t.end()
  })
})

test.serial.cb('local checkpoints', t => {
  var cp1, cp2
  var it = hs.localStream.checkpoints()
  it.next((err, checkpoint) => {
    t.falsy(err, 'no error')
    cp1 = checkpoint
    t.is(checkpoint.length, 1)
    t.is(checkpoint.byteLength, 6)
    it.next((err, checkpoint) => {
      t.falsy(err, 'no error')
      cp2 = checkpoint
      t.is(checkpoint.length, 2)
      t.is(checkpoint.byteLength, 12)
      it.next((err, checkpoint) => {
        t.falsy(err, 'no error')
        t.is(checkpoint, null)
        verifies()
      })
    })
  })
  function verifies () {
    hs.localStream.verify(cp1, (err, success) => {
      t.falsy(err, 'no error')
      t.is(success, true)
      hs.localStream.verify(cp2, (err, success) => {
        t.falsy(err, 'no error')
        t.is(success, true)
        t.end()
      })
    })
  }
})

test.serial.cb('local listen', t => {
  var length = hs.localStream.feed.length
  var byteLength = hs.localStream.feed.byteLength
  var data = [
    '  ',
    'It\'s',
    ' me.'
  ]
  var dataIndex = 0

  t.plan(data.length * 5)

  hs.localStream.on('error', err => { t.fail(err) })
  hs.localStream.on('checkpoint', oncheckpoint)
  hs.localStream.listen()

  let checked = 0

  writenext()

  function writenext () {
    hs.write(data[dataIndex], err => {
      t.falsy(err)
    })
  }

  function oncheckpoint (checkpoint) {
    ++length
    byteLength += data[dataIndex].length
    ++dataIndex

    if (dataIndex < data.length) writenext()

    t.is(checkpoint.length, length)
    t.is(checkpoint.byteLength, byteLength)
    hs.localStream.verify(checkpoint, (err, success) => {
      t.falsy(err)
      t.truthy(success)
      checked++
      if (checked === data.length) t.end()
    })
  }
})
