export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface KdfParams {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
  hashLength: number;
}

export interface VaultCustomField {
  label: string;
  value: string;
}

export interface VaultSecret {
  username: string;
  password: string;
  notes: string;
  customFields: VaultCustomField[];
}

export interface VaultItemMetadata {
  id: string;
  title: string;
  url: string;
  folder: string;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VaultItemInput {
  title: string;
  url: string;
  folder: string;
  tags: string[];
  favorite: boolean;
  secret: VaultSecret;
}

export interface DecryptedVaultItem extends VaultItemMetadata {
  secret: VaultSecret;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          kdf_salt: string;
          kdf_params: KdfParams;
          master_verifier: string;
          created_at: string;
          kdf_alg: string;
        };
        Insert: {
          user_id: string;
          kdf_salt: string;
          kdf_params: KdfParams;
          master_verifier: string;
          created_at?: string;
          kdf_alg?: string;
        };
        Update: {
          kdf_salt?: string;
          kdf_params?: KdfParams;
          master_verifier?: string;
          created_at?: string;
          kdf_alg?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      vault_items: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          url: string | null;
          folder: string | null;
          tags: string[];
          favorite: boolean;
          iv: string;
          ciphertext: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          url?: string | null;
          folder?: string | null;
          tags?: string[];
          favorite?: boolean;
          iv: string;
          ciphertext: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          url?: string | null;
          folder?: string | null;
          tags?: string[];
          favorite?: boolean;
          iv?: string;
          ciphertext?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vault_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type VaultItemRow = Database["public"]["Tables"]["vault_items"]["Row"];
