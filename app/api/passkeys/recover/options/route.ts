import { beginRecovery } from '@/lib/auth/webauthn';
import { authErrorResponse } from '@/lib/auth/runtime';
import { noStoreJson, readJson } from '@/lib/api/request';

export async function POST(request: Request) {
  try {
    const body = await readJson<{ recoveryKey?: string }>(request, 20_000);
    if (!body.recoveryKey) return noStoreJson({ error: 'Recovery key is required.', code: 'RECOVERY_REQUIRED' }, { status: 400 });
    return noStoreJson(await beginRecovery(request, body.recoveryKey));
  } catch (error) {
    return authErrorResponse(error);
  }
}

