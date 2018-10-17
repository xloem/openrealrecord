'use strict'

import * as bufferAlloc from 'buffer-alloc-unsafe'
import * as sodium from 'sodium-universal'

const keyToFeeds = (db, key, cb) => {
    // TODO: submit an issue / PR to hyperdb to allow for public access feeds by key

  // // this approach does not use private members of hyperdb but is O(n)
  // for (var i = 0; i < db.feeds; ++ i) {
  //   if (0 == Buffer.compare(key, db.feeds[i].key)) {
  //     return cb(db.feeds[i], db.contentFeeds[i])
  //   }
  // }

  // this approach uses private members of hyperdb but is just a map lookup if already available locally
  const writer = db._byKey.get(key.toString('hex'))
  if (!writer) {
    return cb(new Error(`no feed found for key${keyToID(key)}`))
  }
  
  
  if (writer._contentFeed) {
    return cb(null, writer._feed, writer._contentFeed)
  }

  writer._feed.once('append',  () => {
    writer.head((err) => {
      if (err) return cb(err)
      cb(null, writer._feed, writer._contentFeed)
    })
  })
} 

const keyToID = key => key.toString('base64').substr(0, 43).split('/').join('_')

const feedToStreamID = feed => keyToID(feed.key)

const streamIDToFeedKey = id => Buffer.from(id.split('_').join('/'), 'base64')

const hashRoots = (feeds, lengths, cb) => {
  const digest = bufferAlloc(32)
  const hasher = sodium.crypto_generichash_instance(digest.length)

  let totals = []
  let index = 0

  const nextFeed = (err, roots) => {
    if (err) return cb(err)

    const totalbytes = roots.reduce((acc, root) => {
      hasher.update(root.hash)
      return acc + root.size
    })

    totals[index] = totalbytes

    ++index
    if (index < feeds.length) {
      thisFeed()
    } else {
      hasher.final(digest)
      cb(null, digest, totals)
    }
  }

  const thisFeed = () => {
    if (!lengths[index]) return nextFeed(null, [])
    feeds[index].rootHashes(lengths[index] - 1, nextFeed)
  }

  thisFeed()
}

export {
  feedToStreamID,
  hashRoots,
  keyToFeeds,
  keyToID,
  streamIDToFeedKey
}
