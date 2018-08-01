import * as HyperDB from 'hyperdb';
import * as thunky from 'thunky';
import { EventEmitter } from 'events';
import * as util from './util';
import { Stream } from './stream';

export default class HyperStream extends EventEmitter {
  public db: HyperDB;
  public localStream: Stream;
  public ready: (cb?: (error: Error) => void) => boolean;
  public id: string;
  private _streamCache: { [key: string]: Stream };

  constructor(
    storage: string | Function,
    key?: Buffer | null,
    opts?: HyperDB.options
  ) {
    super();
    if (!(this instanceof HyperStream)) {
      return new HyperStream(storage, key, opts);
    }

    if (typeof key === 'object' && !!key && !Buffer.isBuffer(key)) {
      opts = key;
      key = null;
    }

    if (!opts) {
      opts = {};
    }
    if (!opts.contentFeed) {
      opts.contentFeed = true;
    }

    this.db = new HyperDB(storage, key, opts);

    this.ready = thunky(this._ready.bind(this));

    this._streamCache = {};

    this.ready();
  }

  public getStreams() {
    const ret: string[] = [];
    for (let i = 0; i < this.db.feeds.length; ++i) {
      ret[i] = util.feedToStreamID(this.db.feeds[i]);
    }
    return ret;
  }

  public getStream(id: string, cb?: (error: Error) => void) {
    let stream = this._streamCache[id];
    if (!stream) {
      this._streamCache[id] = new Stream(this.db, id, cb);
      stream = this._streamCache[id];
    } else if (cb) {
      process.nextTick(cb, null, stream);
    }
    return stream;
  }

  public write(data: string, cb: (error: Error) => void) {
    if (!this.localStream) {
      return cb(new Error('not ready'));
    }
    this.localStream.write(data, cb);
  }

  public createWriteStream() {
    if (!this.localStream) {
      throw new Error('not ready');
    }
    return this.localStream.createWriteStream();
  }

  private _ready(cb: (error: Error) => void) {
    this.db.ready(err => {
      if (err) {
        return cb(err);
      }
      this.id = util.feedToStreamID(this.db.local);
      this.localStream = this.getStream(this.id, cb);
    });
  }
}
