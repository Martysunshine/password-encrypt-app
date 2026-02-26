-- Enable cryptographic UUID generation if not already enabled.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kdf_salt text not null check (char_length(kdf_salt) > 0),
  kdf_params jsonb not null,
  master_verifier text not null check (char_length(master_verifier) > 0),
  kdf_alg text not null default 'argon2id',
  created_at timestamptz not null default now()
);

create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text,
  folder text,
  tags text[] not null default '{}',
  favorite boolean not null default false,
  iv text not null check (char_length(iv) > 0),
  ciphertext text not null check (char_length(ciphertext) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create index if not exists idx_vault_items_user_id on public.vault_items(user_id);
create index if not exists idx_vault_items_user_updated on public.vault_items(user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vault_items_updated_at on public.vault_items;
create trigger trg_vault_items_updated_at
before update on public.vault_items
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.vault_items enable row level security;
alter table public.profiles force row level security;
alter table public.vault_items force row level security;

-- Profiles policies.
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

-- Vault policies.
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
