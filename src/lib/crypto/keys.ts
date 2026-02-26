import { deriveArgon2id } from "./argon2";
import { bytesToBase64Url, base64UrlToBytes } from "./base64";
import { sha256 } from "./hash";
import { wipeBytes } from "./memory";
import type { KdfParams } from "../types";

const KEY_BYTES = 32;
const SALT_BYTES = 16;
const VERIFIER_CONTEXT = new TextEncoder().encode("password-encrypt-app:master-verifier:v1");

export interface DerivedMasterKeys {
  encryptionKey: Uint8Array;
  verifierKey: Uint8Array;
}

export function generateSaltBase64(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return bytesToBase64Url(salt);
}

export function parseSalt(saltBase64: string): Uint8Array {
  return base64UrlToBytes(saltBase64);
}

export async function deriveMasterKeys(
  masterPassword: string,
  salt: Uint8Array,
  params: KdfParams,
): Promise<DerivedMasterKeys> {
  const material = await deriveArgon2id(masterPassword, salt, params);

  if (material.length < KEY_BYTES * 2) {
    wipeBytes(material);
    throw new Error("KDF output is too short for key splitting.");
  }

  const encryptionKey = material.slice(0, KEY_BYTES);
  const verifierKey = material.slice(KEY_BYTES, KEY_BYTES * 2);
  wipeBytes(material);

  return { encryptionKey, verifierKey };
}

export async function deriveMasterVerifier(verifierKey: Uint8Array): Promise<string> {
  const input = new Uint8Array(verifierKey.length + VERIFIER_CONTEXT.length);
  input.set(verifierKey, 0);
  input.set(VERIFIER_CONTEXT, verifierKey.length);
  const digest = await sha256(input);
  wipeBytes(input);
  return bytesToBase64Url(digest);
}
