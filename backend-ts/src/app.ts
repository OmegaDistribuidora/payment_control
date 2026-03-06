import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { HttpError } from './http/http-error.js';
import { requireBasicAuth } from './auth/basicAuth.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { registerReferenceRoutes } from './modules/references/routes.js';
import { registerPagamentoRoutes } from './modules/pagamentos/routes.js';

export function createApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const isAllowed = env.corsAllowedOrigins.includes(origin);
      callback(null, isAllowed);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.addHook('onRequest', requireBasicAuth);
  app.addHook('preHandler', async (request, reply) => {
    if (!env.readOnly) return;
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return;
    if (!request.url.startsWith('/api/')) return;
    reply.status(503).send({
      timestamp: new Date().toISOString(),
      status: 503,
      error: 'READ_ONLY',
      message: 'API em modo somente leitura (APP_READ_ONLY=true).',
      path: request.url,
    });
  });

  app.get('/ping', async (_request, reply) => {
    reply.type('text/plain').send('pong');
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      const payload: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        status: error.status,
        error: String(error.status),
        message: error.message,
        path: request.url,
      };
      if (error.details) {
        payload.fields = error.details;
      }
      reply.status(error.status).send(payload);
      return;
    }

    request.log.error(error);
    reply.status(500).send({
      timestamp: new Date().toISOString(),
      status: 500,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Internal Server Error',
      path: request.url,
    });
  });

  app.register(registerAuthRoutes);
  app.register(registerReferenceRoutes);
  app.register(registerPagamentoRoutes);

  return app;
}
