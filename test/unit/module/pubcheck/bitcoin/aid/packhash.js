const test = require('ava')
const { packageHash } = require('module/pubcheck/bitcoin/aid')

// 'ORRecord' encoded to ASCII
const hashPrefix = Buffer.from([
  0x4f, 0x52, 0x52, 0x65, 0x63, 0x6f, 0x72, 0x64
])

test('empty', t => {
  const hash = Buffer.alloc(0)
  const message = packageHash(hash)
  t.deepEqual(message, hashPrefix)
})

test('1 byte', t => {
  const hash = Buffer.from([ 0x01 ])
  const expectedMessage = Buffer.concat([ hashPrefix, hash ])
  const message = packageHash(hash)
  t.deepEqual(message, expectedMessage)
})

test('3 bytes', t => {
  const hash = Buffer.from([ 0x01, 0x02, 0x03 ])
  const expectedMessage = Buffer.concat([ hashPrefix, hash ])
  const message = packageHash(hash)
  t.deepEqual(message, expectedMessage)
})

test('32 bytes', t => {
  const hash = Buffer.from([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10,
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10,
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x10,
    0x01, 0x02
  ])
  const expectedMessage = Buffer.concat([ hashPrefix, hash ])
  const message = packageHash(hash)
  t.deepEqual(message, expectedMessage)
})
