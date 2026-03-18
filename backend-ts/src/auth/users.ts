import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../db/pool.js';
import { badRequest, forbidden } from '../http/http-error.js';
import { trimToNull } from '../http/utils.js';
import { logAudit } from '../audit/service.js';

export type Role = 'GERENCIA' | 'DIRETORIA' | 'RH' | 'MATRIZ' | 'SOBRAL' | 'CARIRI';

export type AuthUser = {
  username: string;
  role: Role;
  visibleUsernames: string[];
};

type UserRecord = {
  username: string;
  password: string;
  role: Role;
};

type StoredUserRow = {
  username: string;
  passwordHash: string;
  role: Role;
  ativo?: boolean;
};

type CreateUserPayload = {
  username?: unknown;
  password?: unknown;
  visibleUsernames?: unknown;
};

type ChangePasswordPayload = {
  currentPassword?: unknown;
  newPassword?: unknown;
};

type UserStatusRow = {
  username: string;
  ativo: boolean;
};

const USERS: UserRecord[] = [
  { username: 'admin', password: 'Omega@123', role: 'GERENCIA' },
  { username: 'diretoria', password: 'Diretoria@123', role: 'DIRETORIA' },
  { username: 'rh', password: 'Carlos@123', role: 'RH' },
  { username: 'omega.matriz', password: 'Matriz@123', role: 'MATRIZ' },
  { username: 'omega.sobral', password: 'Sobral@123', role: 'SOBRAL' },
  { username: 'omega.cariri', password: 'Cariri@123', role: 'CARIRI' },
];

const USER_MAP = new Map<string, UserRecord>(USERS.map((item) => [item.username.toLowerCase(), item]));
let ensureUsersTablePromise: Promise<void> | null = null;

async function ensureUsersTable(): Promise<void> {
  if (!ensureUsersTablePromise) {
    ensureUsersTablePromise = pool
      .query(`
        create table if not exists app_usuario (
          id bigserial primary key,
          username varchar(80) not null unique,
          password_hash text not null,
          role varchar(20) not null,
          ativo boolean not null default true,
          criado_em timestamp without time zone not null default timezone('America/Fortaleza', now())
        )
      `)
      .then(() =>
        pool.query(`
          create table if not exists app_usuario_visibilidade (
            owner_username varchar(80) not null,
            visible_username varchar(80) not null,
            criado_em timestamp without time zone not null default timezone('America/Fortaleza', now()),
            primary key (owner_username, visible_username)
          )
        `),
      )
      .then(() =>
        pool.query(`
          create table if not exists app_usuario_status (
            username varchar(80) primary key,
            ativo boolean not null default true,
            atualizado_em timestamp without time zone not null default timezone('America/Fortaleza', now())
          )
        `),
      )
      .then(() => undefined)
      .catch((error) => {
        ensureUsersTablePromise = null;
        throw error;
      });
  }
  await ensureUsersTablePromise;
}

function normalizeUsername(value: unknown): string {
  const username = trimToNull(value)?.toLowerCase();
  if (!username) {
    badRequest('Login obrigatorio.');
  }
  if (!/^[a-z0-9._-]{3,80}$/.test(username)) {
    badRequest('Login invalido. Use apenas letras minusculas, numeros, ponto, traco ou underline.');
  }
  return username;
}

function normalizePassword(value: unknown): string {
  const password = trimToNull(value);
  if (!password) {
    badRequest('Senha obrigatoria.');
  }
  if (password.length < 6 || password.length > 120) {
    badRequest('Senha deve ter entre 6 e 120 caracteres.');
  }
  return password;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, storedValue: string): boolean {
  const [algorithm, salt, hash] = storedValue.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

async function findStoredUser(username: string, client?: PoolClient): Promise<StoredUserRow | null> {
  await ensureUsersTable();
  const executor = client ?? pool;
  const { rows } = await executor.query<StoredUserRow>(
    `
      select username, password_hash as "passwordHash", role
      from app_usuario
      where lower(username) = lower($1)
        and ativo = true
      limit 1
    `,
    [username],
  );
  return rows[0] ?? null;
}

async function findStoredUserAnyStatus(username: string, client?: PoolClient): Promise<StoredUserRow | null> {
  await ensureUsersTable();
  const executor = client ?? pool;
  const { rows } = await executor.query<StoredUserRow>(
    `
      select username, password_hash as "passwordHash", role, ativo
      from app_usuario
      where lower(username) = lower($1)
      limit 1
    `,
    [username],
  );
  return rows[0] ?? null;
}

function dedupeUserList(items: Array<{ username: string; role: Role; origem: 'padrao' | 'custom' }>) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.username.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function usernameExists(username: string, client?: PoolClient): Promise<boolean> {
  if (USER_MAP.has(username.toLowerCase())) {
    return true;
  }
  return Boolean(await findStoredUserAnyStatus(username, client));
}

async function listVisibleUsernames(username: string, client?: PoolClient): Promise<string[]> {
  await ensureUsersTable();
  const executor = client ?? pool;
  const { rows } = await executor.query<{ visibleUsername: string }>(
    `
      select visible_username as "visibleUsername"
      from app_usuario_visibilidade
      where lower(owner_username) = lower($1)
      order by lower(visible_username)
    `,
    [username],
  );
  return rows.map((row) => row.visibleUsername.toLowerCase());
}

function normalizeVisibleUsernames(value: unknown, username: string): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const rawItem of value) {
    const normalized = trimToNull(rawItem)?.toLowerCase();
    if (!normalized || normalized === username || seen.has(normalized)) continue;
    seen.add(normalized);
    items.push(normalized);
  }
  return items;
}

async function listUserStatuses(client?: PoolClient): Promise<Map<string, boolean>> {
  await ensureUsersTable();
  const executor = client ?? pool;
  const { rows } = await executor.query<UserStatusRow>(
    `
      select username, ativo
      from app_usuario_status
    `,
  );
  const result = new Map<string, boolean>();
  for (const row of rows) {
    result.set(row.username.toLowerCase(), row.ativo);
  }
  return result;
}

async function isUserActive(username: string, client?: PoolClient): Promise<boolean> {
  const statuses = await listUserStatuses(client);
  const status = statuses.get(username.toLowerCase());
  return status !== false;
}

async function upsertUserStatus(username: string, ativo: boolean, client: PoolClient): Promise<void> {
  await client.query(
    `
      insert into app_usuario_status (username, ativo, atualizado_em)
      values ($1, $2, timezone('America/Fortaleza', now()))
      on conflict (username)
      do update set
        ativo = excluded.ativo,
        atualizado_em = excluded.atualizado_em
    `,
    [username, ativo],
  );
}

export async function authenticateBasic(username: string, password: string): Promise<AuthUser | null> {
  const normalizedUsername = String(username ?? '').trim().toLowerCase();
  const active = await isUserActive(normalizedUsername).catch(() => true);
  if (!active) return null;
  const stored = await findStoredUser(normalizedUsername).catch(() => null);
  if (stored) {
    if (!verifyPassword(password, stored.passwordHash)) return null;
    const visibleUsernames = await listVisibleUsernames(stored.username).catch(() => []);
    return {
      username: stored.username,
      role: stored.role,
      visibleUsernames,
    };
  }

  const record = USER_MAP.get(normalizedUsername);
  if (!record || record.password !== password) return null;
  return { username: record.username, role: record.role, visibleUsernames: [] };
}

export async function findAuthUserByUsername(username: string): Promise<AuthUser | null> {
  const normalizedUsername = String(username ?? '').trim().toLowerCase();
  if (!normalizedUsername) return null;

  const active = await isUserActive(normalizedUsername).catch(() => true);
  if (!active) return null;

  const stored = await findStoredUser(normalizedUsername).catch(() => null);
  if (stored) {
    const visibleUsernames = await listVisibleUsernames(stored.username).catch(() => []);
    return {
      username: stored.username,
      role: stored.role,
      visibleUsernames,
    };
  }

  const record = USER_MAP.get(normalizedUsername);
  if (!record) return null;
  return { username: record.username, role: record.role, visibleUsernames: [] };
}

export function isPrivileged(user: AuthUser): boolean {
  return user.role === 'GERENCIA' || user.role === 'DIRETORIA' || user.role === 'RH';
}

export function canManageSetores(user: AuthUser): boolean {
  return user.username.toLowerCase() === 'admin' || user.role === 'GERENCIA';
}

export function canManageDespesas(user: AuthUser): boolean {
  return user.username.toLowerCase() === 'admin' || user.role === 'GERENCIA' || user.role === 'RH';
}

export function canManageUsers(user: AuthUser): boolean {
  return user.username.toLowerCase() === 'admin' || user.role === 'GERENCIA';
}

export function perfilCriador(user: AuthUser): string {
  return user.role;
}

export async function listAvailableUsers(): Promise<Array<{ username: string; role: Role; origem: 'padrao' | 'custom' }>> {
  await ensureUsersTable();
  const statuses = await listUserStatuses();
  const { rows } = await pool.query<StoredUserRow>(
    `
      select username, password_hash as "passwordHash", role
      from app_usuario
      where ativo = true
      order by lower(username)
    `,
  );

  const customUsers = rows.map((row) => ({
    username: row.username,
    role: row.role,
    origem: 'custom' as const,
  }));

  const all = [
    ...USERS.map((item) => ({
      username: item.username,
      role: item.role,
      origem: 'padrao' as const,
    })),
    ...customUsers,
  ];

  return dedupeUserList(all).filter((item) => statuses.get(item.username.toLowerCase()) !== false);
}

export async function listManageableUsers(): Promise<Array<{ username: string; role: Role; origem: 'padrao' | 'custom'; ativo: boolean }>> {
  await ensureUsersTable();
  const statuses = await listUserStatuses();
  const { rows } = await pool.query<StoredUserRow>(
    `
      select username, password_hash as "passwordHash", role, ativo
      from app_usuario
      order by lower(username)
    `,
  );

  const customUsers = rows.map((row) => ({
    username: row.username,
    role: row.role,
    origem: 'custom' as const,
    ativo: row.ativo !== false && statuses.get(row.username.toLowerCase()) !== false,
  }));

  const defaults = USERS.map((item) => ({
    username: item.username,
    role: item.role,
    origem: 'padrao' as const,
    ativo: statuses.get(item.username.toLowerCase()) !== false,
  }));

  const seen = new Set<string>();
  return [...defaults, ...customUsers].filter((item) => {
    const key = item.username.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function listLoginOptions(): Promise<Array<{ username: string; label: string }>> {
  const users = await listAvailableUsers();
  return users
    .map((item) => ({
      username: item.username,
      label: item.username,
    }))
    .sort((a, b) => a.username.localeCompare(b.username, 'pt-BR'));
}

export async function createUser(authUser: AuthUser, payload: CreateUserPayload): Promise<{ username: string; role: Role }> {
  if (!canManageUsers(authUser)) {
    forbidden('Acao permitida somente para admin.');
  }

  const username = normalizeUsername(payload.username);
  const password = normalizePassword(payload.password);
  const role: Role = 'MATRIZ';
  const visibleUsernames = normalizeVisibleUsernames(payload.visibleUsernames, username);

  const client = await pool.connect();
  try {
    await ensureUsersTable();
    await client.query('begin');

    if (await usernameExists(username, client)) {
      badRequest('Ja existe um usuario com esse login.');
    }

    await client.query(
      `
        insert into app_usuario (username, password_hash, role, ativo)
        values ($1, $2, $3, true)
      `,
      [username, hashPassword(password), role],
    );
    await upsertUserStatus(username, true, client);

    for (const visibleUsername of visibleUsernames) {
      if (!(await usernameExists(visibleUsername, client))) {
        badRequest(`Usuario visivel invalido: ${visibleUsername}.`);
      }
      await client.query(
        `
          insert into app_usuario_visibilidade (owner_username, visible_username)
          values ($1, $2)
          on conflict do nothing
        `,
        [username, visibleUsername],
      );
    }

    await logAudit(client, {
      entityType: 'usuario',
      entityId: username,
      action: 'CRIADO',
      actor: authUser.username,
      details: {
        descricao: `Usuario ${username} criado por ${authUser.username}`,
        snapshot: {
          username,
          role,
          visibleUsernames,
        },
      },
    });

    await client.query('commit');
    return { username, role };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function changeOwnPassword(
  authUser: AuthUser,
  payload: ChangePasswordPayload,
): Promise<{ username: string }> {
  const currentPassword = normalizePassword(payload.currentPassword);
  const newPassword = normalizePassword(payload.newPassword);
  if (currentPassword === newPassword) {
    badRequest('A nova senha deve ser diferente da senha atual.');
  }

  const validated = await authenticateBasic(authUser.username, currentPassword);
  if (!validated) {
    badRequest('Senha atual invalida.');
  }

  const defaultRecord = USER_MAP.get(authUser.username.toLowerCase());
  const client = await pool.connect();
  try {
    await ensureUsersTable();
    await client.query('begin');

    const existing = await findStoredUser(authUser.username, client);
    const role = existing?.role ?? defaultRecord?.role ?? authUser.role;
    await client.query(
      `
        insert into app_usuario (username, password_hash, role, ativo)
        values ($1, $2, $3, true)
        on conflict (username)
        do update set
          password_hash = excluded.password_hash,
          role = excluded.role,
          ativo = true
      `,
      [authUser.username, hashPassword(newPassword), role],
    );
    await upsertUserStatus(authUser.username, true, client);

    await logAudit(client, {
      entityType: 'usuario',
      entityId: authUser.username,
      action: 'SENHA_ALTERADA',
      actor: authUser.username,
      details: {
        descricao: `Usuario ${authUser.username} trocou sua senha`,
      },
    });

    await client.query('commit');
    return { username: authUser.username };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function inactivateUser(authUser: AuthUser, targetUsernameRaw: unknown): Promise<{ username: string; ativo: false }> {
  if (!canManageUsers(authUser)) {
    forbidden('Acao permitida somente para admin.');
  }

  const targetUsername = normalizeUsername(targetUsernameRaw);
  if (targetUsername === 'admin') {
    badRequest('O usuario admin nao pode ser inativado.');
  }
  if (!(await usernameExists(targetUsername))) {
    badRequest('Usuario nao encontrado.');
  }

  const client = await pool.connect();
  try {
    await ensureUsersTable();
    await client.query('begin');

    const existing = await findStoredUserAnyStatus(targetUsername, client);
    if (existing) {
      await client.query('update app_usuario set ativo = false where lower(username) = lower($1)', [targetUsername]);
    }
    await upsertUserStatus(targetUsername, false, client);

    await logAudit(client, {
      entityType: 'usuario',
      entityId: targetUsername,
      action: 'INATIVADO',
      actor: authUser.username,
      details: {
        descricao: `Usuario ${targetUsername} inativado por ${authUser.username}`,
      },
    });

    await client.query('commit');
    return { username: targetUsername, ativo: false };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
