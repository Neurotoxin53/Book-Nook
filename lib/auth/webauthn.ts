import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { withDatabase } from '@/db/client';
import { fromBase64Url, hmac, randomToken, safeEqual, toBase64Url, userHandle } from '@/lib/auth/crypto';
import { validateRegistrationInvite } from '@/lib/auth/invites';
import { assertRateLimit } from '@/lib/auth/rate-limit';
import { prepareSession, sessionCookie } from '@/lib/auth/sessions';
import {
  assertSameOrigin,
  AuthError,
  getAuthSecret,
  getRecoveryPepper,
  getWebAuthnContext,
  requestFingerprint,
} from '@/lib/auth/runtime';

type Ceremony = 'register' | 'authenticate' | 'recover' | 'add-passkey';

type ChallengeRow = {
  id: string;
  challenge: string;
  ceremony: Ceremony;
  user_id: string | null;
  invite_id: string | null;
  recovery_credential_id: string | null;
  expected_origin: string;
  expected_rp_id: string;
  expires_at: string;
  used_at: string | null;
};

type CredentialRow = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  device_type: string;
  backed_up: number;
  aaguid: string | null;
  name: string | null;
};

const nowIso = () => new Date().toISOString();

function cleanDisplayName(value: string | undefined) {
  return value?.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80) || 'Reader';
}

function serializeTransports(transports: AuthenticatorTransportFuture[] | undefined) {
  return transports?.length ? JSON.stringify(transports) : null;
}

function parseTransports(value: string | null): AuthenticatorTransportFuture[] | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as AuthenticatorTransportFuture[];
  } catch {
    return undefined;
  }
}

async function storeChallenge(
  database: D1Database,
  input: {
    challenge: string;
    ceremony: Ceremony;
    origin: string;
    rpId: string;
    userId?: string;
    inviteId?: string;
    recoveryCredentialId?: string;
  },
) {
  const id = crypto.randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 5 * 60 * 1000);
  await database.prepare(
    `INSERT INTO webauthn_challenge
      (id, challenge, ceremony, user_id, invite_id, recovery_credential_id, expected_origin, expected_rp_id, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id,
    input.challenge,
    input.ceremony,
    input.userId ?? null,
    input.inviteId ?? null,
    input.recoveryCredentialId ?? null,
    input.origin,
    input.rpId,
    expiresAt.toISOString(),
    createdAt.toISOString(),
  ).run();
  return id;
}

async function loadChallenge(database: D1Database, challengeId: string, ceremony: Ceremony) {
  const row = await database.prepare(
    `SELECT id, challenge, ceremony, user_id, invite_id, recovery_credential_id,
            expected_origin, expected_rp_id, expires_at, used_at
     FROM webauthn_challenge WHERE id = ? AND ceremony = ?`,
  ).bind(challengeId, ceremony).first<ChallengeRow>();
  if (!row || row.used_at) throw new AuthError('Passkey challenge is no longer valid.', 400, 'CHALLENGE_INVALID');
  if (new Date(row.expires_at).getTime() <= Date.now()) throw new AuthError('Passkey challenge expired.', 410, 'CHALLENGE_EXPIRED');
  return row;
}

async function listCredentials(database: D1Database, userId: string) {
  const result = await database.prepare(
    `SELECT id, user_id, credential_id, public_key, counter, transports, device_type, backed_up, aaguid, name
     FROM passkey_credential WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at`,
  ).bind(userId).all<CredentialRow>();
  return result.results;
}

function credentialInsert(
  database: D1Database,
  userId: string,
  response: RegistrationResponseJSON,
  info: Awaited<ReturnType<typeof verifyRegistrationResponse>> & { verified: true },
  name?: string,
) {
  const credential = info.registrationInfo.credential;
  return database.prepare(
    `INSERT INTO passkey_credential
      (id, user_id, credential_id, public_key, counter, transports, device_type, backed_up, aaguid, name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    userId,
    credential.id,
    toBase64Url(credential.publicKey),
    credential.counter,
    serializeTransports(response.response.transports),
    info.registrationInfo.credentialDeviceType,
    info.registrationInfo.credentialBackedUp ? 1 : 0,
    info.registrationInfo.aaguid,
    name?.trim().slice(0, 80) || null,
    nowIso(),
  );
}

async function createRecoveryMaterial(database: D1Database, request: Request, userId: string, rotate = false) {
  const id = randomToken(12);
  const secret = randomToken(32);
  const salt = randomToken(18);
  const key = `MBN1.${id}.${secret}`;
  const keyHash = await hmac(getRecoveryPepper(request), `recovery:${id}:${salt}:${secret}`);
  const timestamp = nowIso();
  const statement = rotate
    ? database.prepare(
      `UPDATE recovery_credential
       SET id = ?, key_hash = ?, key_salt = ?, rotated_at = ?, used_at = NULL, revoked_at = NULL
       WHERE user_id = ?`,
    ).bind(id, keyHash, salt, timestamp, userId)
    : database.prepare(
      `INSERT INTO recovery_credential (id, user_id, key_hash, key_salt, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(id, userId, keyHash, salt, timestamp);
  return { key, id, statement };
}

export async function rotateRecoveryKey(request: Request, userId: string) {
  assertSameOrigin(request);
  return withDatabase(async (database) => {
    const material = await createRecoveryMaterial(database, request, userId, true);
    await database.batch([material.statement]);
    return { recoveryKey: material.key };
  });
}

async function validateRecoveryKey(database: D1Database, request: Request, key: string) {
  const [prefix, id, secret] = key.trim().split('.');
  if (prefix !== 'MBN1' || !id || !secret) throw new AuthError('Recovery key is invalid.', 400, 'RECOVERY_INVALID');
  const row = await database.prepare(
    `SELECT id, user_id, key_hash, key_salt, used_at, revoked_at
     FROM recovery_credential WHERE id = ?`,
  ).bind(id).first<{
    id: string; user_id: string; key_hash: string; key_salt: string; used_at: string | null; revoked_at: string | null;
  }>();
  if (!row || row.revoked_at || row.used_at) throw new AuthError('Recovery key is invalid or already used.', 400, 'RECOVERY_INVALID');
  const suppliedHash = await hmac(getRecoveryPepper(request), `recovery:${id}:${row.key_salt}:${secret}`);
  if (!safeEqual(suppliedHash, row.key_hash)) throw new AuthError('Recovery key is invalid.', 400, 'RECOVERY_INVALID');
  return row;
}

export async function beginInviteRegistration(request: Request, inviteToken: string, requestedName?: string) {
  assertSameOrigin(request);
  const context = getWebAuthnContext(request);
  const fingerprint = await requestFingerprint(request);
  return withDatabase(async (database) => {
    await assertRateLimit(database, `register:${fingerprint}`, 8, 15 * 60);
    const invite = await validateRegistrationInvite(database, getAuthSecret(request), inviteToken);
    const userId = crypto.randomUUID();
    const displayName = cleanDisplayName(requestedName);
    const options = await generateRegistrationOptions({
      rpName: context.rpName,
      rpID: context.rpId,
      userID: userHandle(userId),
      userName: `reader-${userId.slice(0, 8)}`,
      userDisplayName: displayName,
      timeout: 5 * 60 * 1000,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'required',
      },
      extensions: { credProps: true },
    });
    const challengeId = await storeChallenge(database, {
      challenge: options.challenge,
      ceremony: 'register',
      origin: context.origin,
      rpId: context.rpId,
      userId,
      inviteId: invite.id,
    });
    return { options, challengeId, displayName };
  });
}

export async function finishInviteRegistration(
  request: Request,
  input: { inviteToken: string; challengeId: string; response: RegistrationResponseJSON; displayName?: string; passkeyName?: string },
) {
  assertSameOrigin(request);
  return withDatabase(async (database) => {
    const challenge = await loadChallenge(database, input.challengeId, 'register');
    const invite = await validateRegistrationInvite(database, getAuthSecret(request), input.inviteToken, false);
    if (!challenge.user_id || invite.id !== challenge.invite_id) throw new AuthError('Invitation does not match this challenge.', 400, 'INVITE_MISMATCH');
    const verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.expected_origin,
      expectedRPID: challenge.expected_rp_id,
      requireUserPresence: true,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo.userVerified) {
      throw new AuthError('Passkey verification failed.', 400, 'PASSKEY_VERIFICATION_FAILED');
    }

    const userId = challenge.user_id;
    const timestamp = nowIso();
    const recovery = await createRecoveryMaterial(database, request, userId);
    const preparedSession = await prepareSession(database, request, userId);
    await database.batch([
      database.prepare('INSERT INTO auth_consumption (id, kind, user_id, created_at) VALUES (?, ?, ?, ?)').bind(`invite:${invite.id}`, 'registration-invite', userId, timestamp),
      database.prepare('INSERT INTO auth_consumption (id, kind, user_id, created_at) VALUES (?, ?, ?, ?)').bind(`challenge:${challenge.id}`, 'webauthn-challenge', userId, timestamp),
      database.prepare(
        'INSERT INTO user_profile (user_id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ).bind(userId, cleanDisplayName(input.displayName), timestamp, timestamp),
      credentialInsert(database, userId, input.response, verification, input.passkeyName || 'Primary passkey'),
      recovery.statement,
      preparedSession.statement,
      database.prepare('UPDATE registration_invite SET used_at = ?, used_by = ? WHERE id = ? AND used_at IS NULL').bind(timestamp, userId, invite.id),
      database.prepare('UPDATE webauthn_challenge SET used_at = ? WHERE id = ? AND used_at IS NULL').bind(timestamp, challenge.id),
    ]);
    return {
      user: { id: userId, displayName: cleanDisplayName(input.displayName) },
      recoveryKey: recovery.key,
      cookie: sessionCookie(request, preparedSession.token, preparedSession.expiresAt),
    };
  });
}

export async function beginAuthentication(request: Request) {
  const context = getWebAuthnContext(request);
  const fingerprint = await requestFingerprint(request);
  return withDatabase(async (database) => {
    await assertRateLimit(database, `authenticate:${fingerprint}`, 20, 15 * 60);
    const options = await generateAuthenticationOptions({
      rpID: context.rpId,
      timeout: 5 * 60 * 1000,
      userVerification: 'required',
    });
    const challengeId = await storeChallenge(database, {
      challenge: options.challenge,
      ceremony: 'authenticate',
      origin: context.origin,
      rpId: context.rpId,
    });
    return { options, challengeId };
  });
}

export async function finishAuthentication(
  request: Request,
  input: { challengeId: string; response: AuthenticationResponseJSON },
) {
  assertSameOrigin(request);
  return withDatabase(async (database) => {
    const challenge = await loadChallenge(database, input.challengeId, 'authenticate');
    const credential = await database.prepare(
      `SELECT id, user_id, credential_id, public_key, counter, transports, device_type, backed_up, aaguid, name
       FROM passkey_credential WHERE credential_id = ? AND revoked_at IS NULL`,
    ).bind(input.response.id).first<CredentialRow>();
    if (!credential) throw new AuthError('Passkey is not recognized.', 401, 'PASSKEY_UNKNOWN');
    const verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.expected_origin,
      expectedRPID: challenge.expected_rp_id,
      requireUserVerification: true,
      credential: {
        id: credential.credential_id,
        publicKey: fromBase64Url(credential.public_key),
        counter: credential.counter,
        transports: parseTransports(credential.transports),
      },
    });
    if (!verification.verified || !verification.authenticationInfo.userVerified) {
      throw new AuthError('Passkey verification failed.', 401, 'PASSKEY_VERIFICATION_FAILED');
    }
    const preparedSession = await prepareSession(database, request, credential.user_id);
    const timestamp = nowIso();
    await database.batch([
      database.prepare('INSERT INTO auth_consumption (id, kind, user_id, created_at) VALUES (?, ?, ?, ?)').bind(`challenge:${challenge.id}`, 'webauthn-challenge', credential.user_id, timestamp),
      database.prepare(
        `UPDATE passkey_credential SET counter = ?, device_type = ?, backed_up = ?, last_used_at = ? WHERE id = ?`,
      ).bind(
        verification.authenticationInfo.newCounter,
        verification.authenticationInfo.credentialDeviceType,
        verification.authenticationInfo.credentialBackedUp ? 1 : 0,
        timestamp,
        credential.id,
      ),
      preparedSession.statement,
      database.prepare('UPDATE webauthn_challenge SET used_at = ? WHERE id = ? AND used_at IS NULL').bind(timestamp, challenge.id),
    ]);
    return { cookie: sessionCookie(request, preparedSession.token, preparedSession.expiresAt) };
  });
}

export async function beginAdditionalPasskey(request: Request, userId: string) {
  assertSameOrigin(request);
  const context = getWebAuthnContext(request);
  return withDatabase(async (database) => {
    const credentials = await listCredentials(database, userId);
    const options = await generateRegistrationOptions({
      rpName: context.rpName,
      rpID: context.rpId,
      userID: userHandle(userId),
      userName: `reader-${userId.slice(0, 8)}`,
      userDisplayName: 'My Book Nook reader',
      timeout: 5 * 60 * 1000,
      attestationType: 'none',
      excludeCredentials: credentials.map((credential) => ({
        id: credential.credential_id,
        transports: parseTransports(credential.transports),
      })),
      authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'required' },
    });
    const challengeId = await storeChallenge(database, {
      challenge: options.challenge,
      ceremony: 'add-passkey',
      origin: context.origin,
      rpId: context.rpId,
      userId,
    });
    return { options, challengeId };
  });
}

export async function finishAdditionalPasskey(
  request: Request,
  userId: string,
  input: { challengeId: string; response: RegistrationResponseJSON; name?: string },
) {
  assertSameOrigin(request);
  return withDatabase(async (database) => {
    const challenge = await loadChallenge(database, input.challengeId, 'add-passkey');
    if (challenge.user_id !== userId) throw new AuthError('This challenge belongs to another account.', 403, 'CHALLENGE_OWNER_MISMATCH');
    const verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.expected_origin,
      expectedRPID: challenge.expected_rp_id,
      requireUserPresence: true,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo.userVerified) throw new AuthError('Passkey verification failed.', 400, 'PASSKEY_VERIFICATION_FAILED');
    const timestamp = nowIso();
    await database.batch([
      database.prepare('INSERT INTO auth_consumption (id, kind, user_id, created_at) VALUES (?, ?, ?, ?)').bind(`challenge:${challenge.id}`, 'webauthn-challenge', userId, timestamp),
      credentialInsert(database, userId, input.response, verification, input.name || 'Backup passkey'),
      database.prepare('UPDATE webauthn_challenge SET used_at = ? WHERE id = ? AND used_at IS NULL').bind(timestamp, challenge.id),
    ]);
    return { success: true };
  });
}

export async function beginRecovery(request: Request, recoveryKey: string) {
  assertSameOrigin(request);
  const context = getWebAuthnContext(request);
  const fingerprint = await requestFingerprint(request);
  return withDatabase(async (database) => {
    await assertRateLimit(database, `recover:${fingerprint}`, 5, 60 * 60);
    const recovery = await validateRecoveryKey(database, request, recoveryKey);
    const credentials = await listCredentials(database, recovery.user_id);
    const options = await generateRegistrationOptions({
      rpName: context.rpName,
      rpID: context.rpId,
      userID: userHandle(recovery.user_id),
      userName: `reader-${recovery.user_id.slice(0, 8)}`,
      userDisplayName: 'My Book Nook reader',
      timeout: 5 * 60 * 1000,
      attestationType: 'none',
      excludeCredentials: credentials.map((credential) => ({ id: credential.credential_id, transports: parseTransports(credential.transports) })),
      authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'required' },
    });
    const challengeId = await storeChallenge(database, {
      challenge: options.challenge,
      ceremony: 'recover',
      origin: context.origin,
      rpId: context.rpId,
      userId: recovery.user_id,
      recoveryCredentialId: recovery.id,
    });
    return { options, challengeId };
  });
}

export async function finishRecovery(
  request: Request,
  input: { recoveryKey: string; challengeId: string; response: RegistrationResponseJSON; name?: string },
) {
  assertSameOrigin(request);
  return withDatabase(async (database) => {
    const challenge = await loadChallenge(database, input.challengeId, 'recover');
    const recovery = await validateRecoveryKey(database, request, input.recoveryKey);
    if (challenge.user_id !== recovery.user_id || challenge.recovery_credential_id !== recovery.id) {
      throw new AuthError('Recovery proof does not match this challenge.', 403, 'RECOVERY_MISMATCH');
    }
    const verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.expected_origin,
      expectedRPID: challenge.expected_rp_id,
      requireUserPresence: true,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo.userVerified) throw new AuthError('Passkey verification failed.', 400, 'PASSKEY_VERIFICATION_FAILED');
    const preparedSession = await prepareSession(database, request, recovery.user_id);
    const replacementRecovery = await createRecoveryMaterial(database, request, recovery.user_id, true);
    const timestamp = nowIso();
    await database.batch([
      database.prepare('INSERT INTO auth_consumption (id, kind, user_id, created_at) VALUES (?, ?, ?, ?)').bind(`challenge:${challenge.id}`, 'webauthn-challenge', recovery.user_id, timestamp),
      credentialInsert(database, recovery.user_id, input.response, verification, input.name || 'Recovered passkey'),
      replacementRecovery.statement,
      preparedSession.statement,
      database.prepare('UPDATE webauthn_challenge SET used_at = ? WHERE id = ? AND used_at IS NULL').bind(timestamp, challenge.id),
    ]);
    return {
      recoveryKey: replacementRecovery.key,
      cookie: sessionCookie(request, preparedSession.token, preparedSession.expiresAt),
    };
  });
}
