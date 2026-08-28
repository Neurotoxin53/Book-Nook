import { withDatabase } from '@/db/client';
import { canIssueRegistrationInvite } from '@/lib/auth/invite-authorization';
import { createRegistrationInvite } from '@/lib/auth/invites';
import { authErrorResponse, AuthError, getAuthSecret, isInviteAdmin } from '@/lib/auth/runtime';
import { noStoreJson, readJson } from '@/lib/api/request';

export async function POST(request: Request) {
  try {
    const creator = request.headers.get('oai-authenticated-user-id');
    if (!creator) throw new AuthError('Authenticated Site owner header is missing.', 403, 'ADMIN_HEADER_REQUIRED');
    const body = await readJson<{ label?: string; ttlHours?: number }>(request, 20_000);
    const ttlHours = Math.min(24 * 14, Math.max(1, Math.round(body.ttlHours ?? 72)));
    const invite = await withDatabase(async (database) => {
      const existingUser = await database.prepare(
        'SELECT user_id FROM user_profile WHERE deleted_at IS NULL LIMIT 1',
      ).first<{ user_id: string }>();
      const authorized = canIssueRegistrationInvite({
        creatorId: creator,
        isConfiguredAdmin: isInviteAdmin(request),
        hasRegisteredUsers: Boolean(existingUser),
      });
      if (!authorized) throw new AuthError('Invitation administration is restricted.', 403, 'ADMIN_REQUIRED');
      return createRegistrationInvite(
        database,
        getAuthSecret(request),
        creator,
        body.label?.slice(0, 100),
        ttlHours * 60 * 60,
      );
    });
    return noStoreJson(invite, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
