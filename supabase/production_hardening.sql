-- Run this in Supabase SQL Editor before production launch.
-- It aligns an existing project with the checked-in schema and removes test-only surface area.

begin;

-- Profiles hardening and alignment.
alter table public.profiles add column if not exists kdf_alg text;
update public.profiles set kdf_alg = 'argon2id' where kdf_alg is null;
alter table public.profiles alter column kdf_alg set default 'argon2id';
alter table public.profiles alter column kdf_alg set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_kdf_alg_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_kdf_alg_check
      check (kdf_alg = 'argon2id');
  end if;
end;
$$;

-- Vault hardening and alignment.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vault_items_title_not_blank'
      and conrelid = 'public.vault_items'::regclass
  ) then
    alter table public.vault_items
      add constraint vault_items_title_not_blank
      check (char_length(btrim(title)) > 0);
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.vault_items enable row level security;
alter table public.profiles force row level security;
alter table public.vault_items force row level security;

-- Remove duplicate legacy policies before recreating canonical policies.
drop policy if exists profiles_insert_consolidated on public.profiles;
drop policy if exists profiles_select_auth on public.profiles;
drop policy if exists profiles_update_auth on public.profiles;

drop policy if exists vault_items_select_auth on public.vault_items;
drop policy if exists vault_items_insert_auth on public.vault_items;
drop policy if exists vault_items_update_auth on public.vault_items;
drop policy if exists vault_items_delete_auth on public.vault_items;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can read own vault items" on public.vault_items;
create policy "Users can read own vault items"
on public.vault_items
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own vault items" on public.vault_items;
create policy "Users can insert own vault items"
on public.vault_items
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own vault items" on public.vault_items;
create policy "Users can update own vault items"
on public.vault_items
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own vault items" on public.vault_items;
create policy "Users can delete own vault items"
on public.vault_items
for delete
to authenticated
using (user_id = auth.uid());

-- Drop test-only objects from the public API surface.
drop function if exists public.is_admin();
drop table if exists public.test_rls;
drop table if exists public.backup_rls_policies;

commit;
