import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import { badRequest, forbidden } from '../../http/http-error.js';
import { canManageDespesas, canManageSetores, listManageableUsers, type AuthUser } from '../../auth/users.js';
import { trimToNull } from '../../http/utils.js';
import { logAudit } from '../../audit/service.js';

export type ReferenceItem = {
  codigo: number;
  nome: string;
};

export type DespesaItem = {
  codigo: number;
  nome: string;
  codMt: number;
  dspCent: string;
};

export type ColaboradorItem = {
  codigo: number;
  nome: string;
  email: string | null;
};

export type ManagedReferenceItem = {
  codigo: number;
  nome: string;
  ativo: boolean;
};

export type ReferenceBundle = {
  setores: ReferenceItem[];
  despesas: DespesaItem[];
  sedes: ReferenceItem[];
  dotacoes: ReferenceItem[];
  empresas: ReferenceItem[];
  fornecedores: ReferenceItem[];
  colaboradores: ColaboradorItem[];
  usuarios: Array<{ username: string; role: string; origem: 'padrao' | 'custom' }>;
  setorDespesas: Record<string, string[]>;
};

const CACHE_TTL_MS = 1000 * 60 * 5;
const DEFAULT_EMPRESAS = ['J2A'];
let cachedBundle: ReferenceBundle | null = null;
let cacheAt = 0;

async function ensureReferenceStatusColumns(client?: PoolClient): Promise<void> {
  const executor = client ?? pool;
  await executor.query('alter table if exists ref_setor add column if not exists ativo boolean not null default true');
  await executor.query('alter table if exists ref_despesa add column if not exists ativo boolean not null default true');
  await executor.query('alter table if exists ref_empresa add column if not exists ativo boolean not null default true');
  await executor.query('alter table if exists ref_fornecedor add column if not exists ativo boolean not null default true');
}

async function hasSetorDespesasTable(client?: PoolClient): Promise<boolean> {
  const executor = client ?? pool;
  const { rows } = await executor.query<{ exists: string | null }>(
    `select to_regclass('public.ref_setor_despesa') as exists`,
  );
  return Boolean(rows[0]?.exists);
}

async function listSimple(table: 'ref_setor' | 'ref_dspcent' | 'ref_empresa' | 'ref_fornecedor' | 'ref_sede' | 'ref_dotacao'): Promise<ReferenceItem[]> {
  const { rows } = await pool.query<ReferenceItem>(`select codigo, nome from ${table} order by codigo`);
  return rows;
}

async function listActiveSimple(table: 'ref_setor' | 'ref_empresa' | 'ref_fornecedor'): Promise<ReferenceItem[]> {
  await ensureReferenceStatusColumns();
  const { rows } = await pool.query<ReferenceItem>(`select codigo, nome from ${table} where ativo = true order by codigo`);
  return rows;
}

async function listManagedSimple(table: 'ref_setor' | 'ref_empresa' | 'ref_fornecedor'): Promise<ManagedReferenceItem[]> {
  await ensureReferenceStatusColumns();
  const { rows } = await pool.query<ManagedReferenceItem>(`select codigo, nome, ativo from ${table} order by lower(nome)`);
  return rows;
}

export async function listSetores(): Promise<ReferenceItem[]> {
  const cached = getCachedBundle();
  return cached ? cached.setores : listActiveSimple('ref_setor');
}

export async function listDspCentros(): Promise<ReferenceItem[]> {
  return listSimple('ref_dspcent');
}

export async function listDespesas(codMt?: number): Promise<DespesaItem[]> {
  const maybeCached = getCachedBundle();
  if (maybeCached && (codMt === undefined || codMt === null)) {
    return maybeCached.despesas;
  }

  if (codMt === undefined || codMt === null) {
    await ensureReferenceStatusColumns();
    const { rows } = await pool.query<DespesaItem>(`
      select d.codigo, d.nome, d.cod_mt as "codMt", c.nome as "dspCent"
      from ref_despesa d
      join ref_dspcent c on c.codigo = d.cod_mt
      where d.ativo = true
      order by d.codigo
    `);
    return rows;
  }

  await ensureReferenceStatusColumns();
  const { rows } = await pool.query<DespesaItem>(
    `
      select d.codigo, d.nome, d.cod_mt as "codMt", c.nome as "dspCent"
      from ref_despesa d
      join ref_dspcent c on c.codigo = d.cod_mt
      where d.cod_mt = $1
        and d.ativo = true
      order by d.codigo
    `,
    [codMt],
  );
  return rows;
}

export async function listEmpresas(): Promise<ReferenceItem[]> {
  await ensureDefaultEmpresas();
  const cached = getCachedBundle();
  return cached ? cached.empresas : listActiveSimple('ref_empresa');
}

export async function listFornecedores(): Promise<ReferenceItem[]> {
  const cached = getCachedBundle();
  return cached ? cached.fornecedores : listActiveSimple('ref_fornecedor');
}

export async function listSedes(): Promise<ReferenceItem[]> {
  const cached = getCachedBundle();
  return cached ? cached.sedes : listSimple('ref_sede');
}

export async function listDotacoes(): Promise<ReferenceItem[]> {
  const cached = getCachedBundle();
  return cached ? cached.dotacoes : listSimple('ref_dotacao');
}

export async function listColaboradores(): Promise<ColaboradorItem[]> {
  const cached = getCachedBundle();
  if (cached) return cached.colaboradores;
  const { rows } = await pool.query<ColaboradorItem>('select codigo, nome, email from ref_colaborador order by codigo');
  return rows;
}

export async function listSetorDespesas(): Promise<Record<string, string[]>> {
  const cached = getCachedBundle();
  if (cached) return cached.setorDespesas;

  if (!(await hasSetorDespesasTable())) {
    return {};
  }
  const { rows } = await pool.query<{ setor_nome: string; despesa_nome: string }>(`
    select s.nome as setor_nome, d.nome as despesa_nome
    from ref_setor_despesa sd
    join ref_setor s on s.codigo = sd.setor_codigo
    join ref_despesa d on d.codigo = sd.despesa_codigo
    where coalesce(s.ativo, true) = true
      and coalesce(d.ativo, true) = true
    order by lower(s.nome), lower(d.nome)
  `);

  return rows.reduce<Record<string, string[]>>((acc, row) => {
    if (!acc[row.setor_nome]) acc[row.setor_nome] = [];
    acc[row.setor_nome].push(row.despesa_nome);
    return acc;
  }, {});
}

export async function listTudo(): Promise<ReferenceBundle> {
  const bundle: ReferenceBundle = {
    setores: await listSetores(),
    despesas: await listDespesas(),
    sedes: await listSedes(),
    dotacoes: await listDotacoes(),
    empresas: await listEmpresas(),
    fornecedores: await listFornecedores(),
    colaboradores: await listColaboradores(),
    usuarios: await listManageableUsers(),
    setorDespesas: await listSetorDespesas(),
  };
  cacheBundle(bundle);
  return bundle;
}

export function clearCache(): void {
  cachedBundle = null;
  cacheAt = 0;
}

function getCachedBundle(): ReferenceBundle | null {
  if (!cachedBundle) return null;
  if (Date.now() - cacheAt > CACHE_TTL_MS) {
    cachedBundle = null;
    cacheAt = 0;
    return null;
  }
  return cachedBundle;
}

function cacheBundle(bundle: ReferenceBundle): void {
  cachedBundle = bundle;
  cacheAt = Date.now();
}

async function findCodigoByNome(client: PoolClient, table: string, nome: string): Promise<number | null> {
  const { rows } = await client.query<{ codigo: number }>(
    `select codigo from ${table} where lower(nome) = lower($1) limit 1`,
    [nome],
  );
  return rows[0]?.codigo ?? null;
}

async function existsDespesaByNome(client: PoolClient, nome: string): Promise<boolean> {
  const { rowCount } = await client.query('select 1 from ref_despesa where lower(nome) = lower($1) limit 1', [nome]);
  return (rowCount ?? 0) > 0;
}

async function nextCodigo(client: PoolClient, table: string): Promise<number> {
  const { rows } = await client.query<{ proximo: number }>(`select coalesce(max(codigo), 0) + 1 as proximo from ${table}`);
  return rows[0]?.proximo ?? 1;
}

export async function ensureDefaultEmpresas(client?: PoolClient): Promise<void> {
  const ownsClient = !client;
  const executor = client ?? (await pool.connect());
  let inserted = false;

  try {
    await ensureReferenceStatusColumns(executor);
    for (const nome of DEFAULT_EMPRESAS) {
      const codigoExistente = await findCodigoByNome(executor, 'ref_empresa', nome);
      if (codigoExistente) continue;
      const codigo = await nextCodigo(executor, 'ref_empresa');
      await executor.query('insert into ref_empresa (codigo, nome, ativo) values ($1, $2, true)', [codigo, nome]);
      inserted = true;
    }
  } finally {
    if (inserted) {
      clearCache();
    }
    if (ownsClient) {
      executor.release();
    }
  }
}

export async function listManagedSetores(): Promise<ManagedReferenceItem[]> {
  return listManagedSimple('ref_setor');
}

export async function listManagedEmpresas(): Promise<ManagedReferenceItem[]> {
  await ensureDefaultEmpresas();
  return listManagedSimple('ref_empresa');
}

export async function listManagedFornecedores(): Promise<ManagedReferenceItem[]> {
  return listManagedSimple('ref_fornecedor');
}

export async function listManagedDespesas(): Promise<ManagedReferenceItem[]> {
  await ensureReferenceStatusColumns();
  const { rows } = await pool.query<ManagedReferenceItem>(
    'select codigo, nome, ativo from ref_despesa order by lower(nome)',
  );
  return rows;
}

export async function salvarEmpresaFornecedorConfig(
  authUser: AuthUser,
  payload: unknown,
): Promise<ReferenceBundle> {
  if (!canManageSetores(authUser)) {
    forbidden('Acao permitida somente para admin.');
  }

  const body = (payload ?? {}) as { tipo?: string; nome?: string };
  const tipo = trimToNull(body.tipo)?.toLowerCase();
  const nome = trimToNull(body.nome);
  if (tipo !== 'empresa' && tipo !== 'fornecedor') {
    badRequest('Tipo invalido. Use empresa ou fornecedor.');
  }
  if (!nome) {
    badRequest('Nome obrigatorio.');
  }

  const tabela = tipo === 'empresa' ? 'ref_empresa' : 'ref_fornecedor';
  const entidade = tipo;

  const client = await pool.connect();
  try {
    await client.query('begin');
    await ensureReferenceStatusColumns(client);
    const existente = await findCodigoByNome(client, tabela, nome);
    if (existente) {
      badRequest(`${entidade === 'empresa' ? 'Empresa' : 'Fornecedor'} ja existe.`);
    }
    const codigo = await nextCodigo(client, tabela);
    await client.query(`insert into ${tabela} (codigo, nome, ativo) values ($1, $2, true)`, [codigo, nome]);
    await logAudit(client, {
      entityType: entidade,
      entityId: nome,
      action: 'CRIADO',
      actor: authUser.username,
      details: {
        descricao: `${entidade === 'empresa' ? 'Empresa' : 'Fornecedor'} ${nome} criado por ${authUser.username}`,
        snapshot: { nome, tipo: entidade },
      },
    });
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  clearCache();
  return listTudo();
}

async function inactivateReference(
  authUser: AuthUser,
  table: 'ref_setor' | 'ref_despesa' | 'ref_empresa' | 'ref_fornecedor',
  entityType: 'setor' | 'despesa' | 'empresa' | 'fornecedor',
  nomeRaw: unknown,
): Promise<{ nome: string; ativo: false }> {
  if (!canManageSetores(authUser)) {
    forbidden('Acao permitida somente para admin.');
  }

  const nome = trimToNull(nomeRaw);
  if (!nome) {
    badRequest('Nome obrigatorio.');
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    await ensureReferenceStatusColumns(client);
    const codigo = await findCodigoByNome(client, table, nome);
    if (!codigo) {
      badRequest('Registro nao encontrado.');
    }
    await client.query(`update ${table} set ativo = false where codigo = $1`, [codigo]);
    await logAudit(client, {
      entityType,
      entityId: nome,
      action: 'INATIVADO',
      actor: authUser.username,
      details: {
        descricao: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${nome} inativado por ${authUser.username}`,
      },
    });
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  clearCache();
  return { nome, ativo: false };
}

export async function inativarSetor(authUser: AuthUser, nome: unknown): Promise<{ nome: string; ativo: false }> {
  return inactivateReference(authUser, 'ref_setor', 'setor', nome);
}

export async function inativarDespesa(authUser: AuthUser, nome: unknown): Promise<{ nome: string; ativo: false }> {
  return inactivateReference(authUser, 'ref_despesa', 'despesa', nome);
}

export async function inativarEmpresa(authUser: AuthUser, nome: unknown): Promise<{ nome: string; ativo: false }> {
  return inactivateReference(authUser, 'ref_empresa', 'empresa', nome);
}

export async function inativarFornecedor(authUser: AuthUser, nome: unknown): Promise<{ nome: string; ativo: false }> {
  return inactivateReference(authUser, 'ref_fornecedor', 'fornecedor', nome);
}

async function updateReferenceName(
  authUser: AuthUser,
  options: {
    table: 'ref_setor' | 'ref_despesa';
    entityType: 'setor' | 'despesa';
    oldNameRaw: unknown;
    newNameRaw: unknown;
  },
): Promise<ReferenceBundle> {
  const isSetor = options.entityType === 'setor';
  if (isSetor) {
    if (!canManageSetores(authUser)) {
      forbidden('Acao permitida somente para usuarios com acesso a setor.');
    }
  } else if (!canManageDespesas(authUser)) {
    forbidden('Acao permitida somente para usuarios com acesso a despesa.');
  }

  const oldName = trimToNull(options.oldNameRaw);
  const newName = trimToNull(options.newNameRaw);
  if (!oldName) {
    badRequest(`Nome atual de ${options.entityType} obrigatorio.`);
  }
  if (!newName) {
    badRequest(`Novo nome de ${options.entityType} obrigatorio.`);
  }
  if (oldName.toLowerCase() === newName.toLowerCase()) {
    badRequest('Informe um nome diferente do atual.');
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const codigo = await findCodigoByNome(client, options.table, oldName);
    if (!codigo) {
      badRequest(`${options.entityType === 'setor' ? 'Setor' : 'Despesa'} nao encontrado.`);
    }
    const existingTarget = await findCodigoByNome(client, options.table, newName);
    if (existingTarget) {
      badRequest(`${options.entityType === 'setor' ? 'Setor' : 'Despesa'} com esse nome ja existe.`);
    }

    await client.query(`update ${options.table} set nome = $1 where codigo = $2`, [newName, codigo]);

    if (isSetor) {
      await client.query(
        `
          update ref_dspcent
          set nome = $1
          where lower(nome) = lower($2)
        `,
        [newName, oldName],
      );
      await client.query(
        `
          update pagamentos
          set
            setor = case when lower(setor) = lower($2) then $1 else setor end,
            setor_norm = case when lower(setor) = lower($2) then lower($1) else setor_norm end,
            setor_pagamento = case when lower(setor_pagamento) = lower($2) then $1 else setor_pagamento end
          where lower(setor) = lower($2) or lower(setor_pagamento) = lower($2)
        `,
        [newName, oldName],
      );
    } else {
      await client.query(
        `
          update pagamentos
          set
            despesa = $1,
            despesa_norm = lower($1)
          where lower(despesa) = lower($2)
        `,
        [newName, oldName],
      );
    }

    await logAudit(client, {
      entityType: options.entityType,
      entityId: newName,
      action: 'ATUALIZADO',
      actor: authUser.username,
      details: {
        descricao: `${options.entityType === 'setor' ? 'Setor' : 'Despesa'} ${oldName} renomeado para ${newName} por ${authUser.username}`,
        changes: {
          nome: { de: oldName, para: newName },
        },
      },
    });

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  clearCache();
  return listTudo();
}

export async function editarSetor(authUser: AuthUser, payload: unknown): Promise<ReferenceBundle> {
  const body = (payload ?? {}) as { nomeAtual?: unknown; novoNome?: unknown };
  return updateReferenceName(authUser, {
    table: 'ref_setor',
    entityType: 'setor',
    oldNameRaw: body.nomeAtual,
    newNameRaw: body.novoNome,
  });
}

export async function editarDespesa(authUser: AuthUser, payload: unknown): Promise<ReferenceBundle> {
  const body = (payload ?? {}) as { nomeAtual?: unknown; novoNome?: unknown };
  return updateReferenceName(authUser, {
    table: 'ref_despesa',
    entityType: 'despesa',
    oldNameRaw: body.nomeAtual,
    newNameRaw: body.novoNome,
  });
}

export async function salvarSetorConfig(authUser: AuthUser, payload: unknown): Promise<ReferenceBundle> {
  if (!canManageSetores(authUser)) {
    forbidden('Acao permitida somente para admin.');
  }

  const body = (payload ?? {}) as { nome?: string; despesas?: string[] };
  const setorNome = trimToNull(body.nome);
  if (!setorNome) {
    badRequest('Nome do setor e obrigatorio.');
  }

  const despesas = Array.isArray(body.despesas)
    ? body.despesas.map((item) => trimToNull(item)).filter((item): item is string => Boolean(item))
    : [];
  if (despesas.length === 0) {
    badRequest('Informe ao menos uma despesa para o setor.');
  }

  const uniqueDespesas = [...new Set(despesas)];

  const client = await pool.connect();
  try {
    await client.query('begin');
    if (!(await hasSetorDespesasTable(client))) {
      badRequest('Tabela ref_setor_despesa nao encontrada no banco.');
    }

    let setorCodigo = await findCodigoByNome(client, 'ref_setor', setorNome);
    const setorJaExistia = Boolean(setorCodigo);
    if (!setorCodigo) {
      setorCodigo = await nextCodigo(client, 'ref_setor');
      await client.query('insert into ref_setor (codigo, nome) values ($1, $2)', [setorCodigo, setorNome]);
    }

    let codMt = await findCodigoByNome(client, 'ref_dspcent', setorNome);
    if (!codMt) {
      codMt = await nextCodigo(client, 'ref_dspcent');
      await client.query('insert into ref_dspcent (codigo, nome) values ($1, $2)', [codMt, setorNome]);
    }

    const despesasCodigos: number[] = [];
    for (const despesaNome of uniqueDespesas) {
      if (await existsDespesaByNome(client, despesaNome)) {
        badRequest(`Despesa ja existe: ${despesaNome}. Informe uma despesa nova.`);
      }
      const despesaCodigo = await nextCodigo(client, 'ref_despesa');
      await client.query('insert into ref_despesa (codigo, nome, cod_mt) values ($1, $2, $3)', [
        despesaCodigo,
        despesaNome,
        codMt,
      ]);
      despesasCodigos.push(despesaCodigo);
    }

    await client.query('delete from ref_setor_despesa where setor_codigo = $1', [setorCodigo]);
    for (const despesaCodigo of despesasCodigos) {
      await client.query(
        'insert into ref_setor_despesa (setor_codigo, despesa_codigo) values ($1, $2) on conflict do nothing',
        [setorCodigo, despesaCodigo],
      );
    }

    await logAudit(client, {
      entityType: 'setor',
      entityId: setorNome,
      action: setorJaExistia ? 'ATUALIZADO' : 'CRIADO',
      actor: authUser.username,
      details: {
        descricao: setorJaExistia
          ? `Setor ${setorNome} atualizado por ${authUser.username}`
          : `Setor ${setorNome} criado por ${authUser.username}`,
        snapshot: {
          setor: setorNome,
          despesas: uniqueDespesas,
        },
      },
    });

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  clearCache();
  return listTudo();
}

export async function salvarDespesaConfig(authUser: AuthUser, payload: unknown): Promise<ReferenceBundle> {
  if (!canManageDespesas(authUser)) {
    forbidden('Acao permitida somente para admin e RH.');
  }

  const body = (payload ?? {}) as { setor?: string; despesa?: string };
  const setorNome = trimToNull(body.setor);
  const despesaNome = trimToNull(body.despesa);
  if (!setorNome) badRequest('Setor e obrigatorio.');
  if (!despesaNome) badRequest('Nome da despesa e obrigatorio.');

  const client = await pool.connect();
  try {
    await client.query('begin');
    if (!(await hasSetorDespesasTable(client))) {
      badRequest('Tabela ref_setor_despesa nao encontrada no banco.');
    }

    const setorCodigo = await findCodigoByNome(client, 'ref_setor', setorNome);
    if (!setorCodigo) badRequest('Setor invalido.');

    if (await existsDespesaByNome(client, despesaNome)) {
      badRequest(`Despesa ja existe: ${despesaNome}. Informe uma despesa nova.`);
    }

    let codMt = await findCodigoByNome(client, 'ref_dspcent', setorNome);
    if (!codMt) {
      codMt = await nextCodigo(client, 'ref_dspcent');
      await client.query('insert into ref_dspcent (codigo, nome) values ($1, $2)', [codMt, setorNome]);
    }

    const despesaCodigo = await nextCodigo(client, 'ref_despesa');
    await client.query('insert into ref_despesa (codigo, nome, cod_mt) values ($1, $2, $3)', [
      despesaCodigo,
      despesaNome,
      codMt,
    ]);
    await client.query(
      'insert into ref_setor_despesa (setor_codigo, despesa_codigo) values ($1, $2) on conflict do nothing',
      [setorCodigo, despesaCodigo],
    );

    await logAudit(client, {
      entityType: 'despesa',
      entityId: despesaNome,
      action: 'CRIADO',
      actor: authUser.username,
      details: {
        descricao: `Despesa ${despesaNome} criada no setor ${setorNome} por ${authUser.username}`,
        snapshot: {
          setor: setorNome,
          despesa: despesaNome,
        },
      },
    });

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  clearCache();
  return listTudo();
}
