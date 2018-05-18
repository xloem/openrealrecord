'use strict'

const bufferAlloc = require('buffer-alloc-unsafe')
const sodium = require('sodium-native')

exports.keyToFeeds = function (db, key, cb) {
  // TODO: submit an issue / PR to hyperdb to allow for public access feeds by key

  // // this approach does not use private members of hyperdb but is O(n)
  // for (var i = 0; i < db.feeds; ++ i) {
  //   if (0 == Buffer.compare(key, db.feeds[i].key)) {
  //     return cb(db.feeds[i], db.contentFeeds[i])
  //   }
  // }

  // this approach uses private members of hyperdb but is just a map lookup if already available locally
  var writer = db._byKey.get(key.toString('hex'))
  if (!writer) {
    cb(new Error('no feed found for key ' + exports.keyToID(key)))
  } else if (!writer._contentFeed) {
    writer._feed.once('append', function () {
      writer.head(function (err) {
        if (err) return cb(err)
        cb(null, writer._feed, writer._contentFeed)
      })
    })
  } else {
    cb(null, writer._feed, writer._contentFeed)
  }
}

exports.keyToID = function (key) {
  return key.toString('base64').substr(0, 43).split('/').join('_')
}

exports.feedToStreamID = function (feed) {
  return exports.keyToID(feed.key)
}

exports.streamIDToFeedKey = function (id) {
  return Buffer.from(id.split('_').join('/'), 'base64')
}

exports.hashRoots = function (feeds, lengths, cb) {
  var digest = bufferAlloc(32)
  var hasher = sodium.crypto_generichash_instance(digest.length)

  var totals = []
  var index = 0

  thisFeed()

  function thisFeed () {
    if (!lengths[index]) return nextFeed(null, [])
    feeds[index].rootHashes(lengths[index] - 1, nextFeed)
  }

  function nextFeed (err, roots) {
    if (err) return cb(err)

    var totalbytes = 0

    for (var i = 0; i < roots.length; i++) {
      totalbytes += roots[i].size
      hasher.update(roots[i].hash)
    }

    totals[index] = totalbytes

    ++index
    if (index < feeds.length) {
      thisFeed()
    } else {
      hasher.final(digest)
      cb(null, digest, totals)
    }
  }
}
