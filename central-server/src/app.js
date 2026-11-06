import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { loadConfig } from './config.js';
import { createAdminClient } from './supabase.js';
import { createGmailTransport } from './email.js';
import { registerOtpRoutes } from './routes/otp.js';

export async function buildApp(env = process.env) {
  const config = loadConfig(env);
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
        censor: '[REDACTED]'
      }
    },
    bodyLimit: 16 * 1024,
    trustProxy: config.trustProxy
  });

  const adminClient = createAdminClient(config);
  const mailTransport = createGmailTransport(config);

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      return callback(null, config.allowedOrigins.has(origin));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
    credentials: false
  });

  await app.register(rateLimit, {
    global: false,
    keyGenerator: request => request.ip,
    errorResponseBuilder: () => ({
      message: 'Too many requests. Please wait a little and try again.'
    })
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Cache-Control', 'no-store, max-age=0');
    reply.header('Pragma', 'no-cache');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cross-Origin-Resource-Policy', 'same-site');
    return payload;
  });

  app.get('/healthz', async () => ({
    status: 'ok',
    service: 'Website Builders BD Central OTP'
  }));

  await app.register(async scoped => {
    await registerOtpRoutes(scoped, { config, adminClient, mailTransport });
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode = Number(error.statusCode) >= 400 && Number(error.statusCode) < 600
      ? Number(error.statusCode)
      : (error.validation ? 400 : 500);

    if (statusCode >= 500) {
      request.log.error({
        requestId: request.id,
        errorName: error.name || 'Error',
        errorCode: error.code || 'INTERNAL_ERROR'
      }, 'Central OTP request failed');
    } else {
      request.log.info({ requestId: request.id, statusCode }, 'Central OTP request rejected');
    }

    const message = statusCode === 400 && error.validation
      ? 'The request data is invalid.'
      : (statusCode >= 500 ? 'The verification service is temporarily unavailable.' : error.message);

    reply.code(statusCode).send({ message });
  });

  return { app, config, mailTransport };
}
