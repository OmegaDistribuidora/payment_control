import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import { isPrivileged, perfilCriador, type AuthUser } from '../../auth/users.js';
import { normalizeText, parsePagination, toDateOnlyInFortaleza, toLikePattern, toNumeric, trimToNull } from '../../http/utils.js';
import { badRequest, forbidden, notFound } from '../../http/http-error.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_LANCADO = 'LANCADO';
const MAX_EMPRESA_FORNECEDOR = 255;

type PagamentoRow = {
  id: number;
  codVld: string | null;
  perfilCriador: string | null;
  colaborador: string | null;
  criadoPor: string;
  ultEditadoPor: string | null;
  dtSistema: string;
  dtPagamento: string | null;
  dtVencimento: string | null;
  dtUltEdicao: string;
  status: string;
  sede: string;
  setor: string;
  despesa: string;
  dotacao: string;
  empresaFornecedor: string | null;
  setorPagamento: string | null;
  valorTotal: string;
  descricao: string | null;
};

type RateioRow = {
  nome: string;
  valor: string;
};

type HistoricoRow = {
  id: number;
  pagamentoId: number;
  acao: string;
  detalhes: string | null;
  criadoPor: string | null;
  dtEvento: string;
};

type Filtros = {
  de?: string;
  ate?: string;
  usuario?: string;
  setor?: string;
  despesa?: string;
  dotacao?: string;
  q?: string;
};

type WhereClause = {
  sql: string;
  params: unknown[];
};

type PageResult<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  numberOfElements: number;
};

type RateioInput = {
  nome: string;
  valor: number;
};

type PagamentoPayload = {
  dtPagamento: string | null;
  dtVencimento: string;
  sede: string;
  colaborador: string;
  setor: string;
  despesa: string;
  dotacao: string;
  empresaFornecedor: string | null;
  setorPagamento: string;
  valorTotal: number;
  descricao: string | null;
  rateios: RateioInput[];
};

type Snapshot = {
  dtPagamento: string | null;
  dtVencimento: string | null;
  sede: string | null;
  colaborador: string | null;
  setor: string | null;
  despesa: string | null;
  dotacao: string | null;
  empresaFornecedor: string | null;
  setorPagamento: string | null;
  valorTotal: number;
  descricao: string | null;
  rateios: Array<{ nome: string; valor: number }>;
};

function nowFortalezaSql(): string {
  return "timezone('America/Fortaleza', now())";
}

function ensureDate(value: unknown, field: string): string {
  const text = trimToNull(value);
  if (!text || !DATE_RE.test(text)) {
    badRequest(`${field} invalida.`);
  }
  return text;
}

function ensureOptionalDate(value: unknown, field: string): string | null {
  const text = trimToNull(value);
  if (!text) return null;
  if (!DATE_RE.test(text)) {
    badRequest(`${field} invalida.`);
  }
  return text;
}

function ensureRequiredText(value: unknown, field: string, maxLen: number): string {
  const text = trimToNull(value);
  if (!text) {
    badRequest(`${field} obrigatorio.`);
  }
  if (text.length > maxLen) {
    badRequest(`${field} excede ${maxLen} caracteres.`);
  }
  return text;
}

function ensureOptionalText(value: unknown, field: string, maxLen: number): string | null {
  const text = trimToNull(value);
  if (!text) return null;
  if (text.length > maxLen) {
    badRequest(`${field} excede ${maxLen} caracteres.`);
  }
  return text;
}

function ensurePositiveAmount(value: unknown, field: string): number {
  const amount = toNumeric(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    badRequest(`${field} invalido.`);
  }
  return Number(amount.toFixed(2));
}

function normalizeToLower(value: string): string {
  return value.toLowerCase();
}

function parseRateios(value: unknown): RateioInput[] {
  if (!Array.isArray(value)) return [];
  const result: RateioInput[] = [];
  for (const rawItem of value) {
    const item = rawItem as { nome?: unknown; valor?: unknown };
    const nome = trimToNull(item.nome);
    if (!nome) continue;
    const valor = toNumeric(item.valor);
    if (!Number.isFinite(valor) || valor <= 0) continue;
    const nomeFinal = truncate(nome, MAX_EMPRESA_FORNECEDOR) ?? nome;
    result.push({
      nome: nomeFinal,
      valor: Number(valor.toFixed(2)),
    });
  }
  return result;
}

function truncate(value: string | null, max: number): string | null {
  if (value === null) return null;
  if (value.length <= max) return value;
  return value.slice(0, max);
}

function normalizeDotacao(value: string): string {
  return value.trim().toLowerCase();
}

function isEmpresaDotacao(dotacao: string): boolean {
  return normalizeDotacao(dotacao) === 'empresa';
}

function isFornecedorDotacao(dotacao: string): boolean {
  return normalizeDotacao(dotacao) === 'fornecedor';
}

function isEmpresaFornecedorDotacao(dotacao: string): boolean {
  const norm = normalizeDotacao(dotacao);
  return norm === 'empr/fornecedor' || norm === 'empresa/fornecedor';
}

function serializeDetails(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildSnapshot(row: PagamentoRow, rateios: RateioRow[]): Snapshot {
  return {
    dtPagamento: row.dtPagamento,
    dtVencimento: row.dtVencimento,
    sede: row.sede,
    colaborador: row.colaborador,
    setor: row.setor,
    despesa: row.despesa,
    dotacao: row.dotacao,
    empresaFornecedor: row.empresaFornecedor,
    setorPagamento: row.setorPagamento,
    valorTotal: Number(row.valorTotal),
    descricao: row.descricao,
    rateios: rateios.map((item) => ({ nome: item.nome, valor: Number(item.valor) })),
  };
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildDiff(before: Snapshot, after: Snapshot): Record<string, { de: unknown; para: unknown }> {
  const keys: Array<keyof Snapshot> = [
    'dtPagamento',
    'dtVencimento',
    'sede',
    'colaborador',
    'setor',
    'despesa',
    'dotacao',
    'empresaFornecedor',
    'setorPagamento',
    'valorTotal',
    'descricao',
    'rateios',
  ];

  const diff: Record<string, { de: unknown; para: unknown }> = {};
  for (const key of keys) {
    if (!deepEqual(before[key], after[key])) {
      diff[key] = { de: before[key], para: after[key] };
    }
  }
  return diff;
}

function buildCodVld(id: number, date: string | null, codColab: number | null, codSede: number | null, codSetor: number | null): string {
  const base = date && DATE_RE.test(date) ? date : toDateOnlyInFortaleza();
  const [, month, year] = base.split('-');
  const mm = month;
  const yy = String(Number(year) % 100).padStart(2, '0');
  const colab = codColab ?? 0;
  const sede = codSede ?? 0;
  const setor = codSetor ?? 0;
  return `${String(id).padStart(6, '0')}${mm}${yy}${colab}${sede}${setor}`;
}

async function existsByNome(client: PoolClient, table: string, nome: string): Promise<boolean> {
  const { rowCount } = await client.query(`select 1 from ${table} where lower(nome) = lower($1) limit 1`, [nome]);
  return (rowCount ?? 0) > 0;
}

async function findCodigoByNome(client: PoolClient, table: string, nome: string): Promise<number | null> {
  const { rows } = await client.query<{ codigo: number }>(`select codigo from ${table} where lower(nome) = lower($1) limit 1`, [nome]);
  return rows[0]?.codigo ?? null;
}

async function findCodigoColaboradorByLogin(client: PoolClient, login: string | null): Promise<number | null> {
  if (!login) return null;
  const { rows } = await client.query<{ codigo: number }>(
    `
      select codigo
      from ref_colaborador
      where lower(nome) = lower($1) or lower(email) = lower($2)
      limit 1
    `,
    [login, login],
  );
  return rows[0]?.codigo ?? null;
}

async function validateReferences(client: PoolClient, payload: PagamentoPayload): Promise<void> {
  if (!(await existsByNome(client, 'ref_sede', payload.sede))) {
    badRequest('Sede invalida.');
  }
  if (!(await existsByNome(client, 'ref_setor', payload.setor))) {
    badRequest('Setor invalido.');
  }
  if (!(await existsByNome(client, 'ref_despesa', payload.despesa))) {
    badRequest('Despesa invalida.');
  }
  if (!(await existsByNome(client, 'ref_dotacao', payload.dotacao))) {
    badRequest('Dotacao invalida.');
  }
  if (!(await existsByNome(client, 'ref_setor', payload.setorPagamento))) {
    badRequest('Setor (Quem?) invalido.');
  }
}

async function validateRateioTargets(client: PoolClient, dotacao: string, empresaFornecedor: string | null, rateios: RateioInput[]): Promise<void> {
  const exigeEmpresa = isEmpresaDotacao(dotacao);
  const exigeFornecedor = isFornecedorDotacao(dotacao);
  const permiteAmbos = isEmpresaFornecedorDotacao(dotacao);
  if (!exigeEmpresa && !exigeFornecedor && !permiteAmbos) return;

  const checkName = async (nome: string): Promise<void> => {
    const okEmpresa = await existsByNome(client, 'ref_empresa', nome);
    const okFornecedor = await existsByNome(client, 'ref_fornecedor', nome);
    if (exigeEmpresa && !okEmpresa) {
      badRequest('Empresa invalida.');
    }
    if (exigeFornecedor && !okFornecedor) {
      badRequest('Fornecedor invalido.');
    }
    if (permiteAmbos && !(okEmpresa || okFornecedor)) {
      badRequest('Empresa/Fornecedor invalido.');
    }
  };

  if (rateios.length > 0) {
    for (const item of rateios) {
      await checkName(item.nome);
    }
    return;
  }

  if (!empresaFornecedor) {
    badRequest('Empresa/Fornecedor obrigatorio.');
  }
  await checkName(empresaFornecedor);
}

function consolidateRateio(total: number, empresaFornecedor: string | null, rateiosInput: RateioInput[]): { empresaFornecedorFinal: string | null; rateiosFinal: RateioInput[] } {
  let rateios = [...rateiosInput];
  const empresaFornecedorNorm = truncate(empresaFornecedor, MAX_EMPRESA_FORNECEDOR);

  if (rateios.length === 0 && empresaFornecedorNorm) {
    rateios = [{ nome: empresaFornecedorNorm, valor: total }];
  }

  if (rateios.length > 0) {
    const sum = Number(rateios.reduce((acc, item) => acc + item.valor, 0).toFixed(2));
    if (sum !== Number(total.toFixed(2))) {
      badRequest('Soma do rateio deve ser igual ao valor total.');
    }
    const nomes = [...new Set(rateios.map((item) => item.nome))];
    return {
      empresaFornecedorFinal: truncate(nomes.join(', '), MAX_EMPRESA_FORNECEDOR),
      rateiosFinal: rateios,
    };
  }

  return {
    empresaFornecedorFinal: empresaFornecedorNorm,
    rateiosFinal: [],
  };
}

async function logHistorico(client: PoolClient, pagamentoId: number, acao: string, detalhes: unknown, criadoPor: string): Promise<void> {
  await client.query(
    `
      insert into pagamento_historico (pagamento_id, acao, detalhes, criado_por, dt_evento)
      values ($1, $2, $3, $4, ${nowFortalezaSql()})
    `,
    [pagamentoId, acao, serializeDetails(detalhes), criadoPor],
  );
}

async function replaceRateios(client: PoolClient, pagamentoId: number, rateios: RateioInput[]): Promise<void> {
  await client.query('delete from pagamento_rateio where pagamento_id = $1', [pagamentoId]);
  for (const item of rateios) {
    await client.query(
      'insert into pagamento_rateio (pagamento_id, nome, valor) values ($1, $2, $3)',
      [pagamentoId, item.nome, item.valor],
    );
  }
}

async function getRateios(client: PoolClient, pagamentoId: number): Promise<RateioRow[]> {
  const { rows } = await client.query<RateioRow>(
    'select nome, valor from pagamento_rateio where pagamento_id = $1 order by id',
    [pagamentoId],
  );
  return rows;
}

async function getPagamentoById(client: PoolClient, authUser: AuthUser, id: number): Promise<PagamentoRow> {
  const sql = `
    select
      p.id,
      p.cod_vld as "codVld",
      p.perfil_criador as "perfilCriador",
      p.colaborador,
      p.criado_por as "criadoPor",
      p.ult_editado_por as "ultEditadoPor",
      p.dt_sistema as "dtSistema",
      p.dt_pagamento as "dtPagamento",
      p.dt_vencimento as "dtVencimento",
      p.dt_ult_edicao as "dtUltEdicao",
      p.status,
      p.sede,
      p.setor,
      p.despesa,
      p.dotacao,
      p.empresa_fornecedor as "empresaFornecedor",
      p.setor_pagamento as "setorPagamento",
      p.valor_total as "valorTotal",
      p.descricao
    from pagamentos p
    where p.id = $1
      and ($2::boolean = true or p.criado_por = $3)
    limit 1
  `;
  const { rows } = await client.query<PagamentoRow>(sql, [id, isPrivileged(authUser), authUser.username]);
  const row = rows[0];
  if (!row) {
    notFound('Pagamento nao encontrado');
  }
  return row;
}

function mapPagamento(row: PagamentoRow, colaboradorMap: Map<string, string>, rateios: RateioRow[]): Record<string, unknown> {
  const login = (row.criadoPor || '').toLowerCase();
  const colaboradorNormalizado = row.colaborador ?? colaboradorMap.get(login) ?? row.criadoPor ?? '';
  return {
    id: row.id,
    codVld: row.codVld,
    perfilCriador: row.perfilCriador,
    colaborador: colaboradorNormalizado,
    criadoPor: row.criadoPor,
    ultEditadoPor: row.ultEditadoPor,
    dtSistema: row.dtSistema,
    dtPagamento: row.dtPagamento,
    dtVencimento: row.dtVencimento,
    dtUltEdicao: row.dtUltEdicao,
    status: row.status,
    sede: row.sede,
    setor: row.setor,
    despesa: row.despesa,
    dotacao: row.dotacao,
    empresaFornecedor: row.empresaFornecedor,
    setorPagamento: row.setorPagamento,
    valorTotal: Number(row.valorTotal),
    descricao: row.descricao,
    rateios: rateios.map((item) => ({ nome: item.nome, valor: Number(item.valor) })),
  };
}

async function buildColaboradorMap(client?: PoolClient): Promise<Map<string, string>> {
  const executor = client ? client : pool;
  const { rows } = await executor.query<{ nome: string; email: string | null }>('select nome, email from ref_colaborador');
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.nome) map.set(row.nome.toLowerCase(), row.nome);
    if (row.email) map.set(row.email.toLowerCase(), row.nome);
  }
  return map;
}

function parsePayload(raw: unknown): PagamentoPayload {
  const body = (raw ?? {}) as Record<string, unknown>;
  return {
    dtPagamento: ensureOptionalDate(body.dtPagamento, 'Data de pagamento'),
    dtVencimento: ensureDate(body.dtVencimento, 'Data de vencimento'),
    sede: ensureRequiredText(body.sede, 'Sede', 80),
    colaborador: ensureRequiredText(body.colaborador, 'Colaborador', 120),
    setor: ensureRequiredText(body.setor, 'Setor', 80),
    despesa: ensureRequiredText(body.despesa, 'Despesa', 120),
    dotacao: ensureRequiredText(body.dotacao, 'Dotacao', 120),
    empresaFornecedor: ensureOptionalText(body.empresaFornecedor, 'Empresa/Fornecedor', 255),
    setorPagamento: ensureRequiredText(body.setorPagamento, 'Setor (Quem?)', 80),
    valorTotal: ensurePositiveAmount(body.valorTotal, 'Valor total'),
    descricao: ensureOptionalText(body.descricao, 'Descricao', 1000),
    rateios: parseRateios(body.rateios),
  };
}

function buildWhere(authUser: AuthUser, filtros: Filtros): WhereClause {
  const clauses: string[] = [];
  const params: unknown[] = [];

  const push = (fragmentWithMarker: string, value: unknown): void => {
    params.push(value);
    clauses.push(fragmentWithMarker.replace('?', `$${params.length}`));
  };

  if (!isPrivileged(authUser)) {
    push('p.criado_por = ?', authUser.username);
  }

  const de = ensureOptionalDate(filtros.de, 'Data inicial');
  const ate = ensureOptionalDate(filtros.ate, 'Data final');
  if (de) push('coalesce(p.dt_vencimento, p.dt_pagamento) >= ?::date', de);
  if (ate) push('coalesce(p.dt_vencimento, p.dt_pagamento) <= ?::date', ate);

  const usuario = normalizeText(filtros.usuario);
  const setor = normalizeText(filtros.setor);
  const despesa = normalizeText(filtros.despesa);
  const dotacao = normalizeText(filtros.dotacao);
  const q = toLikePattern(filtros.q);

  if (usuario) push('lower(p.criado_por) = ?', usuario);
  if (setor) push('p.setor_norm = ?', setor);
  if (despesa) push('p.despesa_norm = ?', despesa);
  if (dotacao) push('p.dotacao_norm = ?', dotacao);
  if (q) {
    params.push(q);
    const p1 = params.length;
    params.push(q);
    const p2 = params.length;
    clauses.push(`(lower(p.despesa) like $${p1} or lower(coalesce(p.descricao, '')) like $${p2})`);
  }

  return {
    sql: clauses.length ? `where ${clauses.join(' and ')}` : '',
    params,
  };
}

export async function listarMeus(
  authUser: AuthUser,
  filtros: Filtros,
  query: Record<string, unknown>,
): Promise<PageResult<Record<string, unknown>>> {
  const { page, size, offset } = parsePagination(query);
  const where = buildWhere(authUser, filtros);

  const baseSelect = `
    select
      p.id,
      p.cod_vld as "codVld",
      p.perfil_criador as "perfilCriador",
      p.colaborador,
      p.criado_por as "criadoPor",
      p.ult_editado_por as "ultEditadoPor",
      p.dt_sistema as "dtSistema",
      p.dt_pagamento as "dtPagamento",
      p.dt_vencimento as "dtVencimento",
      p.dt_ult_edicao as "dtUltEdicao",
      p.status,
      p.sede,
      p.setor,
      p.despesa,
      p.dotacao,
      p.empresa_fornecedor as "empresaFornecedor",
      p.setor_pagamento as "setorPagamento",
      p.valor_total as "valorTotal",
      p.descricao
    from pagamentos p
  `;
  const countSql = `select count(*)::bigint as total from pagamentos p ${where.sql}`;
  const contentSql = `${baseSelect} ${where.sql} order by p.id desc limit $${where.params.length + 1} offset $${where.params.length + 2}`;

  const [countResult, contentResult, colaboradorMap] = await Promise.all([
    pool.query<{ total: string }>(countSql, where.params),
    pool.query<PagamentoRow>(contentSql, [...where.params, size, offset]),
    buildColaboradorMap(),
  ]);

  const totalElements = Number(countResult.rows[0]?.total ?? 0);
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
  const content = contentResult.rows.map((row) => mapPagamento(row, colaboradorMap, []));

  return {
    content,
    number: page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: totalPages === 0 ? true : page >= totalPages - 1,
    empty: content.length === 0,
    numberOfElements: content.length,
  };
}

export async function somarMeus(authUser: AuthUser, filtros: Filtros): Promise<{ total: number }> {
  const where = buildWhere(authUser, filtros);
  const { rows } = await pool.query<{ total: string }>(
    `select coalesce(sum(p.valor_total), 0) as total from pagamentos p ${where.sql}`,
    where.params,
  );
  return { total: Number(rows[0]?.total ?? 0) };
}

export async function buscarMeu(authUser: AuthUser, id: number): Promise<Record<string, unknown>> {
  if (!Number.isFinite(id) || id <= 0) badRequest('ID invalido.');
  const client = await pool.connect();
  try {
    const [row, rateios, colaboradorMap] = await Promise.all([
      getPagamentoById(client, authUser, id),
      getRateios(client, id),
      buildColaboradorMap(client),
    ]);
    return mapPagamento(row, colaboradorMap, rateios);
  } finally {
    client.release();
  }
}

export async function listarHistorico(authUser: AuthUser, id: number): Promise<Record<string, unknown>[]> {
  if (!Number.isFinite(id) || id <= 0) badRequest('ID invalido.');
  const client = await pool.connect();
  try {
    await getPagamentoById(client, authUser, id);
    const { rows } = await client.query<HistoricoRow>(
      `
        select
          h.id,
          h.pagamento_id as "pagamentoId",
          h.acao,
          h.detalhes,
          h.criado_por as "criadoPor",
          h.dt_evento as "dtEvento"
        from pagamento_historico h
        where h.pagamento_id = $1
        order by h.dt_evento desc
      `,
      [id],
    );
    return rows.map((row) => ({
      id: row.id,
      pagamentoId: row.pagamentoId,
      acao: row.acao,
      detalhes: row.detalhes,
      criadoPor: row.criadoPor,
      dtEvento: row.dtEvento,
    }));
  } finally {
    client.release();
  }
}

export async function criarPagamento(authUser: AuthUser, rawPayload: unknown): Promise<Record<string, unknown>> {
  const payload = parsePayload(rawPayload);
  const consolidado = consolidateRateio(payload.valorTotal, payload.empresaFornecedor, payload.rateios);

  const client = await pool.connect();
  try {
    await client.query('begin');

    await validateReferences(client, payload);
    await validateRateioTargets(client, payload.dotacao, consolidado.empresaFornecedorFinal, consolidado.rateiosFinal);

    const sedeNorm = normalizeToLower(payload.sede);
    const setorNorm = normalizeToLower(payload.setor);
    const despesaNorm = normalizeToLower(payload.despesa);
    const dotacaoNorm = normalizeToLower(payload.dotacao);

    const dtPagamento = payload.dtPagamento ?? toDateOnlyInFortaleza();
    const { rows: insertRows } = await client.query<{ id: number }>(
      `
        insert into pagamentos (
          perfil_criador,
          criado_por,
          ult_editado_por,
          dt_sistema,
          dt_pagamento,
          dt_vencimento,
          dt_ult_edicao,
          status,
          sede,
          sede_norm,
          colaborador,
          setor,
          setor_norm,
          despesa,
          despesa_norm,
          dotacao,
          dotacao_norm,
          empresa_fornecedor,
          setor_pagamento,
          valor_total,
          descricao
        ) values (
          $1, $2, $3,
          ${nowFortalezaSql()},
          $4::date,
          $5::date,
          ${nowFortalezaSql()},
          $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        returning id
      `,
      [
        perfilCriador(authUser),
        authUser.username,
        authUser.username,
        dtPagamento,
        payload.dtVencimento,
        STATUS_LANCADO,
        payload.sede,
        sedeNorm,
        payload.colaborador,
        payload.setor,
        setorNorm,
        payload.despesa,
        despesaNorm,
        payload.dotacao,
        dotacaoNorm,
        consolidado.empresaFornecedorFinal,
        payload.setorPagamento,
        payload.valorTotal,
        payload.descricao,
      ],
    );

    const pagamentoId = insertRows[0]?.id;
    if (!pagamentoId) {
      badRequest('Falha ao criar pagamento.');
    }

    await replaceRateios(client, pagamentoId, consolidado.rateiosFinal);

    const codColab =
      (await findCodigoColaboradorByLogin(client, payload.colaborador))
      ?? (await findCodigoColaboradorByLogin(client, authUser.username));
    const codSede = await findCodigoByNome(client, 'ref_sede', payload.sede);
    const codSetor = await findCodigoByNome(client, 'ref_setor', payload.setor);
    const codVld = buildCodVld(pagamentoId, dtPagamento || payload.dtVencimento, codColab, codSede, codSetor);
    await client.query('update pagamentos set cod_vld = $1 where id = $2', [codVld, pagamentoId]);

    const row = await getPagamentoById(client, authUser, pagamentoId);
    const rateios = await getRateios(client, pagamentoId);
    const snapshot = buildSnapshot(row, rateios);
    await logHistorico(client, pagamentoId, 'CRIADO', snapshot, authUser.username);

    await client.query('commit');

    const colaboradorMap = await buildColaboradorMap();
    return mapPagamento(row, colaboradorMap, rateios);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function editarPagamento(authUser: AuthUser, id: number, rawPayload: unknown): Promise<Record<string, unknown>> {
  if (!Number.isFinite(id) || id <= 0) badRequest('ID invalido.');
  const payload = parsePayload(rawPayload);
  const consolidado = consolidateRateio(payload.valorTotal, payload.empresaFornecedor, payload.rateios);

  const client = await pool.connect();
  try {
    await client.query('begin');

    const beforeRow = await getPagamentoById(client, authUser, id);
    const beforeRateios = await getRateios(client, id);
    const beforeSnapshot = buildSnapshot(beforeRow, beforeRateios);

    await validateReferences(client, payload);
    await validateRateioTargets(client, payload.dotacao, consolidado.empresaFornecedorFinal, consolidado.rateiosFinal);

    await client.query(
      `
        update pagamentos
        set
          ult_editado_por = $1,
          dt_ult_edicao = ${nowFortalezaSql()},
          dt_pagamento = $2::date,
          dt_vencimento = $3::date,
          status = $4,
          sede = $5,
          sede_norm = $6,
          colaborador = $7,
          setor = $8,
          setor_norm = $9,
          despesa = $10,
          despesa_norm = $11,
          dotacao = $12,
          dotacao_norm = $13,
          empresa_fornecedor = $14,
          setor_pagamento = $15,
          valor_total = $16,
          descricao = $17
        where id = $18
      `,
      [
        authUser.username,
        payload.dtPagamento ?? beforeRow.dtPagamento ?? toDateOnlyInFortaleza(),
        payload.dtVencimento,
        STATUS_LANCADO,
        payload.sede,
        normalizeToLower(payload.sede),
        payload.colaborador,
        payload.setor,
        normalizeToLower(payload.setor),
        payload.despesa,
        normalizeToLower(payload.despesa),
        payload.dotacao,
        normalizeToLower(payload.dotacao),
        consolidado.empresaFornecedorFinal,
        payload.setorPagamento,
        payload.valorTotal,
        payload.descricao,
        id,
      ],
    );

    await replaceRateios(client, id, consolidado.rateiosFinal);

    const afterRow = await getPagamentoById(client, authUser, id);
    const afterRateios = await getRateios(client, id);
    const afterSnapshot = buildSnapshot(afterRow, afterRateios);
    const diff = buildDiff(beforeSnapshot, afterSnapshot);
    if (Object.keys(diff).length > 0) {
      await logHistorico(client, id, 'ATUALIZADO', diff, authUser.username);
    }

    await client.query('commit');

    const colaboradorMap = await buildColaboradorMap();
    return mapPagamento(afterRow, colaboradorMap, afterRateios);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function deletarPagamento(authUser: AuthUser, id: number): Promise<void> {
  if (!Number.isFinite(id) || id <= 0) badRequest('ID invalido.');

  const client = await pool.connect();
  try {
    await client.query('begin');
    const row = await getPagamentoById(client, authUser, id);
    const rateios = await getRateios(client, id);
    const snapshot = buildSnapshot(row, rateios);

    // Historico nao deve bloquear a exclusao em caso de falha pontual.
    try {
      await logHistorico(client, id, 'EXCLUIDO', snapshot, authUser.username);
    } catch {
      // no-op
    }

    // Alguns bancos estao sem ON DELETE CASCADE neste relacionamento.
    await client.query('delete from pagamento_rateio where pagamento_id = $1', [id]);
    await client.query('delete from pagamentos where id = $1', [id]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function normalizeCampos(authUser: AuthUser): Promise<{ updated: number }> {
  if (!isPrivileged(authUser)) {
    forbidden('Acao nao permitida.');
  }
  const { rowCount } = await pool.query(
    `
      update pagamentos p
      set
        sede_norm = lower(p.sede),
        setor_norm = lower(p.setor),
        despesa_norm = lower(p.despesa),
        dotacao_norm = lower(p.dotacao)
      where p.sede_norm is null or p.sede_norm <> lower(p.sede)
         or p.setor_norm is null or p.setor_norm <> lower(p.setor)
         or p.despesa_norm is null or p.despesa_norm <> lower(p.despesa)
         or p.dotacao_norm is null or p.dotacao_norm <> lower(p.dotacao)
    `,
  );
  return { updated: rowCount ?? 0 };
}

export async function relatorioTotalPorSede(
  authUser: AuthUser,
  filtros: Filtros,
): Promise<{ content: Array<{ sede: string; quantidade: number; total: number }>; totalGeral: number }> {
  if (authUser.username.toLowerCase() !== 'admin') {
    forbidden('Acao permitida somente para admin.');
  }

  const where = buildWhere(authUser, filtros);
  const { rows } = await pool.query<{ sede: string | null; quantidade: string; total: string }>(
    `
      select
        coalesce(nullif(trim(p.sede), ''), 'Sem sede') as sede,
        count(*)::bigint as quantidade,
        coalesce(sum(p.valor_total), 0) as total
      from pagamentos p
      ${where.sql}
      group by coalesce(nullif(trim(p.sede), ''), 'Sem sede')
      order by lower(coalesce(nullif(trim(p.sede), ''), 'Sem sede'))
    `,
    where.params,
  );

  const content = rows.map((row) => ({
    sede: row.sede ?? 'Sem sede',
    quantidade: Number(row.quantidade ?? 0),
    total: Number(row.total ?? 0),
  }));

  return {
    content,
    totalGeral: Number(content.reduce((sum, item) => sum + item.total, 0).toFixed(2)),
  };
}
