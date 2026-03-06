import type { FastifyInstance } from 'fastify';
import { badRequest } from '../../http/http-error.js';
import { createUser, listAvailableUsers } from '../../auth/users.js';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/auth/users', async () => {
    const users = await listAvailableUsers();
    return {
      content: users,
    };
  });

  app.post('/api/auth/users', async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    const created = await createUser(authUser, request.body as Record<string, unknown>);
    reply.status(201);
    return created;
  });
}
