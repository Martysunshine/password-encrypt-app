import type { VaultSecret } from "../types";
import { decryptJson, encryptJson } from "./aesGcm";

export interface EncryptedVaultSecret {
  iv: string;
  ciphertext: string;
}

export async function encryptVaultSecret(
  secret: VaultSecret,
  keyBytes: Uint8Array,
): Promise<EncryptedVaultSecret> {
  return encryptJson(secret, keyBytes);
}

export async function decryptVaultSecret(
  payload: EncryptedVaultSecret,
  keyBytes: Uint8Array,
): Promise<VaultSecret> {
  return decryptJson<VaultSecret>(payload, keyBytes);
}
