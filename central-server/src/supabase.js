import { createClient } from '@supabase/supabase-js';

export function createAdminClient(config) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: { 'X-Client-Info': 'website-builders-bd-central-otp/1.0.0' }
    }
  });
}

export function readJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export async function authenticateSupabaseRequest(request, reply, adminClient) {
  const header = String(request.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    reply.code(401).send({ message: 'Your login session is missing. Please sign in again.' });
    return;
  }

  const token = match[1].trim();
  const payload = readJwtPayload(token);
  if (!payload || typeof payload.session_id !== 'string' || !payload.session_id ||
      typeof payload.sub !== 'string' || !payload.sub) {
    reply.code(401).send({ message: 'Your login session is invalid. Please sign in again.' });
    return;
  }

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data?.user || data.user.id !== payload.sub) {
    reply.code(401).send({ message: 'Your login session has expired. Please sign in again.' });
    return;
  }

  const user = data.user;
  const verifiedEmail = String(user.email || '').trim().toLowerCase();
  if (!verifiedEmail || !(user.email_confirmed_at || user.confirmed_at)) {
    reply.code(403).send({ message: 'Please confirm your account email before requesting a login code.' });
    return;
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    reply.code(403).send({ message: 'Your Website Builders BD profile is not ready. Please contact the website owner.' });
    return;
  }

  request.auth = Object.freeze({
    userId: user.id,
    email: verifiedEmail,
    sessionId: payload.session_id
  });
}
