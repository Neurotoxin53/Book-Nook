import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { finishInviteRegistration } from '@/lib/auth/webauthn';
import { authErrorResponse } from '@/lib/auth/runtime';
import { noStoreJson, readJson } from '@/lib/api/request';

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      inviteToken?: string;
      challengeId?: string;
      response?: RegistrationResponseJSON;
      displayName?: string;
      passkeyName?: string;
    }>(request);
    if (!body.inviteToken || !body.challengeId || !body.response) {
      return noStoreJson({ error: 'Registration response is incomplete.', code: 'REGISTRATION_INCOMPLETE' }, { status: 400 });
    }
    const result = await finishInviteRegistration(request, {
      inviteToken: body.inviteToken,
      challengeId: body.challengeId,
      response: body.response,
      displayName: body.displayName,
      passkeyName: body.passkeyName,
    });
    return noStoreJson(
      { user: result.user, recoveryKey: result.recoveryKey },
      { headers: { 'Set-Cookie': result.cookie } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

