import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { finishRecovery } from '@/lib/auth/webauthn';
import { authErrorResponse } from '@/lib/auth/runtime';
import { noStoreJson, readJson } from '@/lib/api/request';

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      recoveryKey?: string;
      challengeId?: string;
      response?: RegistrationResponseJSON;
      name?: string;
    }>(request);
    if (!body.recoveryKey || !body.challengeId || !body.response) {
      return noStoreJson({ error: 'Recovery response is incomplete.', code: 'RECOVERY_INCOMPLETE' }, { status: 400 });
    }
    const result = await finishRecovery(request, {
      recoveryKey: body.recoveryKey,
      challengeId: body.challengeId,
      response: body.response,
      name: body.name,
    });
    return noStoreJson(
      { authenticated: true, recoveryKey: result.recoveryKey },
      { headers: { 'Set-Cookie': result.cookie } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

