import type { EncryptedVaultSecret } from "./crypto/vaultCrypto";
import type { VaultItemInput } from "./types";

export const MAX_FIELD_LENGTHS = {
  title: 200,
  url: 2048,
  folder: 100,
  tags: 500,
  username: 200,
  password: 1000,
  notes: 10_000,
} as const;

/**
 * Returns true if the URL is empty (optional field) or uses http/https scheme only.
 * Rejects javascript:, data:, and other potentially unsafe schemes.
 */
export function isSafeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

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
