// tslint:disable:no-any
// tslint:disable:class-name
declare module 'hyperdb' {
  export = HyperDB;

  class HyperDB {

    public key: Buffer;
    public discoveryKey: Buffer;
    public local: HyperDB.Feed;
    public feeds: HyperDB.Feed[];
    public opened: boolean;
    public _byKey: Map<string, HyperDB.Writer>;
    constructor(storage: string | Function);
    constructor(storage: string | Function, opts: HyperDB.Options);
    constructor(
      storage: string | Function,
      key: Buffer | null | undefined,
      opts: HyperDB.Options
    );

    public authorize(key: any, cb: any): any;

    public authorized(key: any, cb: any): any;

    public batch(batch: any, cb: any): any;

    public checkout(version: any, opts: any): any;

    public createDiffStream(other: any, prefix: any, opts: any): any;

    public createHistoryStream(opts: any): any;

    public createReadStream(prefix: any, opts: any): any;

    public createWriteStream(cb: any): any;

    public del(key: any, cb: any): void;

    public diff(other: any, prefix: any, opts: any): any;

    public get(key: any, opts: any, cb: any): any;

    public heads(cb: any): any;

    public history(opts: HyperDB.Options): any;

    public iterator(prefix: any, opts: any): any;

    public list(prefix: any, opts: any, cb: any): any;

    public replicate(opts: any): any;

    public snapshot(opts: any): any;
    public put(key: string, value: string, cb?: HyperDB.dbCallBack): void;
    public get(key: string, opts?: any, cb?: Function): void;
    public del(key: string, cb: HyperDB.dbCallBack): void;
    public authorize(key: string, cb: () => void): void;
    public authorized(key: string, cb: (err: string, auth: boolean) => void): void;
    public watch(key: string, onchange: Function): void;
    public createReadStream(
      prefix: string,
      options?: { recursive: boolean; reverse: boolean; gt: boolean }
    ): void;
    public ready(cb: (err?: Error) => void): void;
    public history(options: { reverse: boolean }): History;
    public _lock(
      cb: (
        release: (cb: Function, error: Error | null) => void
      ) => void
    ): void;
    public heads(cb: (error: Error, heads: any) => void): void;
    public _clock(): any;
  }

  namespace HyperDB {
    interface Options {
      firstNode?: boolean; // set to true to reduce the nodes array to the first node in it
      valueEncoding?: 'binary'; // set the value encoding of the db
      contentFeed?: boolean;
      checkout?: any;
      map?(node: any): any; // map nodes before returning them
      reduce?(a: any, b: any): any; // reduce the nodes array before returning it
    }

    interface Writer {
      _id: number;
      _db: HyperDB;
      _feed: Feed;
      _contentFeed: Feed;
      head: any;
      _mapList: any;
      _encodeMap: any;
    }
    interface Feed {
      key: any;
      length: number;
      byteLength: number;
      once: any;
      seek(loc: number, options: { hash?: boolean }, cb: Function): void;
      append(data: string, cb: Function): void;
      get(index: number, optionsOrCb: { valueEncoding?: string } | feedGetCb, cb?: feedGetCb): void;
      rootHashes(length: number, cb: Function): void;
    }

    interface Metadata {
      name: string;
      owner: string;
      media: string;
      source: string;
    }

    interface Checkpoint {
      feed: number;
      seq: any;
    }

    interface Root {
      hash: any;
      size: number;
    }

    type dbCallBack = (error: Error, nodes: any) => void;
    type feedGetCb = (error: Error, data: any) => void;
  }
}
