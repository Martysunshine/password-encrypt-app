export function wipeBytes(buffer: Uint8Array | null): void {
  if (buffer === null) {
    return;
  }
  buffer.fill(0);
}

export function cloneBytes(buffer: Uint8Array): Uint8Array {
  return new Uint8Array(buffer);
}
