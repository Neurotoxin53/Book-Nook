import { env } from 'cloudflare:workers';
import { hmac } from '@/lib/auth/crypto';

type AuthBindings = {
  AUTH_SECRET?: string;
  AUTH_ALLOWED_ORIGINS?: string;
  INVITE_ADMIN_USER_IDS?: string;
  RECOVERY_PEPPER?: string;
};

const DEFAULT_ORIGINS = [
  'https://my-book-nook.samxl.chatgpt.site',
  'https://book-nook-journal.samxl.chatgpt.site',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = 'AUTH_ERROR',
  ) {
    super(message);
  }
}

export function getAuthBindings() {
  return env as AuthBindings;
}

function configuredOrigins() {
  return [
    ...DEFAULT_ORIGINS,
    ...(getAuthBindings().AUTH_ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean),
  ];
}

export function getRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const originHeader = request.headers.get('origin');
  const candidate = originHeader || requestUrl.origin;
  if (!configuredOrigins().includes(candidate)) {
    throw new AuthError('This origin is not allowed.', 403, 'ORIGIN_NOT_ALLOWED');
  }
  return candidate;
}

export function assertSameOrigin(request: Request) {
  const origin = getRequestOrigin(request);
  const requestUrl = new URL(request.url);
  const requestOrigin = requestUrl.origin;
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const effectiveOrigin = forwardedHost
    ? `${request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || requestUrl.protocol.slice(0, -1)}://${forwardedHost}`
    : requestOrigin;
  if (origin !== effectiveOrigin && !configuredOrigins().includes(effectiveOrigin)) {
    throw new AuthError('Cross-origin request rejected.', 403, 'ORIGIN_MISMATCH');
  }
  return origin;
}

export function getAuthSecret(request: Request) {
  const configured = getAuthBindings().AUTH_SECRET;
  if (configured && configured.length >= 32) return configured;
  const hostname = new URL(request.url).hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'my-book-nook-local-development-secret-only';
  }
  throw new AuthError('Authentication is not configured.', 503, 'AUTH_NOT_CONFIGURED');
}

export function getRecoveryPepper(request: Request) {
  return getAuthBindings().RECOVERY_PEPPER || `${getAuthSecret(request)}:recovery`;
}

export function getWebAuthnContext(request: Request) {
  const origin = getRequestOrigin(request);
  return { origin, rpId: new URL(origin).hostname, rpName: 'My Book Nook' };
}

export async function requestFingerprint(request: Request) {
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'local';
  return hmac(getAuthSecret(request), `ip:${ip}`);
}

export function isInviteAdmin(request: Request) {
  const accountUserId = request.headers.get('oai-authenticated-user-id');
  const configured = (getAuthBindings().INVITE_ADMIN_USER_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  const forwardedHostname = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim().split(':')[0];
  const local = [new URL(request.url).hostname, forwardedHostname].some((hostname) => hostname && ['localhost', '127.0.0.1'].includes(hostname));
  return Boolean(accountUserId && (configured.includes(accountUserId) || (local && configured.length === 0)));
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
  console.error(error);
  return Response.json({ error: 'Authentication request failed.', code: 'AUTH_INTERNAL' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
}
