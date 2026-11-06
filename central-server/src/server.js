import 'dotenv/config';
import { buildApp } from './app.js';

const { app, config, mailTransport } = await buildApp();

try {
  await mailTransport.verify();
  const address = await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info({ address }, 'Website Builders BD Central OTP server is ready');
} catch (error) {
  app.log.error({
    errorName: error.name || 'Error',
    errorCode: error.code || 'STARTUP_FAILED'
  }, 'Central OTP server could not start. Check the private environment settings.');
  await app.close().catch(() => {});
  process.exitCode = 1;
}

const shutdown = async signal => {
  app.log.info({ signal }, 'Shutting down Central OTP server');
  await app.close();
  await mailTransport.close();
};
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
