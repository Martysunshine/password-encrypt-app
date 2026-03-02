function ensureBase64Functions(): void {
  if (typeof btoa !== "function" || typeof atob !== "function") {
    throw new Error("Base64 encoding is unavailable in this runtime.");
  }
}

export function bytesToBase64(input: Uint8Array): string {
  ensureBase64Functions();
  let binary = "";
  input.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function base64ToBytes(input: string): Uint8Array {
  ensureBase64Functions();
  let binary: string;
  try {
    binary = atob(input);
  } catch {
    throw new Error("Invalid base64 encoding.");
  }
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }
  return output;
}

export function bytesToBase64Url(input: Uint8Array): string {
  return bytesToBase64(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(paddingLength);
  return base64ToBytes(padded);
}
