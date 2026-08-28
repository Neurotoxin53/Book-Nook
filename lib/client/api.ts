import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import type { BookLookupCandidate, BookRecord, GoodreadsNormalizedRow, ImportSummary } from '@/lib/domain/types';
import type { CreateBookInput, UpdateBookInput } from '@/lib/books/repository';

export class ApiClientError extends Error {
  constructor(message: string, public readonly code: string, public readonly status: number) {
    super(message);
  }
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...init, headers, credentials: 'same-origin' });
  const payload = await response.json().catch(() => ({})) as T & { error?: string; code?: string };
  if (!response.ok) throw new ApiClientError(payload.error || `Request failed (${response.status}).`, payload.code || 'REQUEST_FAILED', response.status);
  return payload;
}

export type SessionState =
  | { authenticated: false }
  | { authenticated: true; user: { id: string; displayName: string }; authenticatedAt: string };

export const api = {
  session: () => requestJson<SessionState>('/api/session'),
  signOut: () => requestJson<{ authenticated: false }>('/api/session', { method: 'DELETE' }),
  library: () => requestJson<{ books: BookRecord[] }>('/api/library'),
  createBook: (book: CreateBookInput) => requestJson<{ book: BookRecord }>('/api/library', { method: 'POST', body: JSON.stringify(book) }),
  updateBook: (entryId: string, update: UpdateBookInput) => requestJson<{ book: BookRecord }>(`/api/library/${encodeURIComponent(entryId)}`, { method: 'PATCH', body: JSON.stringify(update) }),
  deleteBook: (entryId: string) => requestJson<{ deleted: true }>(`/api/library/${encodeURIComponent(entryId)}`, { method: 'DELETE' }),
  lookup: (query: { isbn?: string; title?: string; author?: string }) => {
    const params = new URLSearchParams(Object.entries(query).flatMap(([key, value]) => value?.trim() ? [[key, value.trim()]] : []));
    return requestJson<{ candidates: BookLookupCandidate[]; strategy: string; manualAllowed: true }>(`/api/lookup?${params}`);
  },
  workDetails: (workKey: string) => requestJson<{ synopsis: string; subjects: string[] }>(`/api/lookup?workKey=${encodeURIComponent(workKey)}`),
  importChunk: (body: { jobId?: string; totalRows: number; rows: GoodreadsNormalizedRow[]; finalize: boolean }) => requestJson<{ summary: ImportSummary }>('/api/imports', { method: 'POST', body: JSON.stringify(body) }),
  undoImport: (jobId: string) => requestJson<{ undone: true; removed?: number }>(`/api/imports/${encodeURIComponent(jobId)}/undo`, { method: 'POST' }),
  migrateLocal: (payload: unknown) => requestJson<{ migrationId: string; imported: number; confirmedAt: string; alreadyMigrated: boolean }>('/api/migrate-local', { method: 'POST', body: JSON.stringify(payload) }),
  passkeys: () => requestJson<{ passkeys: Array<{ id: string; name: string; deviceType: string; backedUp: boolean; createdAt: string; lastUsedAt: string | null }> }>('/api/passkeys'),
  revokePasskey: (id: string) => requestJson<{ revoked: true }>('/api/passkeys', { method: 'DELETE', body: JSON.stringify({ id }) }),
  rotateRecovery: () => requestJson<{ recoveryKey: string }>('/api/recovery/rotate', { method: 'POST' }),
  createInvite: async (label?: string) => {
    const result = await requestJson<{ token: string; expiresAt: string }>('/api/admin/invites', {
      method: 'POST',
      body: JSON.stringify({ label }),
    });
    return { inviteToken: result.token, expiresAt: result.expiresAt };
  },
  deleteAccount: () => requestJson<{ deleted: true }>('/api/account', { method: 'DELETE' }),
};

export async function authenticateWithPasskey(useBrowserAutofill = false) {
  const begin = await requestJson<{ options: PublicKeyCredentialRequestOptionsJSON; challengeId: string }>(
    '/api/passkeys/authenticate/options',
    { method: 'POST' },
  );
  const response = await startAuthentication({
    optionsJSON: begin.options,
    useBrowserAutofill,
    verifyBrowserAutofillInput: useBrowserAutofill,
  });
  return requestJson<{ authenticated: true }>('/api/passkeys/authenticate/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId: begin.challengeId, response }),
  });
}

export async function registerWithInvitation(input: { inviteToken: string; displayName: string; passkeyName?: string }) {
  const begin = await requestJson<{
    options: PublicKeyCredentialCreationOptionsJSON;
    challengeId: string;
  }>('/api/passkeys/register/options', { method: 'POST', body: JSON.stringify(input) });
  const response = await startRegistration({ optionsJSON: begin.options });
  return requestJson<{ user: { id: string; displayName: string }; recoveryKey: string }>(
    '/api/passkeys/register/verify',
    {
      method: 'POST',
      body: JSON.stringify({ ...input, challengeId: begin.challengeId, response }),
    },
  );
}

export async function addPasskey(name = 'Backup passkey') {
  const begin = await requestJson<{ options: PublicKeyCredentialCreationOptionsJSON; challengeId: string }>(
    '/api/passkeys/add/options',
    { method: 'POST' },
  );
  const response = await startRegistration({ optionsJSON: begin.options });
  return requestJson<{ success: true }>('/api/passkeys/add/verify', {
    method: 'POST',
    body: JSON.stringify({ challengeId: begin.challengeId, response, name }),
  });
}

export async function recoverWithKey(recoveryKey: string) {
  const begin = await requestJson<{ options: PublicKeyCredentialCreationOptionsJSON; challengeId: string }>(
    '/api/passkeys/recover/options',
    { method: 'POST', body: JSON.stringify({ recoveryKey }) },
  );
  const response = await startRegistration({ optionsJSON: begin.options });
  return requestJson<{ authenticated: true; recoveryKey: string }>('/api/passkeys/recover/verify', {
    method: 'POST',
    body: JSON.stringify({ recoveryKey, challengeId: begin.challengeId, response, name: 'Recovered passkey' }),
  });
}
