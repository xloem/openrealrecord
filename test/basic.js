var hyperstream = require('../')
var ram = require('random-access-memory')
var tape = require('tape')

tape('write', function (t) {
  var hs = hyperstream(ram)
  hs.ready(function (err) {
    t.error(err, 'no error')
    hs.write('hello!', function (err) {
      t.error(err, 'no error')
      hs.write('world!', function (err) {
        t.error(err, 'no error')
        t.end()
      })
    })
  })
})
