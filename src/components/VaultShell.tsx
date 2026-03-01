import { FormEvent, useCallback, useMemo, useRef, useState } from "react";

import lockOpenImage from "../assets/lock-open.jpg";
import { useAuth } from "../hooks/useAuth";
import { useUnlock } from "../hooks/useUnlock";
import { useVault } from "../hooks/useVault";
import { generateSecurePassword } from "../lib/passwordGenerator";
import type { VaultItemInput } from "../lib/types";
import { LockStateIcon } from "./LockStateIcon";

interface VaultEditorState {
  id: string | null;
  title: string;
  url: string;
  folder: string;
  tags: string;
  favorite: boolean;
  username: string;
  password: string;
  notes: string;
}

function getPasswordStrength(pw: string): "weak" | "fair" | "good" | "strong" {
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const variety = [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length;
  if (pw.length < 8 || variety < 2) return "weak";
  if (pw.length < 12 || variety < 3) return "fair";
  if (pw.length < 16 || variety < 4) return "good";
  return "strong";
}

const STRENGTH_LABEL: Record<string, string> = {
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
};

const EMPTY_EDITOR_STATE: VaultEditorState = {
  id: null,
  title: "",
  url: "",
  folder: "",
  tags: "",
  favorite: false,
  username: "",
  password: "",
  notes: "",
};

export function VaultShell(): JSX.Element {
  const { signOut } = useAuth();
  const { autoLockMinutes, setAutoLockMinutes, lock } = useUnlock();
  const {
    vaultItems,
    selectedItem,
    loading,
    selectVaultItem,
    clearSelectedItem,
    createVaultItem,
    updateVaultItem,
    deleteVaultItem,
  } = useVault();

  const [searchQuery, setSearchQuery] = useState("");
  const [editorState, setEditorState] = useState<VaultEditorState | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditorPassword, setShowEditorPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"username" | "password" | null>(null);
  const clipboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyWithAutoClear = useCallback((text: string, field: "username" | "password"): void => {
    if (clipboardTimerRef.current !== null) {
      clearTimeout(clipboardTimerRef.current);
    }
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      clipboardTimerRef.current = setTimeout(() => {
        void navigator.clipboard.writeText("").catch(() => undefined);
        setCopiedField(null);
        clipboardTimerRef.current = null;
      }, 30_000);
    }).catch(() => undefined);
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return vaultItems;
    }

    return vaultItems.filter((item) => {
      const haystack = [item.title, item.url, item.folder, item.tags.join(" ")].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [searchQuery, vaultItems]);
  const favoriteCount = useMemo(() => vaultItems.filter((item) => item.favorite).length, [vaultItems]);
  const hasActiveSearch = searchQuery.trim().length > 0;

  const openNewItemEditor = (): void => {
    setEditorState({
      ...EMPTY_EDITOR_STATE,
      password: generateSecurePassword(),
    });
    setShowEditorPassword(true);
    setError(null);
  };

  const openEditItemEditor = (): void => {
    if (selectedItem === null) {
      return;
    }

    setEditorState({
      id: selectedItem.id,
      title: selectedItem.title,
      url: selectedItem.url,
      folder: selectedItem.folder,
      tags: selectedItem.tags.join(", "),
      favorite: selectedItem.favorite,
      username: selectedItem.secret.username,
      password: selectedItem.secret.password,
      notes: selectedItem.secret.notes,
    });

    setShowEditorPassword(false);
    setError(null);
  };

  const closeEditor = (): void => {
    setEditorState(null);
  };

  const handleSelectItem = async (id: string): Promise<void> => {
    setError(null);
    setShowPassword(false);

    try {
      await selectVaultItem(id);
    } catch (selectionError) {
      const message = selectionError instanceof Error ? selectionError.message : "Failed to decrypt item.";
      setError(message);
    }
  };

  const handleSaveItem = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (editorState === null) {
      return;
    }

    const payload: VaultItemInput = {
      title: editorState.title.trim(),
      url: editorState.url.trim(),
      folder: editorState.folder.trim(),
      tags: editorState.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      favorite: editorState.favorite,
      secret: {
        username: editorState.username,
        password: editorState.password,
        notes: editorState.notes,
        customFields: [],
      },
    };

    if (payload.title.length === 0) {
      setError("Item title is required.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (editorState.id === null) {
        await createVaultItem(payload);
      } else {
        await updateVaultItem(editorState.id, payload);
      }
      closeEditor();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save vault item.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSelected = async (): Promise<void> => {
    if (selectedItem === null) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await deleteVaultItem(selectedItem.id);
      clearSelectedItem();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete item.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="vault-shell fade-in">
      <header className="top-bar">
        <div className="top-bar-brand">
          <div className="top-bar-icon" aria-hidden="true">
            <LockStateIcon unlocked className="state-lock-icon" />
          </div>
          <div>
            <h1>Zero Knowledge Vault</h1>
            <p>Client-side encryption workspace with local key derivation</p>
            <span className="top-bar-badge">Encrypted session active</span>
          </div>
        </div>
        <div className="top-bar-meta">
          <div className="metric-pill">
            <span>Items</span>
            <strong>{vaultItems.length}</strong>
          </div>
          <div className="metric-pill">
            <span>Favorites</span>
            <strong>{favoriteCount}</strong>
          </div>
          <div className="metric-pill">
            <span>Auto-lock</span>
            <strong>{autoLockMinutes}m</strong>
          </div>
        </div>
        <div className="top-bar-actions">
          <button className="outline-button" onClick={lock} type="button">
            Lock now
          </button>
          <button
            className="subtle-button"
            onClick={() => {
              lock();
              void signOut();
            }}
            type="button"
          >
            Sign out
          </button>
          <button className="primary-button" onClick={openNewItemEditor} type="button">
            New item
          </button>
        </div>
        <aside className="vault-state-panel" aria-label="Vault state image">
          <img
            className="vault-state-image"
            src={lockOpenImage}
            alt="Open lock showing the vault is unlocked"
          />
        </aside>
      </header>

      {error !== null ? <p className="error-banner">{error}</p> : null}

      <section className="vault-grid">
        <aside className="panel list-panel">
          <div className="list-heading">
            <div>
              <h2>Vault Library</h2>
              <p>{hasActiveSearch ? `${filteredItems.length} matches` : `${vaultItems.length} saved items`}</p>
            </div>
            <button className="chip-button" onClick={openNewItemEditor} type="button">
              Add
            </button>
          </div>

          <div className="search-wrapper">
            <input
              className="search-field"
              placeholder="Search title, domain, folder, tag..."
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="list-container">
            {loading ? <p className="muted-text">Loading vault...</p> : null}
            {!loading && filteredItems.length === 0 ? <p className="muted-text">No vault items yet.</p> : null}

            {filteredItems.map((item) => (
              <button
                key={item.id}
                className={`list-item ${selectedItem?.id === item.id ? "active" : ""}`}
                onClick={() => { void handleSelectItem(item.id); }}
                type="button"
              >
                <div className="item-avatar">
                  {item.title.slice(0, 2)}
                </div>
                <div className="item-body">
                  <div className="item-title">{item.title}</div>
                  <div className="item-sub">{item.url || item.folder || "No domain"}</div>
                </div>
                {item.favorite ? <span className="item-star">★</span> : null}
              </button>
            ))}
          </div>

          <section className="settings-card">
            <h2>Settings</h2>
            <label className="field">
              <span>Auto-lock (minutes)</span>
              <input
                min={1}
                max={60}
                step={1}
                type="number"
                value={autoLockMinutes}
                onChange={(event) => setAutoLockMinutes(Number(event.target.value))}
              />
            </label>

            <div className="row-actions">
              <button className="outline-button" disabled={selectedItem === null} onClick={clearSelectedItem} type="button">
                Clear selection
              </button>
              <button
                className="subtle-button"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                Reset search
              </button>
            </div>
          </section>
        </aside>

        <section className="panel detail-panel">
          {selectedItem === null ? (
            <div className="empty-detail">
              <div className="empty-detail-icon">Vault</div>
              <h2>Select an item to inspect secrets</h2>
              <p>Credentials are decrypted on-demand and kept only in volatile memory while unlocked.</p>
              <button className="primary-button" onClick={openNewItemEditor} type="button">
                Create your first vault item
              </button>
            </div>
          ) : (
            <div className="detail-content">
              <div className="detail-header">
                <div className="detail-header-text">
                  <h2>{selectedItem.title}</h2>
                  <p>{selectedItem.url || "No URL"}</p>
                  <div className="detail-chip-row">
                    <span className="status-chip">{selectedItem.folder || "No folder"}</span>
                    <span className={`status-chip${selectedItem.favorite ? " status-chip--favorite" : ""}`}>
                      {selectedItem.favorite ? "Favorite" : "Standard"}
                    </span>
                  </div>
                </div>
                <div className="row-actions">
                  <button className="outline-button" onClick={openEditItemEditor} type="button">
                    Edit
                  </button>
                  <button className="danger-button" disabled={busy} onClick={() => void handleDeleteSelected()} type="button">
                    Delete
                  </button>
                </div>
              </div>

              <div className="secret-grid">
                <div className="field">
                  <span>Username</span>
                  <div className="input-copy-row">
                    <input readOnly type="text" value={selectedItem.secret.username} />
                    <button
                      className={`copy-btn${copiedField === "username" ? " copy-btn--copied" : ""}`}
                      type="button"
                      title="Copy username"
                      onClick={() => copyWithAutoClear(selectedItem.secret.username, "username")}
                    >
                      {copiedField === "username" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <span>Password</span>
                  <div className="input-copy-row">
                    <div className="input-reveal-group">
                      <input
                        readOnly
                        type={showPassword ? "text" : "password"}
                        value={selectedItem.secret.password}
                      />
                      <button
                        className="reveal-toggle"
                        type="button"
                        title={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <button
                      className={`copy-btn${copiedField === "password" ? " copy-btn--copied" : ""}`}
                      type="button"
                      title="Copy password"
                      onClick={() => copyWithAutoClear(selectedItem.secret.password, "password")}
                    >
                      {copiedField === "password" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              <p className="detail-security-note">Secrets are decrypted only for this unlocked session and stay out of persistent browser storage.</p>

              <label className="field">
                <span>Notes</span>
                <textarea readOnly rows={8} value={selectedItem.secret.notes} />
              </label>

              {selectedItem.tags.length > 0 ? (
                <div className="tag-row">
                  {selectedItem.tags.map((tag) => (
                    <span key={tag} className="tag-chip">#{tag}</span>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>

      </section>

      {editorState !== null ? (
        <div className="modal-overlay" role="presentation">
          <div className="panel modal-card">
            <div className="modal-header">
              <h2>{editorState.id === null ? "New vault item" : "Edit vault item"}</h2>
              <button className="subtle-button" onClick={closeEditor} type="button">
                Close
              </button>
            </div>

            <form className="stack modal-form" onSubmit={(event) => void handleSaveItem(event)}>
              <div className="form-section">
                <h3>Profile</h3>
                <p>Define how this entry appears in your vault library.</p>
              </div>
              <label className="field">
                <span>Title</span>
                <input
                  required
                  type="text"
                  value={editorState.title}
                  onChange={(event) => setEditorState({ ...editorState, title: event.target.value })}
                />
              </label>

              <div className="secret-grid">
                <label className="field">
                  <span>URL</span>
                  <input
                    type="url"
                    value={editorState.url}
                    onChange={(event) => setEditorState({ ...editorState, url: event.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Folder</span>
                  <input
                    type="text"
                    value={editorState.folder}
                    onChange={(event) => setEditorState({ ...editorState, folder: event.target.value })}
                  />
                </label>
              </div>

              <label className="field">
                <span>Tags (comma-separated)</span>
                <input
                  type="text"
                  value={editorState.tags}
                  onChange={(event) => setEditorState({ ...editorState, tags: event.target.value })}
                />
              </label>

              <div className="form-section">
                <h3>Credentials</h3>
                <p>Securely store the login fields and rotate passwords as needed.</p>
              </div>
              <label className="field">
                <span>Username</span>
                <input
                  type="text"
                  value={editorState.username}
                  onChange={(event) => setEditorState({ ...editorState, username: event.target.value })}
                />
              </label>

              <div className="field">
                <span>Password</span>
                <div className="pw-row">
                  <div className="input-reveal-group">
                    <input
                      autoComplete="new-password"
                      required
                      type={showEditorPassword ? "text" : "password"}
                      value={editorState.password}
                      onChange={(event) => setEditorState({ ...editorState, password: event.target.value })}
                    />
                    <button
                      className="reveal-toggle"
                      type="button"
                      title={showEditorPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowEditorPassword((v) => !v)}
                    >
                      {showEditorPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <button
                    className="generate-btn"
                    type="button"
                    onClick={() => {
                      const pw = generateSecurePassword();
                      setEditorState({ ...editorState, password: pw });
                      setShowEditorPassword(true);
                    }}
                  >
                    Generate
                  </button>
                </div>
                {editorState.password.length > 0 ? (
                  <div className="pw-strength-bar">
                    <div className={`pw-strength-fill ${getPasswordStrength(editorState.password)}`} />
                    <span className="pw-strength-label">{STRENGTH_LABEL[getPasswordStrength(editorState.password)]}</span>
                  </div>
                ) : null}
              </div>

              <label className="checkbox-row">
                <input
                  checked={editorState.favorite}
                  type="checkbox"
                  onChange={(event) => setEditorState({ ...editorState, favorite: event.target.checked })}
                />
                Favorite
              </label>

              <label className="field">
                <span>Notes</span>
                <textarea
                  rows={6}
                  value={editorState.notes}
                  onChange={(event) => setEditorState({ ...editorState, notes: event.target.value })}
                />
              </label>

              <div className="modal-footer-actions">
                <button className="subtle-button" onClick={closeEditor} type="button">
                  Cancel
                </button>
                <button className="primary-button" disabled={busy} type="submit">
                  {busy ? "Saving..." : "Save item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
