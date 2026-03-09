import type { FastifyInstance } from 'fastify';
import { badRequest } from '../http/http-error.js';
import { listGlobalHistory } from './service.js';

export async function registerAuditRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/auditoria', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    return listGlobalHistory(authUser, request.query as Record<string, string | undefined>);
  });
}
