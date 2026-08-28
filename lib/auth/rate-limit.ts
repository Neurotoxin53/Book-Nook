import { AuthError } from '@/lib/auth/runtime';

export async function assertRateLimit(
  database: D1Database,
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const now = new Date();
  const current = await database.prepare(
    'SELECT count, expires_at FROM auth_rate_limit WHERE key = ?',
  ).bind(key).first<{ count: number; expires_at: string }>();

  if (!current || new Date(current.expires_at) <= now) {
    const expiresAt = new Date(now.getTime() + windowSeconds * 1000).toISOString();
    await database.prepare(
      `INSERT INTO auth_rate_limit (key, count, window_started_at, expires_at)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(key) DO UPDATE SET count = 1, window_started_at = excluded.window_started_at, expires_at = excluded.expires_at`,
    ).bind(key, now.toISOString(), expiresAt).run();
    return;
  }

  if (current.count >= limit) throw new AuthError('Too many attempts. Try again later.', 429, 'RATE_LIMITED');
  await database.prepare('UPDATE auth_rate_limit SET count = count + 1 WHERE key = ?').bind(key).run();
}

