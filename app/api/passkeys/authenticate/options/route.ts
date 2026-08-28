import { beginAuthentication } from '@/lib/auth/webauthn';
import { authErrorResponse } from '@/lib/auth/runtime';
import { noStoreJson } from '@/lib/api/request';

export async function POST(request: Request) {
  try {
    return noStoreJson(await beginAuthentication(request));
  } catch (error) {
    return authErrorResponse(error);
  }
}

