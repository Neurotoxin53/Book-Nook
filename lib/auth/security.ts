import { withDatabase } from '@/db/client';
import { AuthError } from '@/lib/auth/runtime';

export async function listPasskeys(userId: string) {
  return withDatabase(async (database) => {
    const result = await database.prepare(
      `SELECT id, name, device_type, backed_up, aaguid, created_at, last_used_at
       FROM passkey_credential WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at`,
    ).bind(userId).all<{
      id: string; name: string | null; device_type: string; backed_up: number; aaguid: string | null; created_at: string; last_used_at: string | null;
    }>();
    return result.results.map((credential) => ({
      id: credential.id,
      name: credential.name || 'Passkey',
      deviceType: credential.device_type,
      backedUp: Boolean(credential.backed_up),
      aaguid: credential.aaguid,
      createdAt: credential.created_at,
      lastUsedAt: credential.last_used_at,
    }));
  });
}

export async function revokePasskey(userId: string, credentialId: string) {
  return withDatabase(async (database) => {
    const active = await database.prepare(
      'SELECT COUNT(*) AS count FROM passkey_credential WHERE user_id = ? AND revoked_at IS NULL',
    ).bind(userId).first<{ count: number }>();
    if ((active?.count ?? 0) <= 1) throw new AuthError('Add a backup passkey before revoking your last one.', 409, 'LAST_PASSKEY');
    const result = await database.prepare(
      `UPDATE passkey_credential SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
    ).bind(new Date().toISOString(), credentialId, userId).run();
    if (!result.meta.changes) throw new AuthError('Passkey not found.', 404, 'PASSKEY_NOT_FOUND');
    return { revoked: true };
  });
}

export async function deleteAccount(userId: string) {
  return withDatabase(async (database) => {
    const result = await database.prepare('DELETE FROM user_profile WHERE user_id = ?').bind(userId).run();
    if (!result.meta.changes) throw new AuthError('Account not found.', 404, 'ACCOUNT_NOT_FOUND');
    return { deleted: true };
  });
}

