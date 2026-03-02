import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { DEFAULT_KDF_PARAMS } from "../lib/crypto/argon2";
import { base64UrlToBytes } from "../lib/crypto/base64";
import {
  deriveMasterKeys,
  deriveMasterVerifier,
  generateSaltBase64,
  parseSalt,
} from "../lib/crypto/keys";
import { cloneBytes, wipeBytes } from "../lib/crypto/memory";
import { supabase } from "../lib/supabase";
import { constantTimeEqual } from "../lib/security/compare";
import {
  initialUnlockGuardState,
  isLockedOut,
  registerUnlockFailure,
  remainingLockoutMs,
  resetUnlockGuard,
  type UnlockGuardState,
} from "../lib/security/unlockGuard";
import type { KdfParams, ProfileRow } from "../lib/types";
import { useAuth } from "./useAuth";

const DEFAULT_AUTO_LOCK_MINUTES = 5;
const MIN_AUTO_LOCK_MINUTES = 1;
const MAX_AUTO_LOCK_MINUTES = 60;

function validateKdfParams(params: KdfParams): void {
  if (
    typeof params.memoryCost !== "number" ||
    params.memoryCost < 8_192 ||
    params.memoryCost > 524_288
  ) {
    throw new Error("KDF memory cost is out of the allowed range.");
  }
  if (
    typeof params.timeCost !== "number" ||
    params.timeCost < 1 ||
    params.timeCost > 10
  ) {
    throw new Error("KDF time cost is out of the allowed range.");
  }
  if (params.hashLength !== 64) {
    throw new Error("KDF hash length must be 64.");
  }
}

interface UnlockContextValue {
  profile: ProfileRow | null;
  isProfileLoading: boolean;
  isUnlocked: boolean;
  failedAttempts: number;
  remainingLockoutMs: number;
  autoLockMinutes: number;
  setAutoLockMinutes: (minutes: number) => void;
  refreshProfile: () => Promise<void>;
  setupMasterPassword: (masterPassword: string) => Promise<void>;
  unlock: (masterPassword: string) => Promise<boolean>;
  lock: () => void;
  withEncryptionKey: <T>(handler: (keyBytes: Uint8Array) => Promise<T>) => Promise<T>;
}

const UnlockContext = createContext<UnlockContextValue | undefined>(undefined);

function normalizeKdfParams(value: KdfParams): KdfParams {
  return {
    memoryCost: value.memoryCost,
    timeCost: value.timeCost,
    parallelism: value.parallelism,
    hashLength: value.hashLength,
  };
}

export function UnlockProvider({ children }: PropsWithChildren): JSX.Element {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [guardState, setGuardState] = useState<UnlockGuardState>(initialUnlockGuardState());
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [autoLockMinutes, setAutoLockMinutesState] = useState(DEFAULT_AUTO_LOCK_MINUTES);

  const keyRef = useRef<Uint8Array | null>(null);
  const autoLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoLockTimer = useCallback(() => {
    if (autoLockTimeoutRef.current !== null) {
      clearTimeout(autoLockTimeoutRef.current);
      autoLockTimeoutRef.current = null;
    }
  }, []);

  const replaceKey = useCallback((nextKey: Uint8Array | null) => {
    if (keyRef.current !== null) {
      wipeBytes(keyRef.current);
    }
    keyRef.current = nextKey;
  }, []);

  const lock = useCallback(() => {
    clearAutoLockTimer();
    replaceKey(null);
    setIsUnlocked(false);
  }, [clearAutoLockTimer, replaceKey]);

  const scheduleAutoLock = useCallback(() => {
    if (!isUnlocked) {
      return;
    }

    clearAutoLockTimer();
    autoLockTimeoutRef.current = setTimeout(() => {
      lock();
    }, autoLockMinutes * 60 * 1000);
  }, [autoLockMinutes, clearAutoLockTimer, isUnlocked, lock]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || user === null) {
      setProfile(null);
      setIsProfileLoading(false);
      setGuardState(resetUnlockGuard());
      lock();
      return;
    }

    setIsProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id,kdf_salt,kdf_params,master_verifier,created_at,kdf_alg")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error !== null) {
      setIsProfileLoading(false);
      throw new Error(error.message);
    }

    setProfile(data);
    setIsProfileLoading(false);
  }, [isAuthenticated, lock, user]);

  useEffect(() => {
    let isMounted = true;

    const run = async (): Promise<void> => {
      try {
        await refreshProfile();
      } catch {
        if (isMounted) {
          setProfile(null);
          setIsProfileLoading(false);
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [refreshProfile]);

  useEffect(() => {
    if (!isUnlocked) {
      return;
    }

    scheduleAutoLock();

    const handleActivity = (): void => {
      scheduleAutoLock();
    };

    const events: ReadonlyArray<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    const visibilityListener = (): void => {
      if (document.visibilityState === "visible") {
        scheduleAutoLock();
      }
    };

    document.addEventListener("visibilitychange", visibilityListener);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener("visibilitychange", visibilityListener);
    };
  }, [isUnlocked, scheduleAutoLock]);

  useEffect(() => {
    if (!isLockedOut(guardState, Date.now())) {
      return;
    }

    const intervalId = setInterval(() => {
      setClockNow(Date.now());
    }, 1_000);

    return () => {
      clearInterval(intervalId);
    };
  }, [guardState]);

  useEffect(() => {
    if (!isAuthenticated) {
      lock();
      setGuardState(resetUnlockGuard());
    }
  }, [isAuthenticated, lock]);

  useEffect(() => {
    return () => {
      clearAutoLockTimer();
      replaceKey(null);
    };
  }, [clearAutoLockTimer, replaceKey]);

  const setupMasterPassword = useCallback(
    async (masterPassword: string): Promise<void> => {
      if (user === null) {
        throw new Error("User session is missing.");
      }
      if (profile !== null) {
        throw new Error("Master password is already configured.");
      }

      const params = normalizeKdfParams(DEFAULT_KDF_PARAMS);
      const saltBase64 = generateSaltBase64();
      const salt = parseSalt(saltBase64);
      const { encryptionKey, verifierKey } = await deriveMasterKeys(masterPassword, salt, params);

      try {
        const masterVerifier = await deriveMasterVerifier(verifierKey);
        const { data, error } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            kdf_salt: saltBase64,
            kdf_params: params,
            master_verifier: masterVerifier,
            kdf_alg: "argon2id",
          })
          .select("user_id,kdf_salt,kdf_params,master_verifier,created_at,kdf_alg")
          .single();

        if (error !== null) {
          throw new Error(error.message);
        }
        if (data === null) {
          throw new Error("Failed to load profile after setup.");
        }

        setProfile(data);
        setGuardState(resetUnlockGuard());
        replaceKey(encryptionKey);
        setIsUnlocked(true);
      } catch (error) {
        wipeBytes(encryptionKey);
        throw error;
      } finally {
        wipeBytes(verifierKey);
        wipeBytes(salt);
      }
    },
    [profile, replaceKey, user],
  );

  const unlock = useCallback(
    async (masterPassword: string): Promise<boolean> => {
      if (profile === null) {
        throw new Error("Master password profile is not set.");
      }

      const now = Date.now();
      setClockNow(now);
      if (isLockedOut(guardState, now)) {
        return false;
      }

      const salt = parseSalt(profile.kdf_salt);
      validateKdfParams(profile.kdf_params);
      const { encryptionKey, verifierKey } = await deriveMasterKeys(
        masterPassword,
        salt,
        profile.kdf_params,
      );

      const computedVerifier = await deriveMasterVerifier(verifierKey);
      const computedVerifierBytes = base64UrlToBytes(computedVerifier);
      const storedVerifierBytes = base64UrlToBytes(profile.master_verifier);
      const isValid = constantTimeEqual(computedVerifierBytes, storedVerifierBytes);

      wipeBytes(computedVerifierBytes);
      wipeBytes(storedVerifierBytes);
      wipeBytes(verifierKey);
      wipeBytes(salt);

      if (!isValid) {
        wipeBytes(encryptionKey);
        setGuardState((currentState) => registerUnlockFailure(currentState));
        return false;
      }

      setGuardState(resetUnlockGuard());
      replaceKey(encryptionKey);
      setIsUnlocked(true);
      return true;
    },
    [guardState, profile, replaceKey],
  );

  const setAutoLockMinutes = useCallback((minutes: number): void => {
    const normalizedMinutes = Math.min(
      Math.max(Math.round(minutes), MIN_AUTO_LOCK_MINUTES),
      MAX_AUTO_LOCK_MINUTES,
    );
    setAutoLockMinutesState(normalizedMinutes);
  }, []);

  const withEncryptionKey = useCallback(
    async <T,>(handler: (keyBytes: Uint8Array) => Promise<T>): Promise<T> => {
      if (!isUnlocked || keyRef.current === null) {
        throw new Error("Vault is locked.");
      }

      const ephemeralKey = cloneBytes(keyRef.current);
      try {
        return await handler(ephemeralKey);
      } finally {
        wipeBytes(ephemeralKey);
      }
    },
    [isUnlocked],
  );

  const contextValue = useMemo<UnlockContextValue>(
    () => ({
      profile,
      isProfileLoading,
      isUnlocked,
      failedAttempts: guardState.failedAttempts,
      remainingLockoutMs: remainingLockoutMs(guardState, clockNow),
      autoLockMinutes,
      setAutoLockMinutes,
      refreshProfile,
      setupMasterPassword,
      unlock,
      lock,
      withEncryptionKey,
    }),
    [
      autoLockMinutes,
      clockNow,
      guardState,
      isProfileLoading,
      isUnlocked,
      lock,
      profile,
      refreshProfile,
      setAutoLockMinutes,
      setupMasterPassword,
      unlock,
      withEncryptionKey,
    ],
  );

  return <UnlockContext.Provider value={contextValue}>{children}</UnlockContext.Provider>;
}

export function useUnlock(): UnlockContextValue {
  const context = useContext(UnlockContext);
  if (context === undefined) {
    throw new Error("useUnlock must be used within an UnlockProvider.");
  }

  return context;
}
