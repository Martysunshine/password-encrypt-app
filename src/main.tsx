import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { UnlockProvider } from "./hooks/useUnlock";
import { VaultProvider } from "./hooks/useVault";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <UnlockProvider>
        <VaultProvider>
          <App />
        </VaultProvider>
      </UnlockProvider>
    </AuthProvider>
  </React.StrictMode>,
);
