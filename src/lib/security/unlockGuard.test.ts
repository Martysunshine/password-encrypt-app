import {
  DEFAULT_UNLOCK_GUARD_CONFIG,
  initialUnlockGuardState,
  isLockedOut,
  registerUnlockFailure,
  remainingLockoutMs,
} from "./unlockGuard";

describe("unlock guard", () => {
  it("locks after max failed attempts", () => {
    const now = 1_000;
    const config = { maxAttempts: 3, lockoutMs: 60_000 };

    let state = initialUnlockGuardState();
    state = registerUnlockFailure(state, config, now);
    state = registerUnlockFailure(state, config, now + 1_000);
    state = registerUnlockFailure(state, config, now + 2_000);

    expect(state.failedAttempts).toBe(0);
    expect(isLockedOut(state, now + 2_001)).toBe(true);
    expect(state.lockoutUntil).toBe(now + 2_000 + config.lockoutMs);
  });

  it("reports remaining lockout time", () => {
    const now = 5_000;
    const state = {
      failedAttempts: 0,
      lockoutUntil: now + 10_000,
    };

    expect(remainingLockoutMs(state, now + 3_000)).toBe(7_000);
    expect(remainingLockoutMs(state, now + 11_000)).toBe(0);
  });

  it("uses secure defaults", () => {
    expect(DEFAULT_UNLOCK_GUARD_CONFIG.maxAttempts).toBe(5);
    expect(DEFAULT_UNLOCK_GUARD_CONFIG.lockoutMs).toBe(120_000);
  });
});
