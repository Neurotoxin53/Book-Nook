import { noStoreJson, readJson } from '@/lib/api/request';
import { authErrorResponse } from '@/lib/auth/runtime';
import { listPasskeys, revokePasskey } from '@/lib/auth/security';
import { requireFreshSession, requireSession } from '@/lib/auth/sessions';

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    return noStoreJson({ passkeys: await listPasskeys(session.userId) });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireFreshSession(request);
    const body = await readJson<{ id?: string }>(request, 20_000);
    if (!body.id) return noStoreJson({ error: 'Passkey id is required.', code: 'PASSKEY_ID_REQUIRED' }, { status: 400 });
    return noStoreJson(await revokePasskey(session.userId, body.id));
  } catch (error) {
    return authErrorResponse(error);
  }
}

