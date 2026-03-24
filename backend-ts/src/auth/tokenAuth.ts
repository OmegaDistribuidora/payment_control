import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { findAuthUserByUsername, type AuthUser } from './users.js';

type LocalAuthPayload = {
  username: string;
};

type EcosystemSsoPayload = jwt.JwtPayload & {
  targetLogin?: string;
  ecosystemIsAdmin?: boolean;
};

const consumedSsoTokens = new Map<string, number>();

function cleanupConsumedSsoTokens(): void {
  const now = Date.now();
  for (const [jti, expiresAt] of consumedSsoTokens.entries()) {
    if (expiresAt <= now) {
      consumedSsoTokens.delete(jti);
    }
  }
}

export function signAuthToken(user: AuthUser): string {
  return jwt.sign(
    { username: user.username },
    env.authTokenSecret,
    {
      algorithm: 'HS256',
      expiresIn: '12h',
      subject: user.username,
    },
  );
}

export function verifyAuthToken(token: string): LocalAuthPayload {
  return jwt.verify(token, env.authTokenSecret, {
    algorithms: ['HS256'],
  }) as LocalAuthPayload;
}

export async function authenticateBearer(token: string): Promise<AuthUser | null> {
  const payload = verifyAuthToken(token);
  return findAuthUserByUsername(payload.username);
}

export function verifyEcosystemSsoToken(token: string): EcosystemSsoPayload {
  return jwt.verify(token, env.ecosystemSso.sharedSecret, {
    algorithms: ['HS256'],
    issuer: env.ecosystemSso.issuer,
    audience: env.ecosystemSso.audience,
  }) as EcosystemSsoPayload;
}

export function isConsumedSsoToken(jti: unknown): boolean {
  if (typeof jti !== 'string' || !jti.trim()) return false;
  cleanupConsumedSsoTokens();
  return consumedSsoTokens.has(jti);
}

export function markConsumedSsoToken(jti: unknown, exp: unknown): void {
  if (typeof jti !== 'string' || typeof exp !== 'number') return;
  cleanupConsumedSsoTokens();
  consumedSsoTokens.set(jti, exp * 1000);
}
