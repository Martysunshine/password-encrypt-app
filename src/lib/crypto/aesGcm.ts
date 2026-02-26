import { base64UrlToBytes, bytesToBase64Url } from "./base64";

const AES_ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
}

async function importEncryptionKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toBufferSource(keyBytes),
    { name: AES_ALGORITHM },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJson<TPayload extends object>(
  payload: TPayload,
  keyBytes: Uint8Array,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await importEncryptionKey(keyBytes);
  const encoded = textEncoder.encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv: toBufferSource(iv) },
    key,
    toBufferSource(encoded),
  );

  return {
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
  };
}

export async function decryptJson<TResult>(
  payload: EncryptedPayload,
  keyBytes: Uint8Array,
): Promise<TResult> {
  const iv = base64UrlToBytes(payload.iv);
  const ciphertext = base64UrlToBytes(payload.ciphertext);
const key = await importEncryptionKey(keyBytes);
    
  let decrypted: ArrayBuffer;
  try {
    decrypted = await crypto.subtle.decrypt(
      { name: AES_ALGORITHM, iv: toBufferSource(iv) },
      key,
      toBufferSource(ciphertext),
    );
  } catch {
    throw new Error(
      "Decryption failed: the ciphertext authentication tag is invalid. " +
        "The data may have been tampered with or the wrong key was used.",
    );
  }

  const decoded = textDecoder.decode(new Uint8Array(decrypted));
  return JSON.parse(decoded) as TResult;
}
