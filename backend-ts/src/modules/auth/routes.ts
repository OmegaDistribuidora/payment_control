import type { FastifyInstance } from 'fastify';
import { badRequest } from '../../http/http-error.js';
import { changeOwnPassword, createUser, inactivateUser, listAvailableUsers, listLoginOptions, listManageableUsers } from '../../auth/users.js';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/auth/login-options', async () => {
    const users = await listLoginOptions();
    return {
      content: users,
    };
  });

  app.get('/api/auth/users', async () => {
    const users = await listAvailableUsers();
    return {
      content: users,
    };
  });

  app.get('/api/auth/users/manage', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    const users = await listManageableUsers();
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

  app.post('/api/auth/change-password', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    return changeOwnPassword(authUser, request.body as Record<string, unknown>);
  });

  app.post('/api/auth/users/inactivate', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    const body = request.body as { username?: unknown };
    return inactivateUser(authUser, body.username);
  });
}
