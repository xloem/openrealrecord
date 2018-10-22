import { EventEmitter } from 'events';
import * as HyperDB from 'hyperdb';
import * as thunky from 'thunky';
import Stream from './stream';
import { feedToStreamID } from './util';

class HyperStream extends EventEmitter {
  public db: HyperDB;
  public localStream: Stream | null;
  public _streamCache: {[name: string]: Stream};
  public ready: Function;
  public id: string;

  constructor(storage: string | Function, key?: Buffer | null, opts: HyperDB.Options = {}) {
    super();
    if (!(this instanceof HyperStream)) {
      return new HyperStream(storage, key, opts);
    }

    if (typeof key === 'object' && !!key && !Buffer.isBuffer(key)) {
      opts = key;
      key = null;
    }

    const options: HyperDB.Options = {contentFeed: true, ...opts};
    this.db = new HyperDB(storage, key, options);
    this.localStream = null;
    this.ready = thunky(this._ready);

    this._streamCache = {};

    this.ready();
  }

  public getStreams = (): string[] => this.db.feeds.map(feedToStreamID);

  public getStream = (id: string, cb: Function): Stream => {
    let stream: Stream | undefined = this._streamCache[id];
    if (!stream) {
      stream = new Stream(this.db, id, cb);
      this._streamCache[id] = stream;
    } else if (cb) {
      process.nextTick(cb, null, stream);
    }

    return stream;
  }

  public write = (data: string, cb: Function): void => {
    if (!this.localStream) { return cb(new Error('not ready')); }
    this.localStream.write(data, cb);
  }

  public createWriteStream = (): any => {
    if (!this.localStream) {
      throw new Error('not ready');
    }

    return this.localStream.createWriteStream();
  }

  public _ready = (cb: Function): any => {
    this.db.ready((err?: Error) => {
      if (err) { return cb(err); }

      this.id = feedToStreamID(this.db.local);
      this.localStream = this.getStream(this.id, cb);
    });
  }
}

export = HyperStream;
