export class Checkpoint {
  public _feeds?: any[];
  public _lengths?: number[];
  public author?: string;
  public byteLength: number;
  public length: number;
  public rootsHash: any;
  public timestamp: number;
  public static encode(checkpoint: any);
  public static decode(message: any): Checkpoint;
}
