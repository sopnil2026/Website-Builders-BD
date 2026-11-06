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


-- Central OTP storage: private challenge and one-time ticket tables.
-- Only the trusted Central Node.js Server service-role client may access these.
create table if not exists public.auth_email_otp_challenges (
  challenge_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  email text not null,
  code_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  resend_after timestamptz not null,
  attempts smallint not null default 0 check (attempts >= 0 and attempts <= 5),
  consumed_at timestamptz,
  invalidated_at timestamptz
);
create index if not exists auth_email_otp_challenges_user_created_idx
  on public.auth_email_otp_challenges (user_id, created_at desc);
create index if not exists auth_email_otp_challenges_expiry_idx
  on public.auth_email_otp_challenges (expires_at);

create table if not exists public.auth_email_otp_tickets (
  ticket_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists auth_email_otp_tickets_expiry_idx
  on public.auth_email_otp_tickets (expires_at);

alter table public.auth_email_otp_challenges enable row level security;
alter table public.auth_email_otp_tickets enable row level security;
revoke all on public.auth_email_otp_challenges from public, anon, authenticated;
revoke all on public.auth_email_otp_tickets from public, anon, authenticated;
grant all on public.auth_email_otp_challenges to service_role;
grant all on public.auth_email_otp_tickets to service_role;

create or replace function public.create_email_otp_challenge(
  p_challenge_id uuid, p_user_id uuid, p_session_id text, p_email text,
  p_code_hash text, p_expires_at timestamptz, p_resend_after timestamptz
)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_recent integer;
begin
  if p_session_id is null or length(p_session_id) < 10
     or p_code_hash !~ '^[0-9a-f]{64}$'
     or p_expires_at <= now()
     or p_expires_at > now() + interval '6 minutes' then
    raise exception using message = 'OTP_BAD_CHALLENGE';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_session_id, 0));

  if exists (
    select 1 from public.auth_email_otp_challenges
    where user_id = p_user_id and session_id = p_session_id
      and created_at > now() - interval '60 seconds'
      and consumed_at is null and invalidated_at is null
  ) then
    raise exception using message = 'OTP_COOLDOWN';
  end if;

  select count(*) into v_recent
  from public.auth_email_otp_challenges
  where user_id = p_user_id and created_at > now() - interval '10 minutes';

  if v_recent >= 3 then
    raise exception using message = 'OTP_RATE_LIMIT';
  end if;

  update public.auth_email_otp_challenges
  set invalidated_at = now()
  where user_id = p_user_id and session_id = p_session_id
    and consumed_at is null and invalidated_at is null;

  delete from public.auth_email_otp_challenges where created_at < now() - interval '2 days';
  delete from public.auth_email_otp_tickets where expires_at < now() - interval '2 days';

  insert into public.auth_email_otp_challenges (
    challenge_id, user_id, session_id, email, code_hash, expires_at, resend_after
  ) values (
    p_challenge_id, p_user_id, p_session_id, lower(p_email), p_code_hash, p_expires_at, p_resend_after
  );
end;
$$;
revoke all on function public.create_email_otp_challenge(uuid, uuid, text, text, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.create_email_otp_challenge(uuid, uuid, text, text, text, timestamptz, timestamptz)
  to service_role;

create or replace function public.invalidate_email_otp_challenge(
  p_user_id uuid, p_session_id text, p_challenge_id uuid
)
returns void language sql security definer set search_path = public, pg_temp
as $$
  update public.auth_email_otp_challenges
  set invalidated_at = now()
  where challenge_id = p_challenge_id and user_id = p_user_id
    and session_id = p_session_id and consumed_at is null;
$$;
revoke all on function public.invalidate_email_otp_challenge(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.invalidate_email_otp_challenge(uuid, text, uuid)
  to service_role;

create or replace function public.consume_email_otp_challenge(
  p_user_id uuid, p_session_id text, p_challenge_id uuid,
  p_code_matches boolean, p_ticket_hash text, p_ticket_expires_at timestamptz
)
returns text language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_challenge public.auth_email_otp_challenges%rowtype;
begin
  select * into v_challenge
  from public.auth_email_otp_challenges
  where challenge_id = p_challenge_id and user_id = p_user_id and session_id = p_session_id
  for update;

  if not found then return 'not_found'; end if;
  if v_challenge.invalidated_at is not null or v_challenge.consumed_at is not null then return 'used'; end if;
  if v_challenge.expires_at <= now() then return 'expired'; end if;
  if v_challenge.attempts >= 5 then return 'locked'; end if;

  if not p_code_matches then
    update public.auth_email_otp_challenges
    set attempts = attempts + 1
    where challenge_id = p_challenge_id;
    if v_challenge.attempts + 1 >= 5 then return 'locked'; end if;
    return 'invalid';
  end if;

  if p_ticket_hash !~ '^[0-9a-f]{64}$'
     or p_ticket_expires_at <= now()
     or p_ticket_expires_at > now() + interval '2 minutes' then
    return 'bad_ticket';
  end if;

  update public.auth_email_otp_challenges set consumed_at = now()
  where challenge_id = p_challenge_id;

  insert into public.auth_email_otp_tickets (
    ticket_hash, user_id, session_id, email, expires_at
  ) values (
    p_ticket_hash, v_challenge.user_id, v_challenge.session_id,
    v_challenge.email, p_ticket_expires_at
  );

  return 'ok';
end;
$$;
revoke all on function public.consume_email_otp_challenge(uuid, text, uuid, boolean, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.consume_email_otp_challenge(uuid, text, uuid, boolean, text, timestamptz)
  to service_role;

create or replace function public.redeem_email_otp_ticket(
  p_user_id uuid, p_session_id text, p_ticket_hash text, p_mfa_expires_at timestamptz
)
returns table (user_id uuid, email text)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_ticket public.auth_email_otp_tickets%rowtype;
  v_expiry timestamptz;
begin
  select * into v_ticket
  from public.auth_email_otp_tickets
  where ticket_hash = p_ticket_hash and user_id = p_user_id and session_id = p_session_id
  for update;

  if not found or v_ticket.used_at is not null or v_ticket.expires_at <= now() then
    return;
  end if;

  update public.auth_email_otp_tickets set used_at = now()
  where ticket_hash = p_ticket_hash;

  v_expiry := least(p_mfa_expires_at, now() + interval '12 hours');
  insert into public.auth_mfa_sessions (user_id, session_id, verified_at, expires_at)
  values (v_ticket.user_id, v_ticket.session_id, now(), v_expiry)
  on conflict (user_id, session_id)
  do update set verified_at = excluded.verified_at, expires_at = excluded.expires_at;

  return query select v_ticket.user_id, v_ticket.email;
end;
$$;
revoke all on function public.redeem_email_otp_ticket(uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.redeem_email_otp_ticket(uuid, text, text, timestamptz)
  to service_role;
