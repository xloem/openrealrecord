const test = require('ava')
const ModuleControllerPromises = require('module/base/promises')

test('construct', t => {
  t.notThrows(() => {
    new ModuleControllerPromises({}) /* eslint-disable-line no-new */
  })
})

test('stop', t => {
  const stop = Promise.resolve()
  const promises = new ModuleControllerPromises({ stop })
  t.is(promises.stop, stop)
})
