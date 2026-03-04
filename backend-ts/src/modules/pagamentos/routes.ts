import type { FastifyInstance } from 'fastify';
import { badRequest } from '../../http/http-error.js';
import {
  buscarMeu,
  criarPagamento,
  deletarPagamento,
  editarPagamento,
  listarHistorico,
  listarMeus,
  normalizeCampos,
  somarMeus,
} from './service.js';

function readId(value: string): number {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) {
    badRequest('ID invalido.');
  }
  return id;
}

export async function registerPagamentoRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/pagamentos/meus', async (request) => {
    const authUser = request.authUser;
    if (!authUser) badRequest('Usuario autenticado nao encontrado.');
    const query = request.query as Record<string, unknown>;
    return listarMeus(authUser, query as Record<string, string | undefined>, query);
  });

  app.get('/api/pagamentos/meus/total', async (request) => {
    const authUser = request.authUser;
    if (!authUser) badRequest('Usuario autenticado nao encontrado.');
    const query = request.query as Record<string, string | undefined>;
    return somarMeus(authUser, query);
  });

  app.get('/api/pagamentos/:id', async (request) => {
    const authUser = request.authUser;
    if (!authUser) badRequest('Usuario autenticado nao encontrado.');
    const id = readId((request.params as { id: string }).id);
    return buscarMeu(authUser, id);
  });

  app.get('/api/pagamentos/:id/historico', async (request) => {
    const authUser = request.authUser;
    if (!authUser) badRequest('Usuario autenticado nao encontrado.');
    const id = readId((request.params as { id: string }).id);
    return listarHistorico(authUser, id);
  });

  app.post('/api/pagamentos', async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) badRequest('Usuario autenticado nao encontrado.');
    const created = await criarPagamento(authUser, request.body);
    reply.status(201);
    return created;
  });

  app.put('/api/pagamentos/:id', async (request) => {
    const authUser = request.authUser;
    if (!authUser) badRequest('Usuario autenticado nao encontrado.');
    const id = readId((request.params as { id: string }).id);
    return editarPagamento(authUser, id, request.body);
  });

  app.delete('/api/pagamentos/:id', async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) badRequest('Usuario autenticado nao encontrado.');
    const id = readId((request.params as { id: string }).id);
    await deletarPagamento(authUser, id);
    reply.status(204).send();
  });

  app.post('/api/pagamentos/normalize', async (request) => {
    const authUser = request.authUser;
    if (!authUser) badRequest('Usuario autenticado nao encontrado.');
    return normalizeCampos(authUser);
  });
}
