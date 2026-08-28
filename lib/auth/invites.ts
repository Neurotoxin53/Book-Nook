import { decodeJson, encodeJson, hmac, randomToken, safeEqual } from '@/lib/auth/crypto';
import { AuthError } from '@/lib/auth/runtime';

type InvitePayload = { id: string; exp: number; nonce: string; v: 1 };

export async function createRegistrationInvite(
  database: D1Database,
  secret: string,
  createdBy: string,
  label: string | undefined,
  ttlSeconds = 7 * 24 * 60 * 60,
) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const encoded = encodeJson({ id, exp: Math.floor(expiresAt.getTime() / 1000), nonce: randomToken(18), v: 1 } satisfies InvitePayload);
  const signature = await hmac(secret, `mbni.${encoded}`);
  const token = `mbni.${encoded}.${signature}`;
  const tokenHash = await hmac(secret, `invite:${token}`);
  const now = new Date().toISOString();
  await database.prepare(
    `INSERT INTO registration_invite (id, token_hash, created_by, label, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(id, tokenHash, createdBy, label || null, expiresAt.toISOString(), now).run();
  return { token, id, expiresAt: expiresAt.toISOString() };
}

export async function validateRegistrationInvite(
  database: D1Database,
  secret: string,
  token: string,
  countAttempt = true,
) {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'mbni') throw new AuthError('Invitation is invalid.', 400, 'INVITE_INVALID');
  const expected = await hmac(secret, `mbni.${parts[1]}`);
  if (!safeEqual(expected, parts[2])) throw new AuthError('Invitation is invalid.', 400, 'INVITE_INVALID');
  let payload: InvitePayload;
  try {
    payload = decodeJson<InvitePayload>(parts[1]);
  } catch {
    throw new AuthError('Invitation is invalid.', 400, 'INVITE_INVALID');
  }
  if (payload.v !== 1 || payload.exp * 1000 <= Date.now()) throw new AuthError('Invitation has expired.', 410, 'INVITE_EXPIRED');
  const tokenHash = await hmac(secret, `invite:${token}`);
  const row = await database.prepare(
    `SELECT id, expires_at, used_at, revoked_at, attempts FROM registration_invite
     WHERE id = ? AND token_hash = ?`,
  ).bind(payload.id, tokenHash).first<{
    id: string; expires_at: string; used_at: string | null; revoked_at: string | null; attempts: number;
  }>();
  if (!row) throw new AuthError('Invitation is invalid.', 400, 'INVITE_INVALID');
  if (row.revoked_at) throw new AuthError('Invitation was revoked.', 410, 'INVITE_REVOKED');
  if (row.used_at) throw new AuthError('Invitation has already been used.', 409, 'INVITE_USED');
  if (new Date(row.expires_at).getTime() <= Date.now()) throw new AuthError('Invitation has expired.', 410, 'INVITE_EXPIRED');
  if (row.attempts >= 20) throw new AuthError('Invitation is locked after too many attempts.', 429, 'INVITE_LOCKED');
  if (countAttempt) await database.prepare('UPDATE registration_invite SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run();
  return row;
}

