import { createApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './db/pool.js';

const app = createApp();

async function start() {
  await app.listen({ port: env.port, host: '0.0.0.0' });
  app.log.info(`Backend TS ativo na porta ${env.port}`);
}

void start().catch(async (error) => {
  app.log.error(error);
  await closePool().catch(() => undefined);
  process.exit(1);
});

async function shutdown(signal: string) {
  app.log.info(`Encerrando por ${signal}`);
  await app.close().catch(() => undefined);
  await closePool().catch(() => undefined);
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
