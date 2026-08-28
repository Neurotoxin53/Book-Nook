import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { finishAdditionalPasskey } from '@/lib/auth/webauthn';
import { authErrorResponse } from '@/lib/auth/runtime';
import { requireFreshSession } from '@/lib/auth/sessions';
import { noStoreJson, readJson } from '@/lib/api/request';

export async function POST(request: Request) {
  try {
    const session = await requireFreshSession(request);
    const body = await readJson<{ challengeId?: string; response?: RegistrationResponseJSON; name?: string }>(request);
    if (!body.challengeId || !body.response) {
      return noStoreJson({ error: 'Passkey response is incomplete.', code: 'PASSKEY_INCOMPLETE' }, { status: 400 });
    }
    return noStoreJson(await finishAdditionalPasskey(request, session.userId, {
      challengeId: body.challengeId,
      response: body.response,
      name: body.name,
    }));
  } catch (error) {
    return authErrorResponse(error);
  }
}

