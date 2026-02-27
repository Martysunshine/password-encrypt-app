import { FormEvent, useCallback, useMemo, useRef, useState } from "react";

import { useAuth } from "../hooks/useAuth";
import { useUnlock } from "../hooks/useUnlock";
import { useVault } from "../hooks/useVault";
import { generateSecurePassword } from "../lib/passwordGenerator";
import type { VaultItemInput } from "../lib/types";

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

  const openNewItemEditor = (): void => {
    setEditorState({
      ...EMPTY_EDITOR_STATE,
      password: generateSecurePassword(),
    });
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
          <div className="top-bar-icon">🔐</div>
          <div>
            <h1>Zero Knowledge Vault</h1>
            <p>Argon2id · AES-256-GCM · Client-side encryption</p>
          </div>
        </div>
        <div className="top-bar-actions">
          <button className="primary-button" onClick={openNewItemEditor} type="button">
            + New item
          </button>
        </div>
      </header>

      {error !== null ? <p className="error-banner">{error}</p> : null}

      <section className="vault-grid">
        <aside className="panel list-panel">
          <div className="search-wrapper">
            <input
              className="search-field"
              placeholder="Search by title, domain, folder…"
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
            </div>
          </section>
        </aside>

        <section className="panel detail-panel">
          {selectedItem === null ? (
            <div className="empty-detail">
              <div className="empty-detail-icon">🔒</div>
              <h2>Select an item</h2>
              <p>Secrets are decrypted on demand and never stored outside memory.</p>
            </div>
          ) : (
            <div className="detail-content">
              <div className="detail-header">
                <div className="detail-header-text">
                  <h2>{selectedItem.title}</h2>
                  <p>{selectedItem.url || "No URL"}</p>
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
                <div className="field-with-action">
                  <label className="field">
                    <span>Username</span>
                    <input readOnly type="text" value={selectedItem.secret.username} />
                  </label>
                  <button
                    className="subtle-button copy-btn"
                    type="button"
                    onClick={() => copyWithAutoClear(selectedItem.secret.username, "username")}
                  >
                    {copiedField === "username" ? "✓ Copied" : "Copy"}
                  </button>
                </div>

                <div className="field-with-action">
                  <label className="field">
                    <span>Password</span>
                    <input
                      readOnly
                      type={showPassword ? "text" : "password"}
                      value={selectedItem.secret.password}
                    />
                  </label>
                  <button
                    className="subtle-button copy-btn"
                    type="button"
                    onClick={() => copyWithAutoClear(selectedItem.secret.password, "password")}
                  >
                    {copiedField === "password" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <button
                className="subtle-button"
                onClick={() => setShowPassword((currentValue) => !currentValue)}
                type="button"
              >
                {showPassword ? "Hide password" : "Reveal password"}
              </button>

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
                ✕ Close
              </button>
            </div>

            <form className="stack" onSubmit={(event) => void handleSaveItem(event)}>
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

              <div className="secret-grid">
                <label className="field">
                  <span>Username</span>
                  <input
                    type="text"
                    value={editorState.username}
                    onChange={(event) => setEditorState({ ...editorState, username: event.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Password</span>
                  <input
                    autoComplete="new-password"
                    required
                    type="password"
                    value={editorState.password}
                    onChange={(event) => setEditorState({ ...editorState, password: event.target.value })}
                  />
                </label>
              </div>

              <div className="row-actions">
                <button
                  className="outline-button"
                  onClick={() => setEditorState({ ...editorState, password: generateSecurePassword() })}
                  type="button"
                >
                  Generate
                </button>

                <label className="checkbox-row">
                  <input
                    checked={editorState.favorite}
                    type="checkbox"
                    onChange={(event) => setEditorState({ ...editorState, favorite: event.target.checked })}
                  />
                  Favorite
                </label>
              </div>

              <label className="field">
                <span>Notes</span>
                <textarea
                  rows={6}
                  value={editorState.notes}
                  onChange={(event) => setEditorState({ ...editorState, notes: event.target.value })}
                />
              </label>

              <button className="primary-button" disabled={busy} type="submit">
                {busy ? "Saving..." : "Save item"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
