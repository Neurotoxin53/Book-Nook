import { noStoreJson } from '@/lib/api/request';
import { authErrorResponse } from '@/lib/auth/runtime';
import { clearSessionCookie, getSession, revokeSession } from '@/lib/auth/sessions';

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    return noStoreJson(session
      ? { authenticated: true, user: { id: session.userId, displayName: session.displayName }, authenticatedAt: session.authenticatedAt }
      : { authenticated: false });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await revokeSession(request);
    return noStoreJson({ authenticated: false }, { headers: { 'Set-Cookie': clearSessionCookie(request) } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

