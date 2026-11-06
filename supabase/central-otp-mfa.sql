-- Website Builders BD: server-enforced MFA state for Sopnil Central OTP.
-- Run after deploying the Central Server. Only trusted server code may insert rows.
create table if not exists public.auth_mfa_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, session_id),
  check (expires_at > verified_at)
);
create index if not exists auth_mfa_sessions_expiry_idx on public.auth_mfa_sessions (expires_at);
alter table public.auth_mfa_sessions enable row level security;
revoke all on public.auth_mfa_sessions from public, anon, authenticated;
grant all on public.auth_mfa_sessions to service_role;

create or replace function public.is_mfa_verified()
returns boolean language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.auth_mfa_sessions s
    where s.user_id = auth.uid()
      and s.session_id = coalesce(auth.jwt() ->> 'session_id', '')
      and s.expires_at > now()
  );
$$;
revoke all on function public.is_mfa_verified() from public, anon;
grant execute on function public.is_mfa_verified() to authenticated;

-- Own profile read is allowed before OTP only so login can resolve the account role.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or (public.is_staff() and public.is_mfa_verified()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
using (id = auth.uid() and public.is_mfa_verified())
with check (id = auth.uid() and role = public.my_role() and public.is_mfa_verified());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update to authenticated
using (public.is_admin() and public.is_mfa_verified())
with check (public.is_admin() and public.is_mfa_verified());

drop policy if exists pay_select on public.payments;
create policy pay_select on public.payments for select to authenticated
using ((user_id = auth.uid() or public.is_staff()) and public.is_mfa_verified());

drop policy if exists pay_insert on public.payments;
create policy pay_insert on public.payments for insert to authenticated
with check (user_id = auth.uid() and status = 'pending' and reason = '' and seen = false and public.is_mfa_verified());

drop policy if exists pay_update_staff on public.payments;
create policy pay_update_staff on public.payments for update to authenticated
using (public.is_staff() and public.is_mfa_verified())
with check (public.is_staff() and public.is_mfa_verified());

drop policy if exists pay_delete_admin on public.payments;
create policy pay_delete_admin on public.payments for delete to authenticated
using (public.is_admin() and public.is_mfa_verified());

drop policy if exists msg_select_staff on public.messages;
create policy msg_select_staff on public.messages for select to authenticated
using (public.is_staff() and public.is_mfa_verified());

drop policy if exists msg_update_staff on public.messages;
create policy msg_update_staff on public.messages for update to authenticated
using (public.is_staff() and public.is_mfa_verified())
with check (public.is_staff() and public.is_mfa_verified());

drop policy if exists msg_delete_admin on public.messages;
create policy msg_delete_admin on public.messages for delete to authenticated
using (public.is_admin() and public.is_mfa_verified());

-- Keep the existing public site-content SELECT policy; gate only authenticated writes.
drop policy if exists content_write on public.site_content;
create policy content_write on public.site_content for all to authenticated
using (public.is_admin() and public.is_mfa_verified())
with check (public.is_admin() and public.is_mfa_verified());

create or replace function public.mark_rejections_seen()
returns void language sql security definer set search_path = public
as $$
  update public.payments
  set seen = true
  where user_id = auth.uid()
    and status = 'rejected'
    and public.is_mfa_verified();
$$;
revoke all on function public.mark_rejections_seen() from public, anon;
grant execute on function public.mark_rejections_seen() to authenticated;

-- Optional trusted-server cleanup job:
-- delete from public.auth_mfa_sessions where expires_at < now() - interval '1 day';
