/**
 * Module.
 *
 * A module feeds data to a stream.
 * Implementing classes define useful module types.
 *
 * @interface IModule
 * @memberof module:openrealrecord/module
 */

/**
 * Module executor.
 *
 * Generates data and feeds it to the module stream.
 *
 * Call `controller.write` to write data to stream.
 * Call `controller.done` to signal data generation complete.
 * Check `controller.stop` periodically to detect stop requests.
 * You may stop by simply returning. Execution is resumed by invoking again.
 *
 * @callback ModuleExecutor
 * @memberof module:openrealrecord/module~Module
 * @async
 *
 * @param {ModuleController} controller - Interface with module. Provides
 *     ability to write to the stream, signal done, and check for stop
 *     requests.
 *
 * @see {ModuleController} For complete details.
 */

/**
 * Promise for generation done.
 *
 * Resolves once generation has completed.
 *
 * Rejects immediately for a module that generates indefinitely
 * to indicate waiting for completion is invalid.
 *
 * @var {Promise} done
 * @memberof module:openrealrecord/module~IModule
 * @readonly
 */

/**
 * Start feeding data.
 *
 * No effect if already running.
 *
 * @method start
 * @memberof module:openrealrecord/module~IModule
 *
 * @throws {Error} If called while stopping.
 *     Message `'start attempt while stopping'`.
 * @throws {Error} If called after done.
 *     Message `'start attempt after done'`.
 * @throws {Error} If called after errored.
 *     Message `'start attempt after errored'`.
 */

/**
 * Stop feeding data.
 *
 * Returns once data generation has stopped.
 * No effect if stopped, done, or errored.
 *
 * @method stop
 * @memberof module:openrealrecord/module~IModule
 * @async
 *
 * @throws {Error} If called while stopping.
 *     Message `'stop attempt while stopping'`.
 * @throws If generation encountered an error while stopping.
 */
