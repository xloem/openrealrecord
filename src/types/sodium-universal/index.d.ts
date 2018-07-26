declare module "sodium-universal" {
  export function crypto_generichash_instance(key?: number): GenericHash;

  interface GenericHash {
    update(input: Buffer): void;
    final(output: Buffer): void;
  }
}
