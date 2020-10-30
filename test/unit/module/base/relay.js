const test = require('ava')
const sinon = require('sinon')
const dummyFunction = require('dummy/function')
const ModuleRelay = require('module/base/relay')

test('construct', t => {
  const prot = { deliverStop: dummyFunction }
  const revealer = sinon.spy()
  new ModuleRelay(prot, revealer) /* eslint-disable-line no-new */
  t.true(revealer.calledOnce, 'revealer called')
})

test('reveal', t => {
  const prot = { deliverStop: dummyFunction }
  /* eslint-disable-next-line no-new */
  new ModuleRelay(
    prot,
    function revealRelayProtected ({ deliverDone }) {
      t.is(typeof deliverDone, 'function', 'deliver done revealed')
    }
  )
})

test('stop', t => {
  const prot = { deliverStop: sinon.spy() }
  const revealer = sinon.fake()
  const relay = new ModuleRelay(prot, revealer)
  relay.stop()
  t.true(prot.deliverStop.calledOnce, 'deliver stop called')
})

test('done', async t => {
  const prot = { deliverStop: dummyFunction }
  let deliverDone
  const relay = new ModuleRelay(
    prot,
    function revealRelayProtected (prot) {
      deliverDone = prot.deliverDone
    }
  )
  const done = relay.done
  deliverDone()
  await t.notThrowsAsync(done, 'done delivered')
})
