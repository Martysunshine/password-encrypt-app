-- Migration: Add CHECK constraint to profiles.kdf_params
--
-- This prevents malformed or malicious kdf_params values from being stored
-- at the database level, complementing the client-side validateKdfParams()
-- guard in useUnlock.tsx.
--
-- Run once in the Supabase dashboard → SQL Editor, or via `supabase db push`.
-- Safe to run on an existing table (adds constraint; fails if existing rows
-- violate it, which they should not if inserted via the app).

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_kdf_params_valid CHECK (
    kdf_params IS NOT NULL
    AND (kdf_params->>'memoryCost')::int BETWEEN 8192 AND 524288
    AND (kdf_params->>'timeCost')::int  BETWEEN 1    AND 10
    AND (kdf_params->>'hashLength')::int = 64
  );
