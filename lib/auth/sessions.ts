import { hmac, randomToken } from '@/lib/auth/crypto';
import { withDatabase } from '@/db/client';
import { AuthError, getAuthSecret } from '@/lib/auth/runtime';

const COOKIE_NAME = 'mbn_session';

function parseCookies(request: Request) {
  return Object.fromEntries((request.headers.get('cookie') ?? '').split(';').flatMap((part) => {
    const index = part.indexOf('=');
    if (index < 0) return [];
    return [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]];
  }));
}

export async function prepareSession(database: D1Database, request: Request, userId: string) {
  const id = crypto.randomUUID();
  const token = `mbns.${id}.${randomToken(32)}`;
  const tokenHash = await hmac(getAuthSecret(request), `session:${token}`);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    token,
    expiresAt: expiresAt.toISOString(),
    statement: database.prepare(
      `INSERT INTO session (id, user_id, token_hash, expires_at, created_at, updated_at, ip_hash, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      userId,
      tokenHash,
      expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString(),
      null,
      request.headers.get('user-agent')?.slice(0, 500) ?? null,
    ),
  };
}

export function sessionCookie(request: Request, token: string, expiresAt: string) {
  const secure = new URL(request.url).protocol === 'https:';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === 'https:';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

export async function getSession(request: Request) {
  const token = parseCookies(request)[COOKIE_NAME];
  if (!token) return null;
  const tokenHash = await hmac(getAuthSecret(request), `session:${token}`);
  return withDatabase(async (database) => {
    const session = await database.prepare(
      `SELECT s.id, s.user_id, s.expires_at, s.created_at, s.updated_at, u.display_name
       FROM session s JOIN user_profile u ON u.user_id = s.user_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND u.deleted_at IS NULL AND s.expires_at > ?`,
    ).bind(tokenHash, new Date().toISOString()).first<{
      id: string; user_id: string; expires_at: string; created_at: string; updated_at: string; display_name: string | null;
    }>();
    if (!session) return null;
    if (Date.now() - new Date(session.updated_at).getTime() > 15 * 60 * 1000) {
      await database.prepare('UPDATE session SET updated_at = ? WHERE id = ?').bind(new Date().toISOString(), session.id).run();
    }
    return {
      id: session.id,
      userId: session.user_id,
      displayName: session.display_name || 'Reader',
      expiresAt: session.expires_at,
      authenticatedAt: session.created_at,
      token,
    };
  });
}

export async function requireSession(request: Request) {
  const session = await getSession(request);
  if (!session) throw new AuthError('Sign in with a passkey to continue.', 401, 'SESSION_REQUIRED');
  return session;
}

export async function requireFreshSession(request: Request, maxAgeSeconds = 10 * 60) {
  const session = await requireSession(request);
  if (Date.now() - new Date(session.authenticatedAt).getTime() > maxAgeSeconds * 1000) {
    throw new AuthError('Verify your passkey again before changing account security.', 401, 'FRESH_SESSION_REQUIRED');
  }
  return session;
}

export async function revokeSession(request: Request) {
  const session = await getSession(request);
  if (!session) return;
  await withDatabase((database) => database.prepare('UPDATE session SET revoked_at = ? WHERE id = ?').bind(new Date().toISOString(), session.id).run().then(() => undefined));
}
