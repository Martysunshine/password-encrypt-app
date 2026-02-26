declare module "argon2-browser" {
  export const ArgonType: {
    readonly Argon2d: number;
    readonly Argon2i: number;
    readonly Argon2id: number;
  };

  export interface HashOptions {
    pass: string | Uint8Array;
    salt: string | Uint8Array;
    time: number;
    mem: number;
    hashLen: number;
    parallelism: number;
    type: number;
    raw?: boolean;
  }

  export interface HashResult {
    hash: Uint8Array | string;
    encoded?: string;
    hashHex?: string;
  }

  export function hash(options: HashOptions): Promise<HashResult>;

  const argon2: {
    ArgonType: typeof ArgonType;
    hash: typeof hash;
  };

  export default argon2;
}

declare module "argon2-browser/dist/argon2-bundled.min.js" {
  export * from "argon2-browser";
  import argon2 from "argon2-browser";
  export default argon2;
}
