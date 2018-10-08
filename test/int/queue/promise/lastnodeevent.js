const test = require('ava')
const EventEmitter = require('events')
const LastNodeEventPromiseQueue = require('queue/promise/lastnodeevent')

const eventName = 'testEvent'

test('construct', t => {
  const emitter = new EventEmitter()
  t.notThrows(() => {
    /* eslint-disable-next-line no-new */
    new LastNodeEventPromiseQueue(emitter, eventName)
  })
})

test('1 event', async t => {
  const emitter = new EventEmitter()
  const queue = new LastNodeEventPromiseQueue(emitter, eventName)
  emitter.emit(eventName, 97)
  const data = await queue.next
  t.is(data.length, 1)
  t.is(data[0], 97)
})

test('2 events', async t => {
  const emitter = new EventEmitter()
  const queue = new LastNodeEventPromiseQueue(emitter, eventName)
  emitter.emit(eventName, 97)
  emitter.emit(eventName, 98)
  const data = await queue.next
  t.is(data.length, 1)
  t.is(data[0], 98)
})

test('3 events', async t => {
  const emitter = new EventEmitter()
  const queue = new LastNodeEventPromiseQueue(emitter, eventName)
  emitter.emit(eventName, 97)
  emitter.emit(eventName, 98)
  emitter.emit(eventName, 99)
  const data = await queue.next
  t.is(data.length, 1)
  t.is(data[0], 99)
})

test('queued request', async t => {
  const emitter = new EventEmitter()
  const queue = new LastNodeEventPromiseQueue(emitter, eventName)
  const nextPromise = queue.next
  emitter.emit(eventName, 97)
  const data = await nextPromise
  t.is(data.length, 1)
  t.is(data[0], 97)
})

test('error', async t => {
  const emitter = new EventEmitter()
  const queue = new LastNodeEventPromiseQueue(emitter, eventName, true)
  emitter.emit('error', new Error('fail'))
  await t.throwsAsync(queue.next, 'fail', 'errored')
})
