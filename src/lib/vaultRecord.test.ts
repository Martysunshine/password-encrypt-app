import { buildVaultInsertRecord, buildVaultUpdateRecord } from "./vaultRecord";

describe("vault record builder", () => {
  it("creates insert payload without plaintext secret fields", () => {
    const payload = buildVaultInsertRecord(
      "user-1",
      {
        title: "GitHub",
        url: "https://github.com",
        folder: "Work",
        tags: ["dev", "work"],
        favorite: true,
        secret: {
          username: "alice",
          password: "my-plaintext-password",
          notes: "do not leak",
          customFields: [],
        },
      },
      {
        iv: "base64-iv",
        ciphertext: "base64-ciphertext",
      },
    );

    expect(payload.user_id).toBe("user-1");
    expect(payload.ciphertext).toBe("base64-ciphertext");
    expect(payload.iv).toBe("base64-iv");
    expect(Object.prototype.hasOwnProperty.call(payload, "secret")).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("my-plaintext-password");
  });

  it("creates update payload with encrypted fields only", () => {
    const payload = buildVaultUpdateRecord(
      {
        title: "Bank",
        url: "",
        folder: "Personal",
        tags: ["finance", "important"],
        favorite: false,
        secret: {
          username: "bob",
          password: "top-secret",
          notes: "no plaintext",
          customFields: [],
        },
      },
      {
        iv: "iv",
        ciphertext: "cipher",
      },
    );

    expect(payload.url).toBeNull();
    expect(payload.ciphertext).toBe("cipher");
    expect(Object.prototype.hasOwnProperty.call(payload, "secret")).toBe(false);
  });
});
