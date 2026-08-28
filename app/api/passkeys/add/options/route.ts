import { beginAdditionalPasskey } from '@/lib/auth/webauthn';
import { authErrorResponse } from '@/lib/auth/runtime';
import { requireFreshSession } from '@/lib/auth/sessions';
import { noStoreJson } from '@/lib/api/request';

export async function POST(request: Request) {
  try {
    const session = await requireFreshSession(request);
    return noStoreJson(await beginAdditionalPasskey(request, session.userId));
  } catch (error) {
    return authErrorResponse(error);
  }
}

