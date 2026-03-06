import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../db/pool.js';
import { badRequest, forbidden } from '../http/http-error.js';
import { trimToNull } from '../http/utils.js';

export type Role = 'GERENCIA' | 'DIRETORIA' | 'RH' | 'MATRIZ' | 'SOBRAL' | 'CARIRI';

export type AuthUser = {
  username: string;
  role: Role;
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
};

type CreateUserPayload = {
  username?: unknown;
  password?: unknown;
  role?: unknown;
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
const ROLE_SET = new Set<Role>(['GERENCIA', 'DIRETORIA', 'RH', 'MATRIZ', 'SOBRAL', 'CARIRI']);

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

function normalizeRole(value: unknown): Role {
  const role = trimToNull(value)?.toUpperCase() as Role | undefined;
  if (!role || !ROLE_SET.has(role)) {
    badRequest('Perfil invalido.');
  }
  return role;
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

async function usernameExists(username: string, client?: PoolClient): Promise<boolean> {
  if (USER_MAP.has(username.toLowerCase())) {
    return true;
  }
  return Boolean(await findStoredUser(username, client));
}

export async function authenticateBasic(username: string, password: string): Promise<AuthUser | null> {
  const normalizedUsername = String(username ?? '').trim().toLowerCase();
  const record = USER_MAP.get(normalizedUsername);
  if (record && record.password === password) {
    return { username: record.username, role: record.role };
  }

  const stored = await findStoredUser(normalizedUsername).catch(() => null);
  if (!stored) return null;
  if (!verifyPassword(password, stored.passwordHash)) return null;
  return {
    username: stored.username,
    role: stored.role,
  };
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

  const seen = new Set<string>();
  return all.filter((item) => {
    const key = item.username.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function createUser(authUser: AuthUser, payload: CreateUserPayload): Promise<{ username: string; role: Role }> {
  if (!canManageUsers(authUser)) {
    forbidden('Acao permitida somente para admin.');
  }

  const username = normalizeUsername(payload.username);
  const password = normalizePassword(payload.password);
  const role = payload.role ? normalizeRole(payload.role) : 'MATRIZ';

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

    await client.query('commit');
    return { username, role };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
