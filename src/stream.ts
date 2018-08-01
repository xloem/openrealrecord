import * as bulk from 'bulk-write-stream';
import { EventEmitter } from 'events';
import * as hyperdbput from 'hyperdb/lib/put';
import * as hyperdbmessages from 'hyperdb/lib/messages';
import * as util from './util';
import * as HyperDB from 'hyperdb';
import * as messages from './messages';

export class Stream extends EventEmitter {
  private db: HyperDB;
  public id: string;
  private path: string;
  public feed: HyperDB.Feed | null;
  public metadata: any;
  private _dbfeed: any;
  private _checkpointwatcher: any;
  constructor(db: HyperDB, id: any, cb: any) {
    super();

    this.db = db;
    this.id = id;
    this.path = 'streams/' + this.id;
    this.feed = null;
    this.metadata = null;
    this._dbfeed = null;

    if (!this.db.opened) {
      throw new Error('not ready');
    }

    const feedKey = util.streamIDToFeedKey(id);

    this.getMetadata((err: Error | null, metadata: any) => {
      if (err) {
        return cb(err);
      }
      this.metadata = metadata;

      // done here because the feeds may be inadvertently loaded in the request for metadata
      util.keyToFeeds(this.db, feedKey, (error, dbfeed, contentfeed) => {
        if (error) {
          return cb(error);
        }
        this._dbfeed = dbfeed;
        this.feed = contentfeed;
        cb(null, this);
      });
    });
  }

  public getMetadata(cb: (error: Error | null, data?: any) => void) {
    // TODO: since hyperdb doesn't have access restrictions yet, ignore updates to this file by others
    // (can catch in fsck too)
    this.db.get(this.path + '/stream.json', (err, nodes) => {
      if (err) {
        return cb(err);
      }

      if (nodes.length > 1) {
        return cb(new Error('metadata conflict'));
      }

      if (!nodes[0]) {
        // TODO: set owner to the feed that authorized this feed, or at least provide a way to easily do this
        cb(null, {
          name: this.id,
          owner: this.id,
          media: 'application/octet-stream',
          source: 'unknown'
        });
      } else {
        cb(null, JSON.parse(nodes[0].value.toString()));
      }
    });
  }
  public validateMetadata(metadata: any, cb: (error: Error | null) => void) {
    if (!metadata.name || metadata.name === this.id) {
      return cb(new Error('stream has no name'));
    }

    if (
      this.metadata.media === 'application/x.hyper-protobuf' &&
      metadata.media !== this.metadata.media &&
      this.feed &&
      this.feed.length > 0
    ) {
      return cb(new Error('cannot change special media type'));
    }

    util.keyToFeeds(this.db, util.streamIDToFeedKey(metadata.owner), err => {
      if (err) {
        return cb(new Error(`can't find owner feed: ${err.message}`));
      }

      cb(null);
    });
  }
  public setMetadata(
    metadata: any,
    cb: (error: Error | null, data?: any) => void
  ) {
    this.validateMetadata(metadata, err => {
      if (err) {
        return cb(err);
      }
      this.db.put(
        this.path + '/stream.json',
        JSON.stringify(metadata),
        (error2, node) => {
          if (error2) {
            return cb(error2);
          }
          this.metadata = JSON.parse(node.value.toString());
          cb(null, this.metadata);
        }
      );
    });
  }

  public listen() {
    if (this._checkpointwatcher) {
      throw new Error('already listening');
    }

    let seqs: any[] = [];

    const onwatchcheckpoint = () => {
      this.db.get(this.path + '/checkpoint.protobuf', oncheckpoint);
    };

    this.db.get(this.path + '/checkpoint.protobuf', initialize);
    this._checkpointwatcher = this.db.watch(
      this.path + '/checkpoint.protobuf',
      onwatchcheckpoint
    );

    function initialize(err: Error, checkpoints: any[]) {
      seqs = [];

      if (err) {
        return emit(err, checkpoints);
      }

      for (let i = 0; i < checkpoints.length; ++i) {
        const cp = checkpoints[i];
        seqs[cp.feed] = cp.seq;
      }
    }

    const oncheckpoint = (err: Error, checkpoints: any[]) => {
      if (err) {
        return emit(err, checkpoints);
      }
      if (checkpoints === []) {
        emit(null, null);
      }

      for (let i = 0; i < checkpoints.length; ++i) {
        const cp = checkpoints[i];
        const feed = cp.feed;
        const last = seqs[feed];
        const cur = cp.seq;
        if (!last || last !== cur) {
          seqs[feed] = cur;
          this._decodeCheckpoint(cp, emit);
        }
      }
    };

    const emit = (err: Error | null, checkpoint: any) => {
      if (err) {
        return this.emit('error', err);
      }
      this.emit('checkpoint', checkpoint);
    };
  }

  public listening() {
    return !!this._checkpointwatcher;
  }

  public ignore() {
    if (!this._checkpointwatcher) {
      throw new Error('not listening');
    }
    this._checkpointwatcher.destroy();
    this._checkpointwatcher = null;
  }

  checkpoints(opts?: any) {
    const it = this.db.history(opts);

    const next = (cb: any) => {
      _next.call(it, (err: Error, val: any) => {
        if (err) return cb(err);
        if (!val) return cb(null, null);
        if (val.key !== this.path + '/checkpoint.protobuf')
          return next.call(it, cb);
        this._decodeCheckpoint(val, cb);
      });
    };

    const _next = it._next;
    it._next = next;

    return it;
  }

  public verify(
    checkpoint: messages.Checkpoint,
    cb: (error: Error | null, data?: any) => void
  ) {
    if (checkpoint.author !== this.id) {
      return cb(new Error('incorrect author'));
    }
    if (
      !this.feed ||
      !checkpoint._feeds ||
      Buffer.compare(checkpoint._feeds[0], this.feed.key)
    ) {
      return cb(new Error('incorrect feed'));
    }

    const feeds = [this.feed];
    let feedsGotten = 0;

    // seek to spot to make sure root hashes are loaded
    this.feed.seek(checkpoint.byteLength - 1, { hash: true }, seeked);
    const addFeed = (index: number) => {
      if (!checkpoint._feeds) {
        return;
      }
      util.keyToFeeds(this.db, checkpoint._feeds[index], (err, feed) => {
        if (err || !checkpoint._feeds) {
          return cb(err);
        }
        feeds[index] = feed;
        ++feedsGotten;
        if (feedsGotten === checkpoint._feeds.length) {
          doHash();
        }
      });
    };

    for (let i = 1; i < checkpoint._feeds.length; ++i) {
      addFeed(i);
    }

    function seeked(err: Error) {
      if (err || !checkpoint._feeds) {
        return cb(err);
      }
      ++feedsGotten;
      if (feedsGotten === checkpoint._feeds.length) {
        doHash();
      }
    }

    function doHash() {
      if (checkpoint._lengths === undefined) {
        return;
      }
      util.hashRoots(feeds, checkpoint._lengths, (err, hash, byteLengths) => {
        if (err) {
          return cb(err);
        }
        if (byteLengths && byteLengths[0] !== checkpoint.byteLength) {
          return cb(new Error('incorrect byteLength'));
        }
        if (Buffer.compare(checkpoint.rootsHash, hash)) {
          return cb(new Error('hash failure'));
        }
        cb(null, true);
      });
    }
  }
  public findValidCheckpoint(
    opts: any,
    cb: (error?: Error | null, checkpoint?: any) => void,
    invalidcb: (error: Error, checkpoint?: any) => void
  ) {
    const checkpoints = this.checkpoints(opts);

    const seekValid = (err: Error, checkpoint: any) => {
      if (err) {
        if (invalidcb) {
          invalidcb(err);
        }
        return checkpoints.next(seekValid);
      }

      if (checkpoint === null) {
        return cb();
      }

      this.verify(checkpoint, error2 => {
        if (error2) {
          if (invalidcb) {
            invalidcb(error2, checkpoint);
          }
          return checkpoints.next(seekValid);
        } else {
          return cb(null, checkpoint);
        }
      });
    };

    checkpoints.next(seekValid);
  }

  public createWriteStream() {
    const write = (batch: any, cb: () => void) => {
      if (!this.feed) {
        return;
      }
      this.feed.append(batch, err => {
        // nextTick is used because if an error is thrown here, the hypercore batcher will crash
        if (err) {
          return process.nextTick(cb, err);
        }
        this._writeCheckpoint(cb);
      });
    };

    return bulk.obj(write);
  }

  public write(data: string, cb: (error: Error) => void) {
    if (!this.feed) {
      return;
    }

    this.feed.append(data, err => {
      // nextTick is used because if an error is thrown here, the hypercore batcher will crash
      if (err) {
        return process.nextTick(cb, err);
      }
      this._writeCheckpoint(cb);
    });
  }

  public read(
    start: number,
    length: number,
    opts: any,
    cb: (error: Error | null, data?: any) => void
  ) {
    // TODO: find a checkpoint that covers this data and verify it

    if (!this.feed) {
      return;
    }
    if (!start) {
      start = 0;
    }
    if (!length) {
      length = this.feed.byteLength - start;
    }
    if (!opts) {
      opts = {};
    }
    opts.valueEncoding = 'binary';

    let startIndex: number | null = null;
    let startOffset: number | null = null;
    let tailIndex: number | null = null;
    const blocks: any[] = [];
    let totalBlocks: number | null = null;
    let completedBlocks: number = 0;

    const seekStart = (err: Error, index: number, offset: number) => {
      if (err) {
        return cb(err);
      }
      startIndex = index;
      startOffset = offset;
      if (tailIndex != null) {
        seekDone();
      }
    };

    const seekTail = (err: Error, index: number, offset: number) => {
      if (err) {
        return cb(err);
      }
      tailIndex = index;
      if (startIndex != null) {
        seekDone();
      }
    };

    const seekDone = () => {
      const getOne = (index: number) => {
        if (!this.feed) {
          return;
        }
        this.feed.get(index, opts, (err, data) => {
          if (err || startIndex === null) {
            return cb(err);
          }
          blocks[index - startIndex] = data;
          ++completedBlocks;
          if (totalBlocks === completedBlocks) {
            finish();
          }
        });
      };
      if (startIndex === null || tailIndex === null) {
        return;
      }
      totalBlocks = 1 + tailIndex - startIndex;
      for (let i = startIndex; i <= tailIndex; ++i) {
        getOne(i);
      }
    };

    this.feed.seek(start, {}, seekStart);
    this.feed.seek(start + length - 1, {}, seekTail);

    function finish() {
      blocks[0] = blocks[0].slice(startOffset);
      cb(null, Buffer.concat(blocks, length));
    }
  }

  public _writeCheckpoint(cb: (error: Error) => void) {
    // wrapping code taken from HyperDB.prototype.put to ensure our sequence numbers are the same as in the put
    // this is needed because put only lets us know what vector clock it used after it has already submitted the data
    // TODO: submit an issue/pr to hyperdb mentioning this use case and brainstorm a solution to propose
    this.db._lock(release => {
      const unlock = (err: Error | null) => {
        release(cb, err);
      };
      this.db.heads((err: Error | null, heads: any[]) => {
        if (err) {
          return unlock(err);
        }
        if (!this.feed) {
          return;
        }

        const clock = this.db._clock();

        // taken from Writer.prototype.append which is called after the put node is constructed and adjusts local clock
        const writer = this.db._byKey.get(this._dbfeed.key.toString('hex'));
        if (!writer) {
          return;
        }
        const hdbid = writer._id;
        if (!clock[hdbid]) {
          clock[hdbid] = this._dbfeed.length;
        }

        const checkpoint = {
          rootsHash: new Uint8Array(0),
          timestamp: Date.now(),
          length: this.feed.length,
          byteLength: this.feed.byteLength
        };

        util.hashRoots(
          [this.feed].concat(this.db.feeds),
          [checkpoint.length].concat(clock),
          (error2, contentHash) => {
            if (error2) {
              return process.nextTick(cb, error2);
            }

            checkpoint.rootsHash = contentHash;
            hyperdbput(
              this.db,
              clock,
              heads,
              this.path + '/checkpoint.protobuf',
              messages.Checkpoint.encode(checkpoint),
              unlock
            );
          }
        );
      });
    });
  }

  public _decodeCheckpoint(
    node: any,
    cb: (err: Error | null, checkpoint?: any) => void
  ) {
    let checkpoint: messages.Checkpoint;
    try {
      checkpoint = messages.Checkpoint.decode(node.value);
    } catch (e) {
      return cb(e);
    }
    checkpoint.author = util.feedToStreamID(this.db.feeds[node.feed]);

    // TODO: submit an issue / PR to hyperdb to include original raw clocks in node results which are needed for
    //       for comparing root hashes correctly
    // this hack converts the returned clock to the original clock
    const writer = this.db._byKey.get(this._dbfeed.key.toString('hex'));
    if (!writer) {
      return;
    }
    node.clock = writer._mapList(node.clock, writer._encodeMap, null);

    checkpoint._lengths = [checkpoint.length].concat(node.clock);
    --(checkpoint._lengths[node.feed + 1] as any);

    // TODO: submit an issue / PR to hyperdb to allow for retrieving feeds at an arbitrary point in history
    //       which is needed to interpret historic vector clocks.
    //       For now we use InflatedEntry to decode them by hand.
    this.db.feeds[node.feed].get(node.inflate, (err, inflatebuf) => {
      if (err) {
        return cb(err);
      }

      const inflate = hyperdbmessages.InflatedEntry.decode(inflatebuf);
      checkpoint._feeds = [inflate.contentFeed];
      for (let i = 0; i < inflate.feeds.length; ++i) {
        checkpoint._feeds[i + 1] = inflate.feeds[i].key;
      }

      cb(null, checkpoint);
    });
  }
}
