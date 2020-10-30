const test = require('ava')
const mockRequire = require('mock-require')
const DummyStream = require('dummy/stream')
const StubModule = require('stub/module/base/main')

mockRequire('module/base', StubModule)

const IterableModule = require('module/iterable')

test('construct', t => {
  const stream = new DummyStream()
  const data = []
  t.notThrows(() => {
    new IterableModule(stream, data) /* eslint-disable-line no-new */
  })
})

test('write', async t => {
  const stream = new DummyStream()
  const data = [
    Buffer.from([ 1 ]),
    Buffer.from([ 2 ]),
    Buffer.from([ 3 ])
  ]
  const module = new IterableModule(stream, data)
  const executor = module.executor
  const controller = module.controller
  await executor(controller)
  const write = controller.write
  t.true(write.calledThrice)
  t.deepEqual(write.firstCall.args[0], Buffer.from([ 1 ]))
  t.deepEqual(write.secondCall.args[0], Buffer.from([ 2 ]))
  t.deepEqual(write.thirdCall.args[0], Buffer.from([ 3 ]))
})
