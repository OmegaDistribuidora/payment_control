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

const USERS: UserRecord[] = [
  { username: 'admin', password: 'Omega@123', role: 'GERENCIA' },
  { username: 'diretoria', password: 'Diretoria@123', role: 'DIRETORIA' },
  { username: 'rh', password: 'Carlos@123', role: 'RH' },
  { username: 'omega.matriz', password: 'Matriz@123', role: 'MATRIZ' },
  { username: 'omega.sobral', password: 'Sobral@123', role: 'SOBRAL' },
  { username: 'omega.cariri', password: 'Cariri@123', role: 'CARIRI' },
];

const USER_MAP = new Map<string, UserRecord>(USERS.map((item) => [item.username.toLowerCase(), item]));

export function authenticateBasic(username: string, password: string): AuthUser | null {
  const record = USER_MAP.get(String(username).toLowerCase());
  if (!record) return null;
  if (record.password !== password) return null;
  return { username: record.username, role: record.role };
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

export function perfilCriador(user: AuthUser): string {
  return user.role;
}
