import { noStoreJson } from '@/lib/api/request';
import { authErrorResponse } from '@/lib/auth/runtime';
import { deleteAccount } from '@/lib/auth/security';
import { clearSessionCookie, requireFreshSession } from '@/lib/auth/sessions';

export async function DELETE(request: Request) {
  try {
    const session = await requireFreshSession(request);
    await deleteAccount(session.userId);
    return noStoreJson({ deleted: true }, { headers: { 'Set-Cookie': clearSessionCookie(request) } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

