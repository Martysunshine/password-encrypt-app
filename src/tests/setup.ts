if (typeof globalThis.crypto === "undefined" && typeof window !== "undefined" && window.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: window.crypto,
    writable: false,
  });
}
