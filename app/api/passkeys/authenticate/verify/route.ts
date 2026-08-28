import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { finishAuthentication } from '@/lib/auth/webauthn';
import { authErrorResponse } from '@/lib/auth/runtime';
import { noStoreJson, readJson } from '@/lib/api/request';

export async function POST(request: Request) {
  try {
    const body = await readJson<{ challengeId?: string; response?: AuthenticationResponseJSON }>(request);
    if (!body.challengeId || !body.response) {
      return noStoreJson({ error: 'Authentication response is incomplete.', code: 'AUTHENTICATION_INCOMPLETE' }, { status: 400 });
    }
    const result = await finishAuthentication(request, { challengeId: body.challengeId, response: body.response });
    return noStoreJson({ authenticated: true }, { headers: { 'Set-Cookie': result.cookie } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

