import { randomUUID } from 'node:crypto';
import {
  digestOtp, digestTicket, makeOneTimeTicket, makeOtp, safeEqualHex
} from '../crypto.js';
import { authenticateSupabaseRequest } from '../supabase.js';
import { sendOtpEmail } from '../email.js';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function verifyProjectSlug(body, config) {
  if (body.projectSlug !== config.projectSlug) {
    throw httpError(403, 'This request is not for Website Builders BD.');
  }
}

function verifyIdentity(body, auth) {
  if (body.userId !== auth.userId) {
    throw httpError(403, 'The login session does not match this account.');
  }
  if (body.email && String(body.email).trim().toLowerCase() !== auth.email) {
    throw httpError(403, 'The email does not match the signed-in account.');
  }
}

function rpcFailure(error) {
  const message = String(error?.message || '');
  if (message.includes('OTP_COOLDOWN')) {
    return httpError(429, 'Please wait before requesting another code.');
  }
  if (message.includes('OTP_RATE_LIMIT')) {
    return httpError(429, 'Too many verification codes were requested. Try again later.');
  }
  return httpError(503, 'The verification service is temporarily unavailable. Please try again later.');
}

export async function registerOtpRoutes(app, { config, adminClient, mailTransport }) {
  const authenticate = async (request, reply) =>
    authenticateSupabaseRequest(request, reply, adminClient);

  app.post('/api/v1/public/otp/send', {
    preHandler: authenticate,
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['projectSlug', 'email', 'userId'],
        properties: {
          projectSlug: { type: 'string', minLength: 3, maxLength: 64 },
          email: { type: 'string', minLength: 5, maxLength: 254 },
          userId: { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' }
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body;
    verifyProjectSlug(body, config);
    verifyIdentity(body, request.auth);

    const challengeId = randomUUID();
    const code = makeOtp();
    const codeHash = digestOtp(
      config.otpPepper, config.projectSlug, request.auth.userId,
      request.auth.sessionId, challengeId, code
    );
    const now = Date.now();

    const { error } = await adminClient.rpc('create_email_otp_challenge', {
      p_challenge_id: challengeId,
      p_user_id: request.auth.userId,
      p_session_id: request.auth.sessionId,
      p_email: request.auth.email,
      p_code_hash: codeHash,
      p_expires_at: new Date(now + config.otpTtlSeconds * 1000).toISOString(),
      p_resend_after: new Date(now + config.resendAfterSeconds * 1000).toISOString()
    });

    if (error) {
      request.log.warn({ dbCode: error.code || 'unknown' }, 'Could not create OTP challenge');
      throw rpcFailure(error);
    }

    try {
      await sendOtpEmail(mailTransport, config, request.auth.email, code);
    } catch (mailError) {
      await adminClient.rpc('invalidate_email_otp_challenge', {
        p_user_id: request.auth.userId,
        p_session_id: request.auth.sessionId,
        p_challenge_id: challengeId
      }).catch(() => {});
      request.log.error({ mailCode: mailError?.code || 'SMTP_ERROR' }, 'OTP email delivery failed');
      throw httpError(502, 'The verification email could not be sent. Please try again later.');
    }

    return reply.code(200).send({
      challengeId,
      expiresIn: config.otpTtlSeconds,
      resendAfter: config.resendAfterSeconds
    });
  });

  app.post('/api/v1/public/otp/verify', {
    preHandler: authenticate,
    config: { rateLimit: { max: 15, timeWindow: '15 minutes' } },
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['projectSlug', 'email', 'userId', 'challengeId', 'code'],
        properties: {
          projectSlug: { type: 'string', minLength: 3, maxLength: 64 },
          email: { type: 'string', minLength: 5, maxLength: 254 },
          userId: { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' },
          challengeId: { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' },
          code: { type: 'string', pattern: '^[0-9]{6}$' }
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body;
    verifyProjectSlug(body, config);
    verifyIdentity(body, request.auth);

    const { data: challenge, error: lookupError } = await adminClient
      .from('auth_email_otp_challenges')
      .select('code_hash')
      .eq('challenge_id', body.challengeId)
      .eq('user_id', request.auth.userId)
      .eq('session_id', request.auth.sessionId)
      .maybeSingle();

    if (lookupError) {
      request.log.warn({ dbCode: lookupError.code || 'unknown' }, 'Could not read OTP challenge');
      throw httpError(503, 'The verification service is temporarily unavailable.');
    }
    if (!challenge?.code_hash) {
      throw httpError(400, 'This code is invalid or has expired. Request a new code.');
    }

    const candidateHash = digestOtp(
      config.otpPepper, config.projectSlug, request.auth.userId,
      request.auth.sessionId, body.challengeId, body.code
    );
    const codeMatches = safeEqualHex(challenge.code_hash, candidateHash);
    const ticket = makeOneTimeTicket();
    const ticketHash = digestTicket(
      config.otpPepper, config.projectSlug, request.auth.userId,
      request.auth.sessionId, ticket
    );

    const { data: status, error: consumeError } = await adminClient.rpc('consume_email_otp_challenge', {
      p_user_id: request.auth.userId,
      p_session_id: request.auth.sessionId,
      p_challenge_id: body.challengeId,
      p_code_matches: codeMatches,
      p_ticket_hash: ticketHash,
      p_ticket_expires_at: new Date(Date.now() + 60 * 1000).toISOString()
    });

    if (consumeError) {
      request.log.warn({ dbCode: consumeError.code || 'unknown' }, 'Could not verify OTP');
      throw httpError(503, 'The verification service is temporarily unavailable.');
    }
    if (status === 'locked') throw httpError(429, 'Too many incorrect codes. Request a new code.');
    if (status === 'expired') throw httpError(400, 'This code has expired. Request a new code.');
    if (status === 'used') throw httpError(400, 'This code has already been used. Request a new code.');
    if (status !== 'ok') throw httpError(400, 'The verification code is incorrect. Please try again.');

    return reply.code(200).send({ ticket, expiresIn: 60 });
  });

  app.post('/api/v1/public/otp/ticket/redeem', {
    preHandler: authenticate,
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['projectSlug', 'ticket', 'userId'],
        properties: {
          projectSlug: { type: 'string', minLength: 3, maxLength: 64 },
          ticket: { type: 'string', pattern: '^[A-Za-z0-9_-]{40,64}$' },
          userId: { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' }
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body;
    verifyProjectSlug(body, config);
    verifyIdentity(body, request.auth);

    const ticketHash = digestTicket(
      config.otpPepper, config.projectSlug, request.auth.userId,
      request.auth.sessionId, body.ticket
    );
    const { data, error } = await adminClient.rpc('redeem_email_otp_ticket', {
      p_user_id: request.auth.userId,
      p_session_id: request.auth.sessionId,
      p_ticket_hash: ticketHash,
      p_mfa_expires_at: new Date(Date.now() + config.mfaTtlHours * 60 * 60 * 1000).toISOString()
    });

    if (error) {
      request.log.warn({ dbCode: error.code || 'unknown' }, 'Could not redeem OTP ticket');
      throw httpError(503, 'The verification service is temporarily unavailable.');
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.user_id || row.user_id !== request.auth.userId ||
        String(row.email || '').toLowerCase() !== request.auth.email) {
      throw httpError(400, 'The verification ticket is invalid, expired, or already used.');
    }

    return reply.code(200).send({
      verified: true,
      email: request.auth.email,
      userId: request.auth.userId
    });
  });
}
