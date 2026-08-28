import { AuthError } from '@/lib/auth/runtime';

export async function readJson<T>(request: Request, maxBytes = 1_000_000): Promise<T> {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxBytes) throw new AuthError('Request is too large.', 413, 'REQUEST_TOO_LARGE');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new AuthError('Request is too large.', 413, 'REQUEST_TOO_LARGE');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AuthError('Request body must be valid JSON.', 400, 'JSON_INVALID');
  }
}

export function noStoreJson(value: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(value), { ...init, headers });
}

