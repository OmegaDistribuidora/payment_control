import type { PoolClient } from 'pg';
import { canViewHistory, type AuthUser } from '../auth/users.js';
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
  currentCodVld: string | null;
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
  lancamento: string;
  valor: string;
  setor: string;
  despesa: string;
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

function pickChangeValue(
  changes: Record<string, { de: unknown; para: unknown }> | null,
  fieldName: string,
  preferredSide: 'de' | 'para',
): unknown {
  if (!changes || !changes[fieldName]) return undefined;
  const candidate = changes[fieldName][preferredSide];
  if (candidate !== undefined && candidate !== null && candidate !== '') return candidate;
  const fallbackSide = preferredSide === 'de' ? 'para' : 'de';
  return changes[fieldName][fallbackSide];
}

function pickSnapshotValue(snapshot: Record<string, unknown> | null, fieldName: string): unknown {
  if (!snapshot) return undefined;
  return snapshot[fieldName];
}

function buildLancamentoLabel(
  row: AuditRow & { row_key: string },
  snapshot: Record<string, unknown> | null,
  changes: Record<string, { de: unknown; para: unknown }> | null,
  preferredSide: 'de' | 'para',
): string {
  const codVld =
    pickChangeValue(changes, 'codVld', preferredSide)
    ?? pickSnapshotValue(snapshot, 'codVld')
    ?? row.currentCodVld;
  if (codVld !== undefined && codVld !== null && codVld !== '') {
    return String(codVld);
  }
  if (String(row.entityType || '').toLowerCase() === 'pagamento' && row.entityId) {
    return `ID ${row.entityId}`;
  }
  return '-';
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
  const preferredSide = actionUpper === 'EXCLUIDO' ? 'de' : 'para';

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

  const valor =
    formatValue(
      pickChangeValue(changes, 'valorTotal', preferredSide)
      ?? pickSnapshotValue(snapshot, 'valorTotal'),
    ) || '-';
  const setor =
    formatValue(
      pickChangeValue(changes, 'setor', preferredSide)
      ?? pickSnapshotValue(snapshot, 'setor'),
    ) || '-';
  const despesa =
    formatValue(
      pickChangeValue(changes, 'despesa', preferredSide)
      ?? pickSnapshotValue(snapshot, 'despesa'),
    ) || '-';

  return {
    id: row.row_key,
    entityType: row.entityType,
    entityLabel: translateEntity(row.entityType),
    entityId: row.entityId,
    action: row.action,
    actionLabel: translateAction(row.action),
    actor: row.actor,
    occurredAt: row.occurredAt,
    lancamento: buildLancamentoLabel(row, snapshot, changes, preferredSide),
    valor,
    setor,
    despesa,
    oldValue,
    newValue,
    description: description || '-',
  };
}

export async function listGlobalHistory(
  authUser: AuthUser,
  query: Record<string, string | undefined>,
): Promise<{ content: GlobalHistoryItem[] }> {
  if (!canViewHistory(authUser)) {
    forbidden('Auditoria indisponivel para este usuario.');
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
        concat('pagamento-', h.id) as "row_key",
        'pagamento'::text as "entityType",
        h.pagamento_id::text as "entityId",
        h.acao as "action",
        h.criado_por as "actor",
        h.dt_evento as "occurredAt",
        h.detalhes as "details",
        p.cod_vld as "currentCodVld"
      from pagamento_historico h
      left join pagamentos p on p.id = h.pagamento_id
      ${wherePagamento}
    ),
    audit_events as (
      select
        concat('audit-', a.id) as "row_key",
        a.entity_type as "entityType",
        a.entity_id as "entityId",
        a.action as "action",
        a.actor as "actor",
        a.occurred_at as "occurredAt",
        a.details as "details",
        null::text as "currentCodVld"
      from app_audit_log a
      ${whereAudit}
    )
    select *
    from (
      select * from pagamento_events
      union all
      select * from audit_events
    ) e
    order by e."occurredAt" desc, e."row_key" desc
    limit 50
  `;

  const { rows } = await pool.query<
    AuditRow & { row_key: string }
  >(sql, params);

  return {
    content: rows.map((row) => buildHistoryPresentation(row)),
  };
}
