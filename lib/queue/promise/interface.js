/**
 * Queue with `Promise` based interface.
 *
 * Receives values and requests. Queues both. Delivers values to requests.
 * May become errored. An errored queue rejects all queued and future requests
 * with the cause.
 *
 * Delivers values in order received.
 * Fulfills requests in order received.
 *
 * When a value is received:
 *
 * - If the request queue is empty, queues the value.
 * - Otherwise, delivers the value to the next request.
 *
 * When a request is received:
 *
 * - If the value queue is empty, queues the request.
 * - Otherwise, fulfills the request with the next value.
 *
 * @interface IPromiseQueue
 * @memberof module:openrealrecord/queue/promise
 */

/**
 * Promise for next value.
 *
 * Each access sends a new request and provides a promise for a new value.
 *
 * @var {Promise} next
 * @memberof module:openrealrecord/queue/promise~IPromiseQueue
 * @readonly
 */
