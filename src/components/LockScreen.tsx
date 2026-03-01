import { FormEvent, useMemo, useState } from "react";

import lockClosedImage from "../assets/lock-closed.jpg";
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
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [showConfirmMasterPassword, setShowConfirmMasterPassword] = useState(false);

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
    <main className="center-screen entry-screen lock-screen">
      <div className="glass-card entry-card slide-up">
        <section className="entry-form-section">
          <div className="entry-heading">
            <p className="hero-kicker">{isSetupMode ? "Initial setup" : "Secure unlock"}</p>
            <h2 className="card-title">{title}</h2>
            <p className="card-subtitle">{subtitle}</p>
          </div>

          <form className="stack" onSubmit={handleSubmit}>
            <div className="field">
              <span>Master password</span>
              <div className="input-reveal-group">
                <input
                  autoComplete={isSetupMode ? "new-password" : "current-password"}
                  required
                  type={showMasterPassword ? "text" : "password"}
                  placeholder={isSetupMode ? "Minimum 12 characters" : "Enter master password"}
                  value={masterPassword}
                  onChange={(event) => setMasterPassword(event.target.value)}
                />
                <button
                  className="reveal-toggle"
                  type="button"
                  title={showMasterPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowMasterPassword((value) => !value)}
                >
                  {showMasterPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {isSetupMode ? (
              <div className="field">
                <span>Confirm master password</span>
                <div className="input-reveal-group">
                  <input
                    autoComplete="new-password"
                    required
                    type={showConfirmMasterPassword ? "text" : "password"}
                    placeholder="Repeat master password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    className="reveal-toggle"
                    type="button"
                    title={showConfirmMasterPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirmMasterPassword((value) => !value)}
                  >
                    {showConfirmMasterPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            ) : null}

            {!isSetupMode && failedAttempts > 0 ? (
              <p className="muted-text">Failed attempts: {failedAttempts} of 5</p>
            ) : null}

            {!isSetupMode && remainingLockoutMs > 0 ? (
              <p className="warning-text">Vault temporarily locked. Try again in {lockoutSeconds}s.</p>
            ) : null}

            {error !== null ? <p className="error-text">{error}</p> : null}

            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Deriving key..." : isSetupMode ? "Create vault key" : "Unlock vault"}
            </button>
          </form>

          <p className="inline-hint">
            {isSetupMode
              ? "This password cannot be recovered. Store it in a safe place."
              : "Lockout protection activates after repeated failed unlock attempts."}
          </p>

          <div className="auth-toggle-row">
            <button
              className="subtle-button"
              onClick={() => { void signOut(); }}
              type="button"
            >
              Switch account
            </button>
          </div>
        </section>

        <section className="entry-image-panel" aria-label="Vault state image">
          <img
            className="entry-lock-image"
            src={lockClosedImage}
            alt="Closed lock showing the vault is locked"
          />
        </section>
      </div>
    </main>
  );
}
