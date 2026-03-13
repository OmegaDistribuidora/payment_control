import type { FastifyInstance } from 'fastify';
import {
  clearCache,
  listColaboradores,
  listDespesas,
  listDotacoes,
  listDspCentros,
  listEmpresas,
  listFornecedores,
  listManagedDespesas,
  listManagedEmpresas,
  listManagedFornecedores,
  listManagedSetores,
  listSedes,
  listSetores,
  inativarDespesa,
  inativarEmpresa,
  inativarFornecedor,
  inativarSetor,
  listTudo,
  salvarEmpresaFornecedorConfig,
  salvarDespesaConfig,
  salvarSetorConfig,
} from './service.js';
import { badRequest } from '../../http/http-error.js';

export async function registerReferenceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/referencias/setores', async () => listSetores());
  app.get('/api/referencias/todas', async () => listTudo());
  app.get('/api/referencias/dspcentros', async () => listDspCentros());
  app.get('/api/referencias/empresas', async () => listEmpresas());
  app.get('/api/referencias/fornecedores', async () => listFornecedores());
  app.get('/api/referencias/sedes', async () => listSedes());
  app.get('/api/referencias/dotacoes', async () => listDotacoes());
  app.get('/api/referencias/colaboradores', async () => listColaboradores());
  app.get('/api/referencias/gestao/setores', async () => ({ content: await listManagedSetores() }));
  app.get('/api/referencias/gestao/despesas', async () => ({ content: await listManagedDespesas() }));
  app.get('/api/referencias/gestao/empresas', async () => ({ content: await listManagedEmpresas() }));
  app.get('/api/referencias/gestao/fornecedores', async () => ({ content: await listManagedFornecedores() }));

  app.get('/api/referencias/despesas', async (request) => {
    const raw = (request.query as { codMt?: string }).codMt;
    if (!raw) return listDespesas();
    const codMt = Number(raw);
    if (!Number.isFinite(codMt)) {
      badRequest('Parametro codMt invalido.');
    }
    return listDespesas(codMt);
  });

  app.post('/api/referencias/cache/clear', async () => {
    clearCache();
    return { ok: true };
  });

  app.post('/api/referencias/setores/config', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    return salvarSetorConfig(authUser, request.body);
  });

  app.post('/api/referencias/despesas/config', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    return salvarDespesaConfig(authUser, request.body);
  });

  app.post('/api/referencias/empresas-fornecedores/config', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    return salvarEmpresaFornecedorConfig(authUser, request.body);
  });

  app.post('/api/referencias/setores/inativar', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    const body = request.body as { nome?: unknown };
    return inativarSetor(authUser, body.nome);
  });

  app.post('/api/referencias/despesas/inativar', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    const body = request.body as { nome?: unknown };
    return inativarDespesa(authUser, body.nome);
  });

  app.post('/api/referencias/empresas/inativar', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    const body = request.body as { nome?: unknown };
    return inativarEmpresa(authUser, body.nome);
  });

  app.post('/api/referencias/fornecedores/inativar', async (request) => {
    const authUser = request.authUser;
    if (!authUser) {
      badRequest('Usuario autenticado nao encontrado.');
    }
    const body = request.body as { nome?: unknown };
    return inativarFornecedor(authUser, body.nome);
  });
}
