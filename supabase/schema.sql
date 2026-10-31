-- Website Builders BD — Supabase setup. Paste this whole file into: Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

-- 1) Profiles (one row per login account; holds the role) -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'user' check (role in ('user','manager','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.my_role() returns text
language sql security definer stable set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_staff() returns boolean
language sql security definer stable set search_path = public as
$$ select coalesce(public.my_role() in ('admin','manager'), false) $$;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as
$$ select coalesce(public.my_role() = 'admin', false) $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, lower(new.email), coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2) Advance payments ----------------------------------------------------------------
create table if not exists public.payments (
  id text primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account text not null,
  name text not null,
  wa text not null,
  email text not null,
  pkg text not null,
  total integer not null default 0,
  amount integer not null,
  method text not null,
  trx text not null,
  paid_from text not null default '',
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  reason text not null default '',
  reviewed_by text not null default '',
  seen boolean not null default false
);
create unique index if not exists payments_trx_unique on public.payments (upper(trx));

alter table public.payments enable row level security;
drop policy if exists pay_select on public.payments;
drop policy if exists pay_insert on public.payments;
drop policy if exists pay_update_staff on public.payments;
drop policy if exists pay_delete_admin on public.payments;
create policy pay_select on public.payments for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy pay_insert on public.payments for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and reason = '' and seen = false);
create policy pay_update_staff on public.payments for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy pay_delete_admin on public.payments for delete to authenticated
  using (public.is_admin());

-- customer acknowledges the big "payment rejected" alert
create or replace function public.mark_rejections_seen() returns void
language sql security definer set search_path = public as
$$ update public.payments set seen = true where user_id = auth.uid() and status = 'rejected' $$;
revoke all on function public.mark_rejections_seen() from public, anon;
grant execute on function public.mark_rejections_seen() to authenticated;

-- 3) Contact-form messages / orders ----------------------------------------------------
create table if not exists public.messages (
  id text primary key default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  company text not null default '',
  service text not null default '',
  pkg text not null default '',
  budget text not null default '',
  subject text not null default '',
  type text not null default '',
  message text not null default '',
  status text not null default 'New'
);
alter table public.messages enable row level security;
drop policy if exists msg_insert on public.messages;
drop policy if exists msg_select_staff on public.messages;
drop policy if exists msg_update_staff on public.messages;
drop policy if exists msg_delete_admin on public.messages;
create policy msg_insert on public.messages for insert to anon, authenticated
  with check (status = 'New' and length(message) <= 4000 and length(name) <= 200);
create policy msg_select_staff on public.messages for select to authenticated using (public.is_staff());
create policy msg_update_staff on public.messages for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy msg_delete_admin on public.messages for delete to authenticated using (public.is_admin());

-- 4) Website content edited in the Admin Panel (shared by every visitor) -------------
create table if not exists public.site_content (
  id integer primary key check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
drop policy if exists content_read on public.site_content;
drop policy if exists content_write on public.site_content;
create policy content_read on public.site_content for select to anon, authenticated using (true);
create policy content_write on public.site_content for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 5) Table permissions (row-level security above decides who can do what) ------------
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant insert on public.messages to anon;
grant select, insert, update, delete on public.messages to authenticated;
grant select on public.site_content to anon;
grant select, insert, update, delete on public.site_content to authenticated;
