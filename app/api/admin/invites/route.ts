import { withDatabase } from '@/db/client';
import { createRegistrationInvite } from '@/lib/auth/invites';
import { authErrorResponse, AuthError, getAuthSecret, isInviteAdmin } from '@/lib/auth/runtime';
import { noStoreJson, readJson } from '@/lib/api/request';

export async function POST(request: Request) {
  try {
    if (!isInviteAdmin(request)) throw new AuthError('Invitation administration is restricted.', 403, 'ADMIN_REQUIRED');
    const creator = request.headers.get('oai-authenticated-user-id');
    if (!creator) throw new AuthError('Authenticated Site owner header is missing.', 403, 'ADMIN_HEADER_REQUIRED');
    const body = await readJson<{ label?: string; ttlHours?: number }>(request, 20_000);
    const ttlHours = Math.min(24 * 14, Math.max(1, Math.round(body.ttlHours ?? 72)));
    const invite = await withDatabase((database) => createRegistrationInvite(
      database,
      getAuthSecret(request),
      creator,
      body.label?.slice(0, 100),
      ttlHours * 60 * 60,
    ));
    return noStoreJson(invite, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

