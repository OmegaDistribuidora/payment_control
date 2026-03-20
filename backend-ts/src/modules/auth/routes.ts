import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { badRequest, forbidden } from '../../http/http-error.js';
import {
  buildAuthProfile,
  canManageUsers,
  changeOwnPassword,
  createUser,
  findAuthUserByUsername,
  inactivateUser,
  listAvailableUsers,
  listLoginOptions,
  listManageableUsers,
  updateUser,
} from '../../auth/users.js';
import { isConsumedSsoToken, markConsumedSsoToken, signAuthToken, verifyEcosystemSsoToken } from '../../auth/tokenAuth.js';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/auth/sso/exchange', async (request, reply) => {
    if (!env.ecosystemSso.sharedSecret) {
      return reply.status(404).send({ message: 'Login delegado indisponivel.' });
    }

    const body = request.body as { token?: unknown } | undefined;
    const ssoToken = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!ssoToken) {
      return reply.status(400).send({ message: 'Token SSO obrigatorio.' });
    }

    let payload;
    try {
      payload = verifyEcosystemSsoToken(ssoToken);
    } catch {
      return reply.status(401).send({ message: 'Token SSO invalido ou expirado.' });
    }

    if (isConsumedSsoToken(payload.jti)) {
      return reply.status(401).send({ message: 'Token SSO ja utilizado.' });
    }

    const targetLogin = String(payload.targetLogin || '').trim().toLowerCase();
    if (!targetLogin) {
      return reply.status(400).send({ message: 'Token SSO sem login de destino.' });
    }

    const authUser = await findAuthUserByUsername(targetLogin);
    if (!authUser) {
      return reply.status(401).send({ message: 'Usuario alvo nao encontrado ou inativo.' });
    }

    markConsumedSsoToken(payload.jti, payload.exp);

    return {
      token: signAuthToken(authUser),
      user: {
        username: authUser.username,
        role: authUser.role,
      },
    };
  });

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
    if (!canManageUsers(authUser)) {
      forbidden('Usuario sem permissao para gerenciar usuarios.');
    }
    const users = await listManageableUsers();
    return {
      content: users,
    };
  });

  app.get('/api/auth/me', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    return buildAuthProfile(authUser);
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

  app.put('/api/auth/users/:username', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    const params = request.params as { username?: string };
    return updateUser(authUser, {
      ...(request.body as Record<string, unknown>),
      username: params.username,
    });
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
