interface History {
  _next(cb: any): void;
  next(cb: (error: string, checkpoint: History) => void): void;
}

interface Version {}

interface Batch {
  type: 'put' | 'get' | 'del';
  key: string;
  value: string;
}

declare module 'bulk-write-stream';
declare module 'hyperdb/lib/put';
declare module 'hyperdb/lib/messages';
declare module 'messages';
declare module 'random-access-memory';
