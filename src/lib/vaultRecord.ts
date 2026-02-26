import type { EncryptedVaultSecret } from "./crypto/vaultCrypto";
import type { VaultItemInput } from "./types";

function normalizeText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTags(tags: string[]): string[] {
  const unique = new Set<string>();
  tags.forEach((tag) => {
    const clean = tag.trim();
    if (clean.length > 0) {
      unique.add(clean);
    }
  });
  return [...unique];
}

export interface VaultInsertRecord {
  user_id: string;
  title: string;
  url: string | null;
  folder: string | null;
  tags: string[];
  favorite: boolean;
  iv: string;
  ciphertext: string;
}

export interface VaultUpdateRecord {
  title: string;
  url: string | null;
  folder: string | null;
  tags: string[];
  favorite: boolean;
  iv: string;
  ciphertext: string;
  updated_at: string;
}

export function buildVaultInsertRecord(
  userId: string,
  input: VaultItemInput,
  encrypted: EncryptedVaultSecret,
): VaultInsertRecord {
  return {
    user_id: userId,
    title: input.title.trim(),
    url: normalizeText(input.url),
    folder: normalizeText(input.folder),
    tags: normalizeTags(input.tags),
    favorite: input.favorite,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
  };
}

export function buildVaultUpdateRecord(
  input: VaultItemInput,
  encrypted: EncryptedVaultSecret,
): VaultUpdateRecord {
  return {
    title: input.title.trim(),
    url: normalizeText(input.url),
    folder: normalizeText(input.folder),
    tags: normalizeTags(input.tags),
    favorite: input.favorite,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    updated_at: new Date().toISOString(),
  };
}
