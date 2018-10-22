import * as bulk from 'bulk-write-stream';
import { EventEmitter } from 'events';
import * as HyperDB from 'hyperdb';
import * as hyperdbmessages from 'hyperdb/lib/messages';
import * as hyperdbput from 'hyperdb/lib/put';
import {Checkpoint} from './messages';
import { feedToStreamID, hashRoots, keyToFeeds, streamIDToFeedKey } from './util';

export default class Stream extends EventEmitter {
  public db: HyperDB;
  public id: string;
  public path: string;
  public feed: HyperDB.Feed | null;
  public metadata: HyperDB.Metadata | null;
  public _dbfeed: any;
  public _checkpointwatcher: any;

  constructor(db: HyperDB, id: string, cb: Function) {
    super();
    this.db = db;
    this.id = id;
    this.path = `streams/${id}`;
    this.feed = null;
    this._dbfeed = null;
    this.metadata = null;

    if (!this.db.opened) { throw new Error('not ready'); }
    const feedKey: Buffer = streamIDToFeedKey(id);

    const onfeeds: Function = (err: Error | null, dbfeed: any, contentfeed: HyperDB.Feed): void => {
      if (err) { return cb(err); }
      this._dbfeed = dbfeed;
      this.feed = contentfeed;
      cb(null, this);
    };

    this.getMetadata((err: Error | null, metadata: HyperDB.Metadata | null) => {
      if (err) { return cb(err); }
      this.metadata = metadata;

      // done here because the feeds may be inadvertently loaded in the request for metadata
      keyToFeeds(this.db, feedKey, onfeeds);
    });
  }

  public getMetadata = (cb: (error: Error | null, metadata: HyperDB.Metadata | null) => void): void => {
    // TODO: since hyperdb doesn't have access restrictions yet, ignore updates to this file by others
    // (can catch in fsck too)
    const onstreamjson: Function = (err: Error | null, nodes: any): void => {
      if (err) { return cb(err, null); }

      if (nodes.length > 1) { return cb(new Error('metadata conflict'), null); }

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
    };
    this.db.get(`${this.path}'/stream.json`, onstreamjson);
  }

  public validateMetadata = (metadata: HyperDB.Metadata, cb: Function): void  => {
    if (!metadata.name || metadata.name === this.id) {
      return cb(new Error('stream has no name'));
    }

    if (this.metadata!.media === 'application/x.hyper-protobuf' && metadata.media !== this.metadata!.media && this.feed!.length > 0) {
      return cb(new Error('cannot change special media type'));
    }

    keyToFeeds(this.db, streamIDToFeedKey(metadata.owner), (err: Error | null) => {
      if (err) { return cb(new Error(`can't find owner feed: ${err.message}`)); }
      cb(null);
    });
  }

  public setMetadata = (metadata: HyperDB.Metadata, cb: Function): void => {
    this.validateMetadata(metadata, (err: Error | null) => {
      if (err) { return cb(err); }
      this.db.put(`${this.path}/stream.json`, JSON.stringify(metadata), (error: Error | null, node: any) => {
        if (error) { return cb(error); }
        this.metadata = JSON.parse(node.value.toString());
        cb(null, this.metadata);
      });
    });
  }

  public listen = (): void => {
    if (this._checkpointwatcher) { throw new Error('already listening'); }

    const seqs: any[] = [];

    const emit: Function = (err: (Error | null), checkpoint?: any): boolean | undefined => {
      if (err) { return this.emit('error', err); }
      this.emit('checkpoint', checkpoint);
    };

    const initialize: Function = (err: (Error | null), checkpoints: any[]): boolean | undefined => {
      if (err) { return emit(err); }
      checkpoints.forEach((cp: any) => seqs[cp.feed] = cp.seq);
    };

    this.db.get(`${this.path}/checkpoint.protobuf`, initialize);

    const onCheckPoint: Function = (err: (Error | null), checkpoints: any[]): boolean | undefined => {
      if (err) { return emit(err); }
      if (checkpoints.length === 0) { emit(null, null); }

      checkpoints.forEach((cp: any) => {
        const feed: number = cp.feed;
        const last: any = seqs[feed];
        const cur: any = cp.seq;
        if (!last || last !== cur) {
          seqs[feed] = cur;
          this._decodeCheckpoint(cp, emit);
        }
      });
    };

    const onWatchCheckpoint: Function = (): any => this.db.get(`${this.path}/checkpoint.protobuf`, onCheckPoint);
    this._checkpointwatcher = this.db.watch(`${this.path}/checkpoint.protobuf`, onWatchCheckpoint);
  }

  public listening = (): boolean => !!this._checkpointwatcher;

  public ignore = (): void => {
    if (!this._checkpointwatcher) { throw new Error('not listening'); }
    this._checkpointwatcher.destroy();
    this._checkpointwatcher = null;
  }

  public checkpoints = (opts: HyperDB.Options): any => {
    const it: any = this.db.history(opts);
    const _next: any = it._next;
    const next: Function = (cb: Function): void => {
      _next.call(it, (err: (Error | null), val: any) => {
        if (err) { return cb(err); }
        if (!val) { return cb(null, null); }
        if (val.key !== `${this.path}/checkpoint.protobuf`) { return next.call(it, cb); }
        this._decodeCheckpoint(val, cb);
      });
    };

    it._next = next;

    return it;
  }

  public verify = (checkpoint: any, cb: Function): void => {
    if (checkpoint.author !== this.id) { return cb(new Error('incorrect author')); }
    if (Buffer.compare(checkpoint._feeds[0], this.feed!.key)) { return cb(new Error('incorrect feed')); }
    const feeds: HyperDB.Feed[] = [this.feed!];
    let feedsGotten: number = 0;

    const doHash: Function = (): void => {
      hashRoots(feeds, checkpoint._lengths, (err: (Error | null), hash: any, byteLengths: any) => {
        if (err) { return cb(err); }
        if (byteLengths[0] !== checkpoint.byteLength) { return cb(new Error('incorrect byteLength')); }
        if (Buffer.compare(checkpoint.rootsHash, hash)) { return cb(new Error('hash failure')); }
        cb(null, true);
      });
    };

    const seeked: Function = (err: (Error | null)): void => {
      if (err) { return cb(err); }
      ++feedsGotten;
      if (feedsGotten === checkpoint._feeds.length) { doHash(); }
    };

    // seek to spot to make sure root hashes are loaded
    this.feed!.seek(checkpoint.byteLength - 1, { hash: true }, seeked);

    const addFeed: Function = (index: number): void => {
      keyToFeeds(this.db, checkpoint._feeds[index], (err: (Error | null), feed: HyperDB.Feed) => {
        if (err) { return cb(err); }
        feeds[index] = feed;
        ++feedsGotten;
        if (feedsGotten === checkpoint._feeds.length) { doHash(); }
      });
    };
    for (let i: number = 1; i < checkpoint._feeds.length; ++i) {
      addFeed(i);
    }
  }

  public findValidCheckpoint = (opts: HyperDB.Options, cb: Function, invalidCb?: Function): any => {
    const checkpoints: any = this.checkpoints(opts);
    const seekValid: Function = (err: (Error | null), checkpoint: any): any => {
      if (err) {
        if (invalidCb) { invalidCb(err); }

        return checkpoints.next(seekValid);
      }

      if (checkpoint === null) { return cb(); }

      this.verify(checkpoint, (error: (Error | null)): any => {
        if (error) {
          if (invalidCb) { invalidCb(error, checkpoint); }

          return checkpoints.next(seekValid);
        } else {
          return cb(null, checkpoint);
        }
      });
    };

    checkpoints.next(seekValid);
  }

  public createWriteStream = (): any => {
    const write: Function = (batch: any, cb: Function): void => {
      this.feed!.append(batch, (err: (Error | null)) => {
        // nextTick is used because if an error is thrown here, the hypercore batcher will crash
        if (err) { return process.nextTick(cb, err); }
        this._writeCheckpoint(cb);
      });
    };

    return bulk.obj(write);
  }

  public write = (data: any, cb: Function): void => {
    this.feed!.append(data, (err: (Error | null)) => {
      // nextTick is used because if an error is thrown here, the hypercore batcher will crash
      if (err) { return process.nextTick(cb, err); }
      this._writeCheckpoint(cb);
    });
  }

  public read = (start: number, length: number, opts: HyperDB.Options, cb: Function): void => {
    // TODO: find a checkpoint that covers this data and verify it

    if (!start) { start = 0; }
    if (!length) { length = this.feed!.byteLength - start; }
    if (!opts) { opts = {}; }
    opts.valueEncoding = 'binary';

    let startIndex: number = -1;
    let startOffset: number;
    let tailIndex: number = -1;
    const blocks: any[] = [];
    let totalBlocks: number;
    let completedBlocks: number = 0;

    const finish: Function = (): void => {
      blocks[0] = blocks[0].slice(startOffset);
      cb(null, Buffer.concat(blocks, length));
    };

    const getOne: Function = (index: number): void => {
      this.feed!.get(index, opts, (err: Error, data: any) => {
        if (err) { return cb(err); }
        blocks[index - startIndex] = data;
        ++completedBlocks;
        if (totalBlocks === completedBlocks) { finish(); }
      });
    };

    const seekDone: Function = (): void => {
      totalBlocks = tailIndex - startIndex + 1;
      for (let i: number = startIndex; i <= tailIndex; ++i) {
        getOne(i);
      }
    };

    const seekStart: Function = (err: Error, index: number, offset: number): void => {
      if (err) { return cb(err); }
      startIndex = index;
      startOffset = offset;
      if (tailIndex >= 0) { seekDone(); }
    };
    this.feed!.seek(start, {}, seekStart);

    const seekTail: Function = (err: Error, index: number, offset: number): void => {
      if (err) { return cb(err); }
      tailIndex = index;
      if (startIndex >= 0) { seekDone(); }
    };
    this.feed!.seek(start + length - 1, {}, seekTail);
  }

  public _writeCheckpoint = (cb: Function): void => {
    // wrapping code taken from HyperDB.prototype.put to ensure our sequence numbers are the same as in the put
    // this is needed because put only lets us know what vector clock it used after it has already submitted the data
    // TODO: submit an issue/pr to hyperdb mentioning this use case and brainstorm a solution to propose
    this.db._lock((release: Function) => {
      const unlock: (err: Error) => void = (err: Error): void => {
        release(cb, err);
      };

      this.db.heads((err: (Error | null), heads: any) => {
        if (err) { return unlock(err); }

        const clock: any = this.db._clock();

        // taken from Writer.prototype.append which is called after the put node is constructed and adjusts local clock
        const hdbid: number = this.db._byKey.get(this._dbfeed.key.toString('hex'))!._id;
        if (!clock[hdbid]) { clock[hdbid] = this._dbfeed.length; }

        const checkpoint: Checkpoint = {
          rootsHash: null,
          timestamp: Date.now(),
          length: this.feed!.length,
          byteLength: this.feed!.byteLength
        };

        hashRoots([this.feed].concat(this.db.feeds), [checkpoint.length].concat(clock), (error: (Error | null), contentHash: any) => {
          if (error) { return process.nextTick(cb, error); }

          checkpoint.rootsHash = contentHash;
          hyperdbput(this.db, clock, heads, `${this.path}/checkpoint.protobuf`, Checkpoint.encode(checkpoint), unlock);
        });
      });
    });
  }

  public _decodeCheckpoint = (node: any, cb: Function): void => {
    let checkpoint: Checkpoint;
    try {
      checkpoint = Checkpoint.decode(node.value);
    } catch (e) {
      return cb(e);
    }
    checkpoint.author = feedToStreamID(this.db.feeds[node.feed]);

    // TODO: submit an issue / PR to hyperdb to include original raw clocks in node results which are needed for
    //       for comparing root hashes correctly
    // this hack converts the returned clock to the original clock
    const writer: HyperDB.Writer | undefined = this.db._byKey.get(this._dbfeed.key.toString('hex'));
    if (!writer) { return cb(new Error('object not found')); }
    node.clock = writer._mapList(node.clock, writer._encodeMap, null);

    checkpoint._lengths = [checkpoint.length].concat(node.clock);
    --checkpoint._lengths[<number>node.feed + 1];

    // TODO: submit an issue / PR to hyperdb to allow for retrieving feeds at an arbitrary point in history
    //       which is needed to interpret historic vector clocks.
    //       For now we use InflatedEntry to decode them by hand.
    this.db.feeds[node.feed].get(node.inflate, (err: (Error | null), inflatebuf: any) => {
      if (err) { return cb(err); }

      const inflate: any = hyperdbmessages.InflatedEntry.decode(inflatebuf);
      checkpoint._feeds = [inflate.contentFeed];
      for (let i: number = 0; i < inflate.feeds.length; ++i) {
        checkpoint._feeds[i + 1] = inflate.feeds[i].key;
      }

      cb(null, checkpoint);
    });
  }
}
