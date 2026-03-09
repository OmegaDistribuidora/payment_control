import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import { badRequest, forbidden } from '../../http/http-error.js';
import { canManageDespesas, canManageSetores, type AuthUser } from '../../auth/users.js';
import { listAvailableUsers } from '../../auth/users.js';
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
let cachedBundle: ReferenceBundle | null = null;
let cacheAt = 0;

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

export async function listSetores(): Promise<ReferenceItem[]> {
  const cached = getCachedBundle();
  return cached ? cached.setores : listSimple('ref_setor');
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
    const { rows } = await pool.query<DespesaItem>(`
      select d.codigo, d.nome, d.cod_mt as "codMt", c.nome as "dspCent"
      from ref_despesa d
      join ref_dspcent c on c.codigo = d.cod_mt
      order by d.codigo
    `);
    return rows;
  }

  const { rows } = await pool.query<DespesaItem>(
    `
      select d.codigo, d.nome, d.cod_mt as "codMt", c.nome as "dspCent"
      from ref_despesa d
      join ref_dspcent c on c.codigo = d.cod_mt
      where d.cod_mt = $1
      order by d.codigo
    `,
    [codMt],
  );
  return rows;
}

export async function listEmpresas(): Promise<ReferenceItem[]> {
  const cached = getCachedBundle();
  return cached ? cached.empresas : listSimple('ref_empresa');
}

export async function listFornecedores(): Promise<ReferenceItem[]> {
  const cached = getCachedBundle();
  return cached ? cached.fornecedores : listSimple('ref_fornecedor');
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
    usuarios: await listAvailableUsers(),
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
