/** @module openrealrecord/queue/promise */

const PromiseQueue = require('./base')
const LastNodeEventPromiseQueue = require('./lastnodeevent')
const NodeEventPromiseQueue = require('./nodeevent')

Object.assign(module.exports, {
  PromiseQueue,
  LastNodeEventPromiseQueue,
  NodeEventPromiseQueue
})
