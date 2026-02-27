import { AuthScreen } from "./components/AuthScreen";
import { LockScreen } from "./components/LockScreen";
import { VaultShell } from "./components/VaultShell";
import { useAuth } from "./hooks/useAuth";
import { useUnlock } from "./hooks/useUnlock";

export default function App(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const { isProfileLoading, isUnlocked } = useUnlock();

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
