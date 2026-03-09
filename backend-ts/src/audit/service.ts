import type { PoolClient } from 'pg';
import { isPrivileged, type AuthUser } from '../auth/users.js';
import { pool } from '../db/pool.js';
import { badRequest, forbidden } from '../http/http-error.js';

type AuditDetails = {
  descricao?: string;
  changes?: Record<string, { de: unknown; para: unknown }>;
  snapshot?: Record<string, unknown>;
};

type AuditRow = {
  id: number;
  entityType: string;
  entityId: string | null;
  action: string;
  actor: string | null;
  occurredAt: string;
  details: string | null;
};

type GlobalHistoryItem = {
  id: string;
  entityType: string;
  entityLabel: string;
  entityId: string | null;
  action: string;
  actionLabel: string;
  actor: string | null;
  occurredAt: string;
  oldValue: string;
  newValue: string;
  description: string;
};

let ensureAuditTablePromise: Promise<void> | null = null;

function nowFortalezaSql(): string {
  return "timezone('America/Fortaleza', now())";
}

export async function ensureAuditTable(): Promise<void> {
  if (!ensureAuditTablePromise) {
    ensureAuditTablePromise = pool
      .query(`
        create table if not exists app_audit_log (
          id bigserial primary key,
          entity_type varchar(60) not null,
          entity_id varchar(120),
          action varchar(60) not null,
          actor varchar(120),
          details text,
          occurred_at timestamp without time zone not null default ${nowFortalezaSql()}
        )
      `)
      .then(() => undefined)
      .catch((error) => {
        ensureAuditTablePromise = null;
        throw error;
      });
  }
  await ensureAuditTablePromise;
}

function serializeDetails(details: unknown): string | null {
  if (details === undefined || details === null) return null;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export async function logAudit(
  client: PoolClient,
  entry: {
    entityType: string;
    entityId?: string | number | null;
    action: string;
    actor?: string | null;
    details?: AuditDetails | null;
  },
): Promise<void> {
  await ensureAuditTable();
  await client.query(
    `
      insert into app_audit_log (entity_type, entity_id, action, actor, details, occurred_at)
      values ($1, $2, $3, $4, $5, ${nowFortalezaSql()})
    `,
    [
      entry.entityType,
      entry.entityId === undefined || entry.entityId === null ? null : String(entry.entityId),
      entry.action,
      entry.actor ?? null,
      serializeDetails(entry.details),
    ],
  );
}

function normalizeDateFilter(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    badRequest('Data do historico invalida.');
  }
  return value;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) {
    if (!value.length) return '-';
    return value
      .map((item) => {
        if (item && typeof item === 'object') {
          const row = item as Record<string, unknown>;
          const nome = row.nome ?? row.name ?? '';
          const valor = row.valor ?? row.value ?? '';
          if (nome && valor) return `${nome} (${valor})`;
          return String(nome || valor || '-');
        }
        return String(item);
      })
      .join(', ');
  }
  return String(value);
}

function parseDetails(rawDetails: string | null): Record<string, unknown> | null {
  if (!rawDetails) return null;
  try {
    const parsed = JSON.parse(rawDetails) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function isChangeSet(value: unknown): value is Record<string, { de: unknown; para: unknown }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(
    (item) => item && typeof item === 'object' && 'de' in item && 'para' in item,
  );
}

function flattenRecord(record: Record<string, unknown>): string {
  return Object.entries(record)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join(' | ');
}

function flattenChanges(
  changes: Record<string, { de: unknown; para: unknown }>,
  field: 'de' | 'para',
): string {
  return Object.entries(changes)
    .map(([key, value]) => `${key}: ${formatValue(value[field])}`)
    .join(' | ');
}

function translateEntity(entityType: string): string {
  const normalized = String(entityType || '').toLowerCase();
  const labels: Record<string, string> = {
    pagamento: 'Lancamento',
    usuario: 'Usuario',
    setor: 'Setor',
    despesa: 'Despesa',
    sistema: 'Sistema',
  };
  return labels[normalized] || entityType;
}

function translateAction(action: string): string {
  const normalized = String(action || '').toUpperCase();
  const labels: Record<string, string> = {
    CRIADO: 'Criado',
    ATUALIZADO: 'Atualizado',
    ALTERADO: 'Alterado',
    EXCLUIDO: 'Excluido',
    SENHA_ALTERADA: 'Troca de senha',
  };
  return labels[normalized] || action;
}

function buildHistoryPresentation(row: AuditRow & { row_key: string }): GlobalHistoryItem {
  const parsed = parseDetails(row.details);
  const directChanges = parsed && isChangeSet(parsed) ? parsed : null;
  const wrappedChanges =
    parsed && parsed.changes && isChangeSet(parsed.changes) ? parsed.changes : null;
  const snapshot =
    parsed && parsed.snapshot && typeof parsed.snapshot === 'object' && !Array.isArray(parsed.snapshot)
      ? (parsed.snapshot as Record<string, unknown>)
      : parsed && !directChanges && !wrappedChanges && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : null;
  const descriptionFromPayload =
    parsed && typeof parsed.descricao === 'string' && parsed.descricao.trim()
      ? parsed.descricao.trim()
      : '';
  const actionUpper = String(row.action || '').toUpperCase();

  let oldValue = '-';
  let newValue = '-';
  let description = descriptionFromPayload;

  const changes = wrappedChanges || directChanges;
  if (changes) {
    oldValue = flattenChanges(changes, 'de') || '-';
    newValue = flattenChanges(changes, 'para') || '-';
    if (!description) {
      description = `${translateEntity(row.entityType)} alterado`;
    }
  } else if (snapshot) {
    const flattened = flattenRecord(snapshot);
    if (actionUpper === 'EXCLUIDO') {
      oldValue = flattened || '-';
      newValue = '-';
    } else {
      oldValue = '-';
      newValue = flattened || '-';
    }
    if (!description) {
      description = `${translateEntity(row.entityType)} ${translateAction(row.action).toLowerCase()}`;
    }
  } else if (row.details) {
    description = description || row.details;
  }

  if (actionUpper === 'SENHA_ALTERADA') {
    oldValue = '-';
    newValue = '-';
    description = description || `${row.actor || 'Usuario'} trocou sua senha`;
  }

  if (!description) {
    description = `${translateEntity(row.entityType)} ${translateAction(row.action).toLowerCase()}${row.entityId ? ` (${row.entityId})` : ''}`;
  }

  return {
    id: row.row_key,
    entityType: row.entityType,
    entityLabel: translateEntity(row.entityType),
    entityId: row.entityId,
    action: row.action,
    actionLabel: translateAction(row.action),
    actor: row.actor,
    occurredAt: row.occurredAt,
    oldValue,
    newValue,
    description,
  };
}

export async function listGlobalHistory(
  authUser: AuthUser,
  query: Record<string, string | undefined>,
): Promise<{ content: GlobalHistoryItem[] }> {
  if (!isPrivileged(authUser)) {
    forbidden('Historico global disponivel apenas para admin, RH e diretoria.');
  }

  await ensureAuditTable();
  const dateFilter = normalizeDateFilter(query.date);
  const params: unknown[] = [];
  let wherePagamento = '';
  let whereAudit = '';

  if (dateFilter) {
    params.push(dateFilter);
    wherePagamento = `where h.dt_evento::date = $1::date`;
    whereAudit = `where a.occurred_at::date = $1::date`;
  }

  const sql = `
    with pagamento_events as (
      select
        concat('pagamento-', h.id) as row_key,
        'pagamento'::text as entity_type,
        h.pagamento_id::text as entity_id,
        h.acao as action,
        h.criado_por as actor,
        h.dt_evento as occurred_at,
        h.detalhes as details
      from pagamento_historico h
      ${wherePagamento}
    ),
    audit_events as (
      select
        concat('audit-', a.id) as row_key,
        a.entity_type,
        a.entity_id,
        a.action,
        a.actor,
        a.occurred_at,
        a.details
      from app_audit_log a
      ${whereAudit}
    )
    select *
    from (
      select * from pagamento_events
      union all
      select * from audit_events
    ) e
    order by e.occurred_at desc, e.row_key desc
    limit 50
  `;

  const { rows } = await pool.query<
    AuditRow & { row_key: string }
  >(sql, params);

  return {
    content: rows.map((row) => buildHistoryPresentation(row)),
  };
}
