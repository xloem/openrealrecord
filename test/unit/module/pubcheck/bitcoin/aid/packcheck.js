const test = require('ava')
const sinon = require('sinon')
const Aid = require('module/pubcheck/bitcoin/aid')
const { packageCheckpoint } = Aid

const packageHash = Aid.packageHash = sinon.stub()

test.beforeEach(t => {
  packageHash.reset()
})

test('relay hash', t => {
  const rootsHash = Buffer.from([ 0x01, 0x02, 0x03 ])
  const checkpoint = { rootsHash }
  packageCheckpoint(checkpoint)
  t.true(packageHash.calledOnceWith(rootsHash))
})

test('propagate message', t => {
  const packageHashMessage = Buffer.from([ 0xaa, 0xbb, 0xcc ])
  packageHash.returns(packageHashMessage)
  const rootsHash = Buffer.alloc(0)
  const checkpoint = { rootsHash }
  const message = packageCheckpoint(checkpoint)
  t.deepEqual(message, packageHashMessage)
})
