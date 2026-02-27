import { FormEvent, useMemo, useState } from "react";

import { useAuth } from "../hooks/useAuth";
import { useUnlock } from "../hooks/useUnlock";

export function LockScreen(): JSX.Element {
  const { signOut } = useAuth();
  const {
    profile,
    setupMasterPassword,
    unlock,
    failedAttempts,
    remainingLockoutMs,
  } = useUnlock();

  const isSetupMode = profile === null;

  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lockoutSeconds = Math.ceil(remainingLockoutMs / 1_000);

  const title = useMemo(() => (isSetupMode ? "Create Master Password" : "Unlock Vault"), [isSetupMode]);

  const subtitle = useMemo(
    () =>
      isSetupMode
        ? "Your master password encrypts all vault data locally. It cannot be recovered."
        : "Enter your master password to derive your vault key locally.",
    [isSetupMode],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (isSetupMode) {
      if (masterPassword.length < 12) {
        setError("Master password must be at least 12 characters.");
        return;
      }

      if (masterPassword !== confirmPassword) {
        setError("Master password confirmation does not match.");
        return;
      }
    }

    if (!isSetupMode && remainingLockoutMs > 0) {
      setError(`Vault is temporarily locked. Try again in ${lockoutSeconds}s.`);
      return;
    }

    setLoading(true);

    try {
      if (isSetupMode) {
        await setupMasterPassword(masterPassword);
      } else {
        const success = await unlock(masterPassword);
        if (!success) {
          setError("Invalid master password.");
        }
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Vault unlock failed.";
      setError(message);
    } finally {
      setLoading(false);
      setMasterPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <main className="center-screen">
      <div className="glass-card lock-card slide-up">
        <div className="card-brand">
          <div className="brand-icon">{isSetupMode ? "🔑" : "🔒"}</div>
          <div>
            <div className="brand-name">Zero Knowledge Vault</div>
            <div className="brand-tagline">All decryption happens locally in your browser</div>
          </div>
        </div>

        <div>
          <h1 className="card-title">{title}</h1>
          <p className="card-subtitle">{subtitle}</p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Master password</span>
            <input
              autoComplete={isSetupMode ? "new-password" : "current-password"}
              required
              type="password"
              placeholder={isSetupMode ? "Min. 12 characters" : "Enter master password"}
              value={masterPassword}
              onChange={(event) => setMasterPassword(event.target.value)}
            />
          </label>

          {isSetupMode ? (
            <label className="field">
              <span>Confirm master password</span>
              <input
                autoComplete="new-password"
                required
                type="password"
                placeholder="Repeat master password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          ) : null}

          {!isSetupMode && failedAttempts > 0 ? (
            <p className="muted-text">⚠ Failed attempts: {failedAttempts} / 5</p>
          ) : null}

          {!isSetupMode && remainingLockoutMs > 0 ? (
            <p className="warning-text">🔒 Vault locked — try again in {lockoutSeconds}s</p>
          ) : null}

          {error !== null ? <p className="error-text">{error}</p> : null}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Deriving key…" : isSetupMode ? "Create vault key" : "Unlock vault"}
          </button>
        </form>

        <div className="auth-toggle-row">
          <button
            className="subtle-button"
            onClick={() => { void signOut(); }}
            type="button"
          >
            ← Switch account
          </button>
        </div>
      </div>
    </main>
  );
}
