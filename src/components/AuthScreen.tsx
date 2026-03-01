import { FormEvent, useMemo, useState } from "react";

import lockClosedImage from "../assets/lock-closed.jpg";
import { useAuth } from "../hooks/useAuth";

type AuthMode = "signin" | "signup";

export function AuthScreen(): JSX.Element {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const actionLabel = useMemo(() => (mode === "signin" ? "Sign in" : "Create account"), [mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (mode === "signup") {
      if (password.length < 12) {
        setError("Account password must be at least 12 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Authentication failed.";
      setError(message);
    } finally {
      setLoading(false);
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <main className="center-screen entry-screen auth-screen">
      <div className="glass-card entry-card fade-in">
        <section className="entry-form-section">
          <div className="entry-heading">
            <p className="hero-kicker">Zero Knowledge Vault</p>
            <h2 className="card-title">{mode === "signin" ? "Welcome back" : "Create account"}</h2>
            <p className="card-subtitle">
              {mode === "signin"
                ? "Sign in to continue into your encrypted vault."
                : "Create your account and generate your vault profile."}
            </p>
          </div>

          <form className="stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email address</span>
              <input
                autoComplete="email"
                required
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <div className="field">
              <span>Account password</span>
              <div className="input-reveal-group">
                <input
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "Minimum 12 characters" : "Enter your password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  className="reveal-toggle"
                  type="button"
                  title={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {mode === "signup" ? <p className="field-helper">Long passphrases improve security and recovery safety.</p> : null}
            </div>

            {mode === "signup" ? (
              <div className="field">
                <span>Confirm password</span>
                <div className="input-reveal-group">
                  <input
                    autoComplete="new-password"
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    className="reveal-toggle"
                    type="button"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirmPassword((value) => !value)}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            ) : null}

            {error !== null ? <p className="error-text">{error}</p> : null}

            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Working..." : actionLabel}
            </button>
          </form>

          <p className="inline-hint">Tip: use a unique passphrase here and a separate master password for the vault.</p>

          <div className="auth-toggle-row">
            <button
              className="subtle-button"
              onClick={() => {
                setMode((currentMode) => (currentMode === "signin" ? "signup" : "signin"));
                setError(null);
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              type="button"
            >
              {mode === "signin" ? "Need an account? Create one" : "Already registered? Sign in"}
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
