
// TODO: this hack makes files be sparse when data is deleted on linux.  should be made into a node module,
// and/or perhaps a different storage scheme picked for compatibility with other OS's
//
var fs = require('fs')
var raf = require('random-access-file')
var childProcess = require('child_process')

module.exports = function (path) {
  var ret = raf(path)
  ret._del = rafSparseDel
  return ret
}

function rafSparseDel (req) {
  // deallocates a portion of a file on linux, by spawning fallocate
  // note that this is done synchronously for now because fallocate will open a new file descriptor

  fs.fsyncSync(this.fd)

  var res = childProcess.spawnSync('fallocate',
    ['--punch-hole', '--offset', Number(req.offset), '--length', Number(req.size), this.filename])

  if (res.error) return req.callback(res.error)
  if (res.signal) return req.callback(new Error('fallocate terminated by signal ' + res.signal))
  if (res.status) return req.callback(new Error('fallocate failed with code ' + res.status))
  req.callback(null)
}
