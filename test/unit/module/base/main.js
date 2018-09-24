const test = require('ava')
const sinon = require('sinon')
const mockRequire = require('mock-require')
const Delay = require('helper/delay')
const DummyStream = require('stub/stream')
const StubModuleController = require('stub/module/base/controller')

mockRequire('module/base/controller', StubModuleController)

const Module = require('module/base/main')

test('construct', t => {
  const stream = new DummyStream()
  const executor = sinon.spy()
  t.notThrows(() => {
    new Module(stream, executor) /* eslint-disable-line no-new */
  }, 'constructed')
})

test('start', t => {
  const stream = new DummyStream()
  const executor = sinon.spy(async function executor () {})
  const module = new Module(stream, executor)
  module.start()
  t.true(executor.calledOnce, 'launched executor')
})

test('stop', async t => {
  const stream = new DummyStream()
  const module = new Module(stream, async function executor (controller) {
    controller.getter.stop.returns(false).onThirdCall().returns(true)
    for (let i = 0; i < 100; i++) {
      await Delay.milliseconds(10)
      if (controller.stop) {
        t.pass('received stop')
        return
      }
    }
    t.fail('never received stop')
  })
  module.start()
  await t.notThrowsAsync(module.stop(), 'stop complete')
})

test('restart', async t => {
  const stream = new DummyStream()
  const executor = sinon.spy(async function executor (controller) {
    controller.getter.stop.returns(false).onThirdCall().returns(true)
    for (let i = 0; i < 100; i++) {
      await Delay.milliseconds(1)
      if (controller.stop) return
    }
  })
  const module = new Module(stream, executor)
  module.start()
  await t.notThrowsAsync(module.stop(), 'stop complete')
  module.start()
  t.true(executor.calledTwice, 'relaunched executor')
})

test('done', async t => {
  const stream = new DummyStream()
  const module = new Module(stream, async function executor (controller) {
    controller.relay.resolve.done()
    controller.done()
  })
  const done = module.done
  module.start()
  await t.notThrowsAsync(done, 'received done')
})

test('error', async t => {
  const stream = new DummyStream()
  const module = new Module(stream, async function executor () {
    throw new Error('executor failed')
  })
  const done = module.done
  module.start()
  await t.throwsAsync(
    done,
    { instanceOf: Error, message: 'executor failed' },
    'received error'
  )
})
