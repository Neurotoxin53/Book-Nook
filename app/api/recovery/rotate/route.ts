import { noStoreJson } from '@/lib/api/request';
import { authErrorResponse } from '@/lib/auth/runtime';
import { requireFreshSession } from '@/lib/auth/sessions';
import { rotateRecoveryKey } from '@/lib/auth/webauthn';

export async function POST(request: Request) {
  try {
    const session = await requireFreshSession(request);
    return noStoreJson(await rotateRecoveryKey(request, session.userId));
  } catch (error) {
    return authErrorResponse(error);
  }
}

