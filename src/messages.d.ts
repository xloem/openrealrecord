export class Checkpoint {
  buffer: Buffer;
  encodingLength: number;

  byteLength: number;
  rootsHash: Buffer;
  author?: string;
  _lengths?: number[];
  _feeds?: Buffer[];
  length: number;
  static encode(checkpoint: any): Buffer;
  static decode(message: any): Checkpoint;
}
