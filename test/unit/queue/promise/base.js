const test = require('ava')
const sinon = require('sinon')
const PromiseQueue = require('queue/promise/base')

test('construct', t => {
  const revealer = sinon.fake()
  t.notThrows(() => {
    new PromiseQueue(revealer) /* eslint-disable-line no-new */
  }, 'constructed')
})

test('reveal', t => {
  /* eslint-disable-next-line no-new */
  new PromiseQueue(function revealer (prot) {
    t.is(typeof prot.fail, 'function', 'fail revealed')
    t.is(typeof prot.updated, 'function', 'updated revealed')
    t.true(Array.isArray(prot.values))
  })
})

test('queue value', t => {
  /* eslint-disable-next-line no-new */
  new PromiseQueue(function revealer ({ updated, values }) {
    t.notThrows(() => {
      values.push(57)
      updated()
    })
  })
})

test('queue request', t => {
  const revealer = sinon.fake()
  const queue = new PromiseQueue(revealer)
  t.notThrows(() => {
    queue.next /* eslint-disable-line no-unused-expressions */
  }, 'queued request')
})

test('add then request', async t => {
  const queue = new PromiseQueue(function revealer ({ updated, values }) {
    values.push(57)
    updated()
  })
  const value = await queue.next
  t.is(value, 57)
})

test('request then add', async t => {
  let updated, values
  const queue = new PromiseQueue(function revealer (prot) {
    updated = prot.updated
    values = prot.values
  })
  const nextPromise = queue.next
  values.push(57)
  updated()
  const value = await nextPromise
  t.is(value, 57)
})

test('queued values', async t => {
  const queue = new PromiseQueue(function revealer ({ updated, values }) {
    values.push(57)
    values.push(58)
    values.push(59)
    updated()
  })
  t.is(await queue.next, 57)
  t.is(await queue.next, 58)
  t.is(await queue.next, 59)
})

test('queued requests', async t => {
  let updated, values
  const queue = new PromiseQueue(function revealer (prot) {
    updated = prot.updated
    values = prot.values
  })
  const first = queue.next
  const second = queue.next
  const third = queue.next
  values.push(57)
  values.push(58)
  values.push(59)
  updated()
  t.is(await first, 57)
  t.is(await second, 58)
  t.is(await third, 59)
})

test('fail', t => {
  /* eslint-disable-next-line no-new */
  new PromiseQueue(function revealer ({ fail }) {
    t.notThrows(() => {
      const error = new Error('fail')
      fail(error)
    }, 'successful fail')
  })
})

test('double fail', t => {
  /* eslint-disable-next-line no-new */
  new PromiseQueue(function revealer ({ fail }) {
    fail(new Error('fail'))
    t.notThrows(fail, 'ignored double fail')
  })
})

test('errored add', t => {
  /* eslint-disable-next-line no-new */
  new PromiseQueue(function revealer ({ fail, updated, values }) {
    fail(new Error('fail'))
    t.throws(() => {
      values.push(57)
      updated()
    }, 'queue update while errored', 'errored add')
  })
})

test('errored request', async t => {
  const queue = new PromiseQueue(function revealer ({ fail }) {
    fail(new Error('fail'))
  })
  await t.throwsAsync(queue.next, 'fail', 'errored request')
})

test('reject queued requests', async t => {
  let fail
  const queue = new PromiseQueue(function revealer (prot) {
    fail = prot.fail
  })
  const next1 = queue.next
  const next2 = queue.next
  const next3 = queue.next
  fail(new Error('fail'))
  await t.throwsAsync(next1, 'fail', 'rejected queued request 1')
  await t.throwsAsync(next2, 'fail', 'rejected queued request 2')
  await t.throwsAsync(next3, 'fail', 'rejected queued request 3')
})
