import { useEffect } from "react";

import { AuthScreen } from "./components/AuthScreen";
import { LockScreen } from "./components/LockScreen";
import { VaultShell } from "./components/VaultShell";
import { useAuth } from "./hooks/useAuth";
import { useUnlock } from "./hooks/useUnlock";

export default function App(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const { isProfileLoading, isUnlocked } = useUnlock();
  const isVaultOpen = isAuthenticated && isUnlocked;

  useEffect(() => {
    const appliedClass = isVaultOpen ? "vault-open-bg" : "entry-bg";
    const staleClass = isVaultOpen ? "entry-bg" : "vault-open-bg";
    document.body.classList.add(appliedClass);
    document.body.classList.remove(staleClass);
    return () => {
      document.body.classList.remove("entry-bg", "vault-open-bg");
    };
  }, [isVaultOpen]);

  if (isLoading || isProfileLoading) {
    return (
      <main className="center-screen">
        <div className="glass-card loading-card">Initialising secure session</div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  if (!isUnlocked) {
    return <LockScreen />;
  }

  return <VaultShell />;
}
