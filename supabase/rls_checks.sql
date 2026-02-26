-- Pre-launch RLS verification script (non-destructive).
-- Run in Supabase SQL Editor.
--
-- Replace the placeholders below with two real auth.users IDs:
--   USER_A_UUID
--   USER_B_UUID
--
-- The script uses:
--   request.jwt.claim.sub
-- This matches how auth.uid() is resolved in policy checks.

begin;

-- 1) Ensure RLS is enabled and forced for the production tables.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('profiles', 'vault_items')
order by c.relname;

-- 2) Inspect active policies for production tables.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'vault_items')
order by tablename, policyname;

-- 3) Simulate User A and check visibility.
set local role authenticated;
set local request.jwt.claim.sub = 'USER_A_UUID';

select
  'user_a_profiles_visible' as check_name,
  count(*) as row_count
from public.profiles;

select
  'user_a_vault_items_visible' as check_name,
  count(*) as row_count
from public.vault_items;

select
  'user_a_profiles_cross_user_should_be_zero' as check_name,
  count(*) as row_count
from public.profiles
where user_id::text <> current_setting('request.jwt.claim.sub', true);

select
  'user_a_vault_cross_user_should_be_zero' as check_name,
  count(*) as row_count
from public.vault_items
where user_id::text <> current_setting('request.jwt.claim.sub', true);

-- 4) Simulate User B and check visibility.
set local request.jwt.claim.sub = 'USER_B_UUID';

select
  'user_b_profiles_visible' as check_name,
  count(*) as row_count
from public.profiles;

select
  'user_b_vault_items_visible' as check_name,
  count(*) as row_count
from public.vault_items;

select
  'user_b_profiles_cross_user_should_be_zero' as check_name,
  count(*) as row_count
from public.profiles
where user_id::text <> current_setting('request.jwt.claim.sub', true);

select
  'user_b_vault_cross_user_should_be_zero' as check_name,
  count(*) as row_count
from public.vault_items
where user_id::text <> current_setting('request.jwt.claim.sub', true);

rollback;
