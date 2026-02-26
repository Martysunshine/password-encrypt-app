import { encryptVaultSecret, decryptVaultSecret } from "./vaultCrypto";
import type { VaultSecret } from "../types";

describe("vault crypto", () => {
  it("encrypts and decrypts a vault secret", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const secret: VaultSecret = {
      username: "alice@example.com",
      password: "P@ssw0rd!super-secret",
      notes: "note",
      customFields: [{ label: "otp", value: "123456" }],
    };

    const encrypted = await encryptVaultSecret(secret, keyBytes);
    expect(encrypted.ciphertext).not.toContain(secret.password);

    const decrypted = await decryptVaultSecret(encrypted, keyBytes);
    expect(decrypted).toEqual(secret);
  });

  it("fails decryption with the wrong key", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const wrongKey = crypto.getRandomValues(new Uint8Array(32));
    const secret: VaultSecret = {
      username: "bob",
      password: "X!2bob-password",
      notes: "",
      customFields: [],
    };

    const encrypted = await encryptVaultSecret(secret, keyBytes);
    await expect(decryptVaultSecret(encrypted, wrongKey)).rejects.toThrow();
  });
});
