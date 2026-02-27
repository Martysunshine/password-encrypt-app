import { FormEvent, useMemo, useState } from "react";

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
    <main className="center-screen">
      <div className="glass-card auth-card fade-in">
        <div className="card-brand">
          <div className="brand-icon">🔐</div>
          <div>
            <div className="brand-name">Zero Knowledge Vault</div>
            <div className="brand-tagline">End-to-end encrypted · Argon2id · AES-256-GCM</div>
          </div>
        </div>

        <div>
          <h1 className="card-title">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
          <p className="card-subtitle">
            {mode === "signin"
              ? "Sign in to access your encrypted vault."
              : "Create your account. Your vault key is derived locally."}
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

          <label className="field">
            <span>Account password</span>
            <input
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              type="password"
              placeholder={mode === "signup" ? "Min. 12 characters" : ""}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {mode === "signup" ? (
            <label className="field">
              <span>Confirm password</span>
              <input
                autoComplete="new-password"
                required
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          ) : null}

          {error !== null ? <p className="error-text">{error}</p> : null}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Working…" : actionLabel}
          </button>
        </form>

        <div className="auth-toggle-row">
          <button
            className="subtle-button"
            onClick={() => {
              setMode((currentMode) => (currentMode === "signin" ? "signup" : "signin"));
              setError(null);
            }}
            type="button"
          >
            {mode === "signin" ? "No account? Sign up →" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
