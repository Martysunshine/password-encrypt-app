export interface UnlockGuardConfig {
  maxAttempts: number;
  lockoutMs: number;
}

export interface UnlockGuardState {
  failedAttempts: number;
  lockoutUntil: number | null;
}

export const DEFAULT_UNLOCK_GUARD_CONFIG: UnlockGuardConfig = {
  maxAttempts: 5,
  lockoutMs: 2 * 60 * 1000,
};

export function initialUnlockGuardState(): UnlockGuardState {
  return {
    failedAttempts: 0,
    lockoutUntil: null,
  };
}

export function isLockedOut(state: UnlockGuardState, now: number = Date.now()): boolean {
  return state.lockoutUntil !== null && state.lockoutUntil > now;
}

export function remainingLockoutMs(state: UnlockGuardState, now: number = Date.now()): number {
  if (state.lockoutUntil === null) {
    return 0;
  }
  return Math.max(0, state.lockoutUntil - now);
}

export function registerUnlockFailure(
  state: UnlockGuardState,
  config: UnlockGuardConfig = DEFAULT_UNLOCK_GUARD_CONFIG,
  now: number = Date.now(),
): UnlockGuardState {
  if (isLockedOut(state, now)) {
    return state;
  }

  const nextFailedAttempts = state.failedAttempts + 1;
  if (nextFailedAttempts >= config.maxAttempts) {
    return {
      failedAttempts: 0,
      lockoutUntil: now + config.lockoutMs,
    };
  }

  return {
    failedAttempts: nextFailedAttempts,
    lockoutUntil: null,
  };
}

export function resetUnlockGuard(): UnlockGuardState {
  return initialUnlockGuardState();
}
