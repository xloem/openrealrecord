/** @module openrealrecord/module */

const ModuleController = require('./controller')

const privs = new WeakMap()

/**
 * OpenRealRecord module.
 *
 * @implements {IModule}
 */
class Module {
  /**
   * @param {Stream} stream - Stream to feed data to.
   * @param {ModuleExecutor} executor - Executor.
   */
  constructor (stream, executor) {
    const priv = {
      stream,
      executor,
      relay: null,
      promise: {
        run: null,
        done: null
      },
      resolve: {
        done: null
      },
      reject: {
        done: null
      },
      state: State.Stopped,
      error: null
    }
    privs.set(this, priv)
    priv.promise.done = new Promise((resolve, reject) => {
      priv.resolve.done = resolve
      priv.reject.done = reject
    })
    if (new.target === Module) Object.freeze(this)
  }

  get done () {
    const priv = privs.get(this)
    return priv.promise.done
  }

  start () {
    const priv = privs.get(this)
    switch (priv.state) {
      case State.Running:
        return

      case State.Stopping:
        throw new Error('start attempt while stopping')

      case State.Done:
        throw new Error('start attempt after done')

      case State.Errored:
        throw new Error('start attempt after errored')

      case State.Stopped:
        privm.launch.call(this)
        break

      default:
        const error = new Error('unrecognized state')
        error.state = priv.state
        throw error
    }
  }

  async stop () {
    const priv = privs.get(this)
    switch (priv.state) {
      case State.Stopped:
      case State.Done:
      case State.Errored:
        return

      case State.Stopping:
        throw new Error('stop attempt while stopping')

      case State.Running:
        priv.state = State.Stopping
        priv.relay.stop()
        await priv.promise.run
        if (priv.state === State.Done) {
          // Received done while stopping
          privm.wrapup.call(this)
        } else {
          // Stopped before done
          priv.relay = null
          priv.promise.run = null
          priv.state = State.Stopped
        }
        break

      default:
        const error = new Error('unrecognized state')
        error.state = priv.state
        throw error
    }
  }
}

Object.freeze(Module)
Object.freeze(Module.prototype)

// Private methods
const privm = {
  /**
   * Handle received done message.
   *
   * Records done received.
   * Next run stop detects and performs wrapup.
   */
  handleDone () {
    const priv = privs.get(this)
    switch (priv.state) {
      case State.Done:
      case State.Errored:
        return

      case State.Running:
      case State.Stopped:
      case State.Stopping:
        priv.state = State.Done
    }
  },

  /**
   * Handle executor error.
   *
   * No effect if done message received.
   */
  handleExecutorError (error) {
    const priv = privs.get(this)
    if (priv.state === State.Done) return
    priv.state = State.Errored
    priv.error = error
    privm.wrapup.call(this)
  },

  /**
   * Handle run stop.
   *
   * Performs wrapup if done message was received.
   */
  handleRunStopped () {
    const priv = privs.get(this)
    if (priv.state === State.Done) privm.wrapup.call(this)
  },

  /**
   * Launch a run.
   */
  launch () {
    const priv = privs.get(this)
    priv.state = State.Running
    const controller = new ModuleController(
      priv.stream,
      function receiveControllerProtected ({ relay }) {
        priv.relay = relay
      }
    )
    priv.relay.done.then(privm.handleDone.bind(this))
    priv.promise.run = priv.executor(controller)
      .then(privm.handleRunStopped.bind(this))
      .catch(privm.handleExecutorError.bind(this))
  },

  /**
   * Perform wrapup.
   *
   * Resolves done promise if feeding is done.
   * Rejects done promise with the error if an executor error occurred.
   */
  wrapup () {
    const priv = privs.get(this)
    priv.relay = null
    priv.promise.run = null
    priv.execution = null // Release closed over resources
    switch (priv.state) {
      case State.Done:
        priv.resolve.done()
        break

      case State.Errored:
        priv.reject.done(priv.error)
        break

      default:
        const error = new Error('unrecognized state')
        error.state = priv.state
        throw error
    }
  }
}

/**
 * State enumeration.
 *
 * @enum
 * @readonly
 */
const State = (function constructStateEnumeration () {
  const State = Object.create(null)
  Object.assign(State, {
    Running: Symbol('Module.State.Running'),
    Stopping: Symbol('Module.State.Stopping'),
    Stopped: Symbol('Module.State.Stopped'),
    Done: Symbol('Module.State.Done'),
    Errored: Symbol('Module.State.Errored')
  })
  Object.freeze(State)
  return State
})()

module.exports = Module
