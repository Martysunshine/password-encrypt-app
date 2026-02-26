import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { decryptVaultSecret, encryptVaultSecret } from "../lib/crypto/vaultCrypto";
import { supabase } from "../lib/supabase";
import type {
  DecryptedVaultItem,
  VaultItemInput,
  VaultItemMetadata,
  VaultItemRow,
} from "../lib/types";
import { buildVaultInsertRecord, buildVaultUpdateRecord } from "../lib/vaultRecord";
import { useAuth } from "./useAuth";
import { useUnlock } from "./useUnlock";

interface VaultContextValue {
  vaultItems: VaultItemMetadata[];
  selectedItem: DecryptedVaultItem | null;
  loading: boolean;
  loadVaultItems: () => Promise<void>;
  selectVaultItem: (id: string) => Promise<void>;
  clearSelectedItem: () => void;
  createVaultItem: (input: VaultItemInput) => Promise<void>;
  updateVaultItem: (id: string, input: VaultItemInput) => Promise<void>;
  deleteVaultItem: (id: string) => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | undefined>(undefined);

type VaultItemMetadataRow = Pick<
  VaultItemRow,
  "id" | "title" | "url" | "folder" | "tags" | "favorite" | "created_at" | "updated_at"
>;

function toMetadata(item: VaultItemMetadataRow): VaultItemMetadata {
  return {
    id: item.id,
    title: item.title,
    url: item.url ?? "",
    folder: item.folder ?? "",
    tags: item.tags,
    favorite: item.favorite,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export function VaultProvider({ children }: PropsWithChildren): JSX.Element {
  const { user, isAuthenticated } = useAuth();
  const { withEncryptionKey, isUnlocked } = useUnlock();

  const [vaultItems, setVaultItems] = useState<VaultItemMetadata[]>([]);
  const [selectedItem, setSelectedItem] = useState<DecryptedVaultItem | null>(null);
  const [loading, setLoading] = useState(false);

  const loadVaultItems = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || user === null) {
      setVaultItems([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("vault_items")
      .select("id,title,url,folder,tags,favorite,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    setLoading(false);

    if (error !== null) {
      throw new Error(error.message);
    }

    setVaultItems((data ?? []).map(toMetadata));
  }, [isAuthenticated, user]);

  useEffect(() => {
    void loadVaultItems();
  }, [loadVaultItems]);

  useEffect(() => {
    if (!isUnlocked) {
      setSelectedItem(null);
    }
  }, [isUnlocked]);

  useEffect(() => {
    if (!isAuthenticated) {
      setVaultItems([]);
      setSelectedItem(null);
    }
  }, [isAuthenticated]);

  const clearSelectedItem = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const createVaultItem = useCallback(
    async (input: VaultItemInput): Promise<void> => {
      if (user === null) {
        throw new Error("User session is missing.");
      }

      await withEncryptionKey(async (keyBytes) => {
        const encrypted = await encryptVaultSecret(input.secret, keyBytes);
        const { error } = await supabase
          .from("vault_items")
          .insert(buildVaultInsertRecord(user.id, input, encrypted));

        if (error !== null) {
          throw new Error(error.message);
        }
      });

      await loadVaultItems();
    },
    [loadVaultItems, user, withEncryptionKey],
  );

  const updateVaultItem = useCallback(
    async (id: string, input: VaultItemInput): Promise<void> => {
      if (user === null) {
        throw new Error("User session is missing.");
      }

      await withEncryptionKey(async (keyBytes) => {
        const encrypted = await encryptVaultSecret(input.secret, keyBytes);
        const { error } = await supabase
          .from("vault_items")
          .update(buildVaultUpdateRecord(input, encrypted))
          .eq("id", id)
          .eq("user_id", user.id);

        if (error !== null) {
          throw new Error(error.message);
        }
      });

      await loadVaultItems();
      setSelectedItem(null);
    },
    [loadVaultItems, user, withEncryptionKey],
  );

  const deleteVaultItem = useCallback(
    async (id: string): Promise<void> => {
      if (user === null) {
        throw new Error("User session is missing.");
      }

      const { error } = await supabase.from("vault_items").delete().eq("id", id).eq("user_id", user.id);
      if (error !== null) {
        throw new Error(error.message);
      }

      setSelectedItem((current) => (current?.id === id ? null : current));
      await loadVaultItems();
    },
    [loadVaultItems, user],
  );

  const selectVaultItem = useCallback(
    async (id: string): Promise<void> => {
      if (user === null) {
        throw new Error("User session is missing.");
      }

      const { data, error } = await supabase
        .from("vault_items")
        .select("id,user_id,title,url,folder,tags,favorite,iv,ciphertext,created_at,updated_at")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error !== null) {
        throw new Error(error.message);
      }
      if (data === null) {
        throw new Error("Vault item was not found.");
      }

      await withEncryptionKey(async (keyBytes) => {
        const secret = await decryptVaultSecret({ iv: data.iv, ciphertext: data.ciphertext }, keyBytes);
        setSelectedItem({
          ...toMetadata(data),
          secret,
        });
      });
    },
    [user, withEncryptionKey],
  );

  const value = useMemo<VaultContextValue>(
    () => ({
      vaultItems,
      selectedItem,
      loading,
      loadVaultItems,
      selectVaultItem,
      clearSelectedItem,
      createVaultItem,
      updateVaultItem,
      deleteVaultItem,
    }),
    [
      clearSelectedItem,
      createVaultItem,
      deleteVaultItem,
      loadVaultItems,
      loading,
      selectVaultItem,
      selectedItem,
      updateVaultItem,
      vaultItems,
    ],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error("useVault must be used within a VaultProvider.");
  }

  return context;
}
