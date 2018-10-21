'use strict';

import * as bufferAlloc from 'buffer-alloc-unsafe';
import * as HyperDB from 'hyperdb';
import * as sodium from 'sodium-universal';

const keyToID: Function = (key: any): string => key.toString('base64').substr(0, 43).split('/').join('_');

const keyToFeeds: Function = (db: HyperDB, key: any, cb: Function): void => {
  // TODO: submit an issue / PR to hyperdb to allow for public access feeds by key
  // this approach does not use private members of hyperdb but is O(n)
  // for (var i = 0; i < db.feeds; ++ i) {
  //   if (0 == Buffer.compare(key, db.feeds[i].key)) {
  //     return cb(db.feeds[i], db.contentFeeds[i])
  //   }
  // }

  // this approach uses private members of hyperdb but is just a map lookup if already available locally
  const writer: HyperDB.Writer | undefined = db._byKey.get(key.toString('hex'));
  if (!writer) {
    return cb(new Error(`no feed found for key${keyToID(key)}`));
  }

  if (writer._contentFeed) {
    return cb(null, writer._feed, writer._contentFeed);
  }

  writer._feed.once('append',  () => {
    writer.head((err: (Error | null)) => {
      if (err) { return cb(err); }
      cb(null, writer._feed, writer._contentFeed);
    });
  });
};

const feedToStreamID: Function = (feed: HyperDB.Feed): string => keyToID(feed.key);

const streamIDToFeedKey: Function = (id: string): Buffer => Buffer.from(id.split('_').join('/'), 'base64');

const hashRoots: Function = (feeds: HyperDB.Feed[], lengths: number, cb: Function): void => {
  const digest: any = bufferAlloc(32);
  const hasher: any = sodium.crypto_generichash_instance(digest.length);

  const totals: any[] = [];
  let index: number = 0;

  const nextFeed: Function = (err: (Error | null), roots: HyperDB.Root[]): void => {
    if (err) { return cb(err); }

    totals[index] = roots.reduce(
      (acc: number, root: HyperDB.Root) => {
        hasher.update(root.hash);

        return acc + root.size;
      },
      0);
  };

  for (let i: number = 0; i < feeds.length; i++) {
    index = i;
    if (!lengths[index]) { return nextFeed(null, []); }
    feeds[index].rootHashes(lengths[index] - 1, nextFeed);
    i++;
  }

  hasher.final(digest);
  cb(null, digest, totals);
};

export {
  feedToStreamID,
  hashRoots,
  keyToFeeds,
  keyToID,
  streamIDToFeedKey
};
