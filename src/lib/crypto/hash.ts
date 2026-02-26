function toBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

export async function sha256(input: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", toBufferSource(input));
  return new Uint8Array(digest);
}
