# Zero-Knowledge Password Vault (React + Supabase)

Security-first MVP for a web password manager where vault secrets are encrypted on the client using Argon2id-derived AES-256-GCM keys.

## Core Security Properties

- Master password is never sent to Supabase.
- Vault encryption key is derived client-side with Argon2id and stored in memory only.
- Vault plaintext is never stored in Postgres, localStorage, or logs.
- Every vault item uses a unique random AES-GCM IV.
- RLS restricts every row to `user_id = auth.uid()`.
- Unlock brute-force attempts are rate-limited client-side with temporary lockout.
- Auto-lock wipes key material from memory.

## Architecture

- `src/lib/crypto/*`
  - Argon2id key derivation (`argon2-browser` WASM).
  - Key splitting into encryption key + verifier key.
  - AES-256-GCM encrypt/decrypt helpers.
  - Base64URL utilities.
  - Memory wipe helpers for byte arrays.
- `src/hooks/useAuth.tsx`
  - Supabase Auth session lifecycle.
- `src/hooks/useUnlock.tsx`
  - Master setup/unlock, verifier checks, lockout guard, auto-lock timer, in-memory key lifecycle.
- `src/hooks/useVault.tsx`
  - Vault CRUD with frontend encryption/decryption.
- `src/components/*`
  - Auth, lock screen, vault list/detail/editor, settings.
- `supabase/schema.sql`
  - Profiles + vault tables and RLS policies.

## Zero-Knowledge Data Model

### Stored in `profiles`

- `kdf_salt`
- `kdf_params`
- `master_verifier`
- `kdf_alg`

### Stored in `vault_items`

- plaintext-safe metadata (`title`, `url`, `folder`, `tags`, `favorite`)
- encrypted payload (`iv`, `ciphertext`)

### Never Stored

- Master password
- Derived encryption key
- Decrypted vault secrets

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

Set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3. Run SQL in Supabase SQL editor:

- `supabase/schema.sql`
- `supabase/production_hardening.sql` (for existing projects before launch)

4. Start app:

```bash
npm run dev
```

## Tests

Run all tests:

```bash
npm test
```

Included tests:

- Encryption/decryption integrity (`src/lib/crypto/vaultCrypto.test.ts`)
- Encrypted record shape only (no plaintext secret fields) (`src/lib/vaultRecord.test.ts`)
- Brute-force lockout behavior (`src/lib/security/unlockGuard.test.ts`)
- Auto-lock timer behavior (`src/lib/security/autoLock.test.ts`)
- RLS verification script (`supabase/rls_checks.sql`)

## Production Launch Checklist

1. Rotate all leaked or previously shared `sb_secret_*` keys and update server-side env vars.
2. Run `supabase/production_hardening.sql` in the production project.
3. Run `supabase/rls_checks.sql` with two real user UUIDs and confirm all `cross_user_should_be_zero` checks return `0`.
4. Verify only `profiles` and `vault_items` are required in `public`, and remove any test tables/functions.
5. Deploy with only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in frontend env vars.

## Threat Model Coverage

Designed to reduce impact from:

- Database breach (only ciphertext + non-secret metadata exposed)
- Supabase/admin DB read access
- Server compromise (no decryption endpoints)
- Passive network interception (TLS + ciphertext at rest)
- Online unlock brute-force attempts (client lockout)

## Security Assumptions and Limitations

- Browser runtime must not be compromised (XSS/extension malware can still access decrypted content while unlocked).
- JavaScript strings cannot be reliably wiped from memory; binary buffers are wiped where possible.
- Client-side lockout is not equivalent to server-side anti-automation controls.
- Password recovery is intentionally not implemented to preserve zero-knowledge design.
- Supabase Auth session tokens remain in browser storage per Supabase SDK defaults.

## Future Expansion Hooks

Current architecture leaves room for:

- Recovery key flow (encrypted key wrapping)
- WebAuthn-assisted unlock
- Multi-device onboarding with encrypted key envelopes
- Browser extension integration
- Organization vault separation
