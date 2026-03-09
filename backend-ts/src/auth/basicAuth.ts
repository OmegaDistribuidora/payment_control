import type { FastifyReply, FastifyRequest } from 'fastify';
import { authenticateBasic, type AuthUser } from './users.js';

export function parseBasicAuthHeader(value: string | undefined): { username: string; password: string } | null {
  if (!value) return null;
  const [scheme, token] = value.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'basic') return null;
  let decoded = '';
  try {
    decoded = Buffer.from(token, 'base64').toString('utf8');
  } catch {
    return null;
  }
  const separator = decoded.indexOf(':');
  if (separator <= 0) return null;
  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  return { username, password };
}

function sendUnauthorized(reply: FastifyReply): void {
  reply.header('WWW-Authenticate', 'Basic realm="payment-control"');
  reply.status(401).send({
    timestamp: new Date().toISOString(),
    status: 401,
    error: 'UNAUTHORIZED',
    message: 'Credenciais invalidas.',
  });
}

export async function requireBasicAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.method === 'OPTIONS') return;
  if (!request.url.startsWith('/api/')) return;
  if (request.method === 'GET' && request.url.startsWith('/api/auth/login-options')) return;

  const parsed = parseBasicAuthHeader(request.headers.authorization);
  if (!parsed) {
    sendUnauthorized(reply);
    return;
  }
  const authUser = await authenticateBasic(parsed.username, parsed.password);
  if (!authUser) {
    sendUnauthorized(reply);
    return;
  }
  request.authUser = authUser;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}
