declare module 'hyperdb' {
  export = HyperDB;

  class HyperDB {
    public _byKey: Map<string, HyperDB.Writer>;
    public feeds: HyperDB.Feed[];
    public key: Buffer;
    public local: HyperDB.Feed;
    public opened: boolean;
    constructor(storage: string | Function, key?: Buffer | null | undefined, opts?: HyperDB.Options);
    public _clock(): any;
    public _lock(cb: (release: (cb: Function, error: Error | null) => void) => void): void;
    public get(key: string, opts?: any, cb?: Function): void;
    public heads(cb: (error: Error, heads: any) => void): void;
    public heads(cb: any): any;
    public history(opts: HyperDB.Options): any;
    public put(key: string, value: string, cb?: HyperDB.dbCallBack): void;
    public ready(cb: (err?: Error) => void): void;
    public watch(key: string, onchange: Function): void;
  }

  namespace HyperDB {
    interface Options {
      checkout?: any;
      contentFeed?: boolean;
      firstNode?: boolean;
      map?(node: any): any;
      reduce?(a: any, b: any): any;
      valueEncoding?: 'binary';
    }

    interface Writer {
      _contentFeed: Feed;
      _db: HyperDB;
      _encodeMap: any;
      _feed: Feed;
      _id: number;
      _mapList: any;
      head: any;
    }
    interface Feed {
      byteLength: number;
      key: any;
      length: number;
      once: any;
      append(data: string, cb: Function): void;
      get(index: number, optionsOrCb: { valueEncoding?: string } | feedGetCb, cb?: feedGetCb): void;
      rootHashes(length: number, cb: Function): void;
      seek(loc: number, options: { hash?: boolean }, cb: Function): void;
    }

    interface Metadata {
      media: string;
      name: string;
      owner: string;
      source: string;
    }

    interface Root {
      hash: any;
      size: number;
    }

    type dbCallBack = (error: Error, nodes: any) => void;
    type feedGetCb = (error: Error, data: any) => void;
  }
}
