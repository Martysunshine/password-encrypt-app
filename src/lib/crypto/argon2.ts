import argon2 from "argon2-browser/dist/argon2-bundled.min.js";

import type { KdfParams } from "../types";

export const DEFAULT_KDF_PARAMS: KdfParams = {
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 1,
  hashLength: 64,
};

export async function deriveArgon2id(
  masterPassword: string,
  salt: Uint8Array,
  params: KdfParams,
): Promise<Uint8Array> {
  const result = await argon2.hash({
    pass: masterPassword,
    salt,
    time: params.timeCost,
    mem: params.memoryCost,
    hashLen: params.hashLength,
    parallelism: params.parallelism,
    type: argon2.ArgonType.Argon2id,
    raw: true,
  });

  if (typeof result.hash === "string") {
    throw new Error("Argon2id returned a non-binary hash.");
  }

  return new Uint8Array(result.hash);
}
