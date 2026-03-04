import type { FastifyInstance } from 'fastify';
import {
  clearCache,
  listColaboradores,
  listDespesas,
  listDotacoes,
  listDspCentros,
  listEmpresas,
  listFornecedores,
  listSedes,
  listSetores,
  listTudo,
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
}
