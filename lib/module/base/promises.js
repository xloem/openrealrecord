/** @module openrealrecord/module/base/promises */

const privs = new WeakMap()

/**
 * Module controller promise container.
 *
 * Exposes promises provided by module controller.
 */
class ModuleControllerPromises {
  /**
   * @param {object} params
   * @param {Promise} params.stop - Stop promise. Resolved when stop message
   *     is received.
   */
  constructor ({ stop }) {
    const priv = {
      stop
    }
    privs.set(this, priv)
    if (new.target === ModuleControllerPromises) Object.freeze(this)
  }

  get stop () {
    const priv = privs.get(this)
    return priv.stop
  }
}

Object.freeze(ModuleControllerPromises)
Object.freeze(ModuleControllerPromises.prototype)

module.exports = ModuleControllerPromises
