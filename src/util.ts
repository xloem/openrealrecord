import * as allocUnsafe from 'buffer-alloc-unsafe';
import * as sodium from 'sodium-universal';
import * as HyperDB from 'hyperdb';

export function keyToFeeds(
  db: HyperDB,
  key: Buffer,
  cb: (error: Error | null, dbFeed?: any, contentFeed?: any) => void
): void {
  // TODO: submit an issue / PR to hyperdb to allow for public access feeds by key

  // // this approach does not use private members of hyperdb but is O(n)
  // for (let i = 0; i < db.feeds; ++ i) {
  //   if (0 == Buffer.compare(key, db.feeds[i].key)) {
  //     return cb(db.feeds[i], db.contentFeeds[i])
  //   }
  // }

  // this approach uses private members of hyperdb but is just a map lookup if already available locally
  const writer = db._byKey.get(key.toString('hex'));
  if (!writer) {
    cb(new Error('no feed found for key ' + exports.keyToID(key)));
  } else if (!writer._contentFeed) {
    writer._feed.once('append', () => {
      if (!writer) {
        return;
      }
      writer.head((err: Error) => {
        if (!writer) {
          return;
        }
        if (err) {
          return cb(err);
        }
        cb(null, writer._feed, writer._contentFeed);
      });
    });
  } else {
    cb(null, writer._feed, writer._contentFeed);
  }
}

export function keyToID(key: Buffer): string {
  return key
    .toString('base64')
    .substr(0, 43)
    .split('/')
    .join('_');
}

export function feedToStreamID(feed: HyperDB.Feed): string {
  return keyToID(feed.key);
}

export function streamIDToFeedKey(id: string): Buffer {
  return Buffer.from(id.split('_').join('/'), 'base64');
}

export function hashRoots(
  feeds: HyperDB.Feed[],
  lengths: number[],
  cb: (error: Error | null, digest?: any, totals?: number[]) => void
) {
  const digest = allocUnsafe(32);
  const hasher = sodium.crypto_generichash_instance(digest.length);
  const totals: number[] = [];
  let index = 0;
  thisFeed();
  function thisFeed() {
    if (!lengths[index]) {
      return nextFeed(null, []);
    }
    feeds[index].rootHashes(lengths[index] - 1, nextFeed);
  }
  function nextFeed(err: Error | null, roots: any[]) {
    if (err) {
      return cb(err);
    }
    let totalbytes = 0;
    for (let i = 0; i < roots.length; i++) {
      totalbytes += roots[i].size;
      hasher.update(roots[i].hash);
    }
    totals[index] = totalbytes;
    ++index;
    if (index < feeds.length) {
      thisFeed();
    } else {
      hasher.final(digest);
      cb(null, digest, totals);
    }
  }
}
