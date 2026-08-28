import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const LOCAL_SECRET = 'my-book-nook-local-development-secret-only';

function hmac(value: string) {
  return createHmac('sha256', LOCAL_SECRET).update(value).digest('base64url');
}

function findLocalD1() {
  const directory = join(process.cwd(), '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!existsSync(directory)) throw new Error('Local D1 state has not been initialized.');
  const candidates = readdirSync(directory).filter((name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite');
  if (candidates.length !== 1) throw new Error(`Expected one local D1 database, found ${candidates.length}.`);
  return join(directory, candidates[0]);
}

function createLocalInvite(expiryOffsetSeconds = 60 * 60) {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + expiryOffsetSeconds * 1_000);
  const payload = Buffer.from(JSON.stringify({
    id,
    exp: Math.floor(expiresAt.getTime() / 1_000),
    nonce: randomBytes(18).toString('base64url'),
    v: 1,
  })).toString('base64url');
  const token = `mbni.${payload}.${hmac(`mbni.${payload}`)}`;
  const database = new DatabaseSync(findLocalD1());
  try {
    database.exec('DELETE FROM auth_rate_limit');
    database.prepare(
      `INSERT INTO registration_invite
       (id, token_hash, created_by, label, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, hmac(`invite:${token}`), 'playwright', 'Virtual authenticator test', expiresAt.toISOString(), new Date().toISOString());
  } finally {
    database.close();
  }
  return token;
}

async function addVirtualAuthenticator(context: BrowserContext, page: Page, transport: 'internal' | 'usb' = 'internal') {
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const result = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport,
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { cdp, authenticatorId: result.authenticatorId };
}

test('passkey-only account protects a durable library and recovers safely', async ({ context, page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'My library' })).toBeVisible();
  const unauthorizedLibrary = await page.request.get(`${BASE_URL}/api/library`);
  expect(unauthorizedLibrary.status()).toBe(401);

  const expiredInvite = createLocalInvite(-60);
  const expiredAttempt = await page.request.post(`${BASE_URL}/api/passkeys/register/options`, {
    headers: { Origin: BASE_URL },
    data: { inviteToken: expiredInvite, displayName: 'Expired attempt' },
  });
  expect(expiredAttempt.status()).toBe(410);
  expect((await expiredAttempt.json()).code).toBe('INVITE_EXPIRED');

  const primaryAuthenticator = await addVirtualAuthenticator(context, page);
  const inviteToken = createLocalInvite();
  const tamperedInvite = `${inviteToken.slice(0, -1)}${inviteToken.endsWith('A') ? 'B' : 'A'}`;
  const tamperedAttempt = await page.request.post(`${BASE_URL}/api/passkeys/register/options`, {
    headers: { Origin: BASE_URL },
    data: { inviteToken: tamperedInvite, displayName: 'Tampered attempt' },
  });
  expect(tamperedAttempt.status()).toBe(400);
  expect((await tamperedAttempt.json()).code).toBe('INVITE_INVALID');

  await page.getByRole('button', { name: 'Unlock with passkey' }).first().click();
  await page.getByRole('tab', { name: 'Use invitation' }).click();
  await page.getByLabel('Your name').fill('Virtual Reader');
  await page.getByLabel('Invitation').fill(inviteToken);
  await page.getByRole('button', { name: 'Create my passkey' }).click();

  await expect(page.getByRole('heading', { name: 'Save your recovery key' })).toBeVisible();
  const recoveryKey = (await page.locator('.recovery-key').textContent())?.trim() ?? '';
  expect(recoveryKey).toMatch(/^MBN1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  await page.getByLabel('I saved this key somewhere private.').check();
  await page.getByRole('button', { name: 'Continue to my library' }).click();
  await expect(page.getByText('Virtual Reader’s library')).toBeVisible();

  const replay = await page.request.post(`${BASE_URL}/api/passkeys/register/options`, {
    headers: { Origin: BASE_URL },
    data: { inviteToken, displayName: 'Replay attempt' },
  });
  expect(replay.status()).toBe(409);
  expect((await replay.json()).code).toBe('INVITE_USED');

  await page.getByRole('button', { name: 'Add book' }).click();
  const addDialog = page.getByRole('dialog', { name: 'Add a book' });
  const entryForm = addDialog.locator('.book-entry-form');
  await entryForm.getByLabel('Title', { exact: true }).fill('The Virtual Garden');
  await entryForm.getByLabel('Author', { exact: true }).fill('Codex Reader');
  await entryForm.getByLabel('Synopsis', { exact: true }).fill('A local WebAuthn acceptance-test book.');
  await addDialog.getByRole('button', { name: 'Add to my nook' }).click();
  await expect(page.getByRole('heading', { name: 'The Virtual Garden' })).toBeVisible();

  const libraryResponse = await page.request.get(`${BASE_URL}/api/library`);
  expect(libraryResponse.ok()).toBe(true);
  const library = await libraryResponse.json() as { books: Array<{ work: { title: string } }> };
  expect(library.books.some((book) => book.work.title === 'The Virtual Garden')).toBe(true);

  await page.getByRole('button', { name: 'Library', exact: true }).click();
  const goodreadsCsv = [
    'Book Id,Title,Author,Additional Authors,ISBN,ISBN13,My Rating,My Review,Date Read,Date Added,Bookshelves,Exclusive Shelf',
    '424242,Acceptance Import,Zoë Author,,="0306406152",="9780306406157",5,"First line — café.',
    'Second line: 東京 and emoji 🌙.",08/12/2026,2026/08/01,"favorites, autumn",read',
  ].join('\n');
  const importPayloads: Array<{ rows?: unknown[] }> = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/imports')) {
      importPayloads.push(request.postDataJSON() as { rows?: unknown[] });
    }
  });

  const loadGoodreadsCsv = async () => {
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'acceptance-goodreads.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(goodreadsCsv),
    });
    await expect(page.getByText('1 rows from acceptance-goodreads.csv')).toBeVisible();
    await page.getByRole('button', { name: 'Import confirmed books' }).click();
  };

  await loadGoodreadsCsv();
  await expect(page.getByRole('heading', { name: '1 book added' })).toBeVisible();
  expect(importPayloads[0]?.rows).toHaveLength(0);
  expect(importPayloads[1]?.rows).toHaveLength(1);
  const importedLibraryResponse = await page.request.get(`${BASE_URL}/api/library`);
  const importedLibrary = await importedLibraryResponse.json() as {
    books: Array<{ work: { title: string }; review: { body: string } }>;
  };
  expect(importedLibrary.books.find((book) => book.work.title === 'Acceptance Import')?.review.body)
    .toBe('First line — café.\nSecond line: 東京 and emoji 🌙.');
  await page.getByRole('button', { name: 'Undo this import' }).click();
  await expect(page.getByRole('heading', { name: 'Import undone' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to my library' }).click();
  await expect(page.getByRole('button', { name: /Acceptance Import Zoë Author/i })).toHaveCount(0);

  await loadGoodreadsCsv();
  await expect(page.getByRole('heading', { name: '1 book added' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to my library' }).click();
  await loadGoodreadsCsv();
  await expect(page.getByRole('heading', { name: '0 books added' })).toBeVisible();
  await expect(page.getByText('1 unchanged · 0 protected conflicts · 0 skipped')).toBeVisible();
  await page.getByRole('button', { name: 'Back to my library' }).click();

  await page.getByRole('button', { name: 'Settings and about' }).click();
  await primaryAuthenticator.cdp.send('WebAuthn.setAutomaticPresenceSimulation', {
    authenticatorId: primaryAuthenticator.authenticatorId,
    enabled: false,
  });
  const backupAuthenticator = await addVirtualAuthenticator(context, page, 'usb');
  await page.getByRole('button', { name: 'Add passkey' }).click();
  await expect(page.locator('.passkey-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Revoke Backup passkey' }).click();
  await expect(page.locator('.passkey-row')).toHaveCount(1);
  await backupAuthenticator.cdp.send('WebAuthn.setAutomaticPresenceSimulation', {
    authenticatorId: backupAuthenticator.authenticatorId,
    enabled: false,
  });
  await primaryAuthenticator.cdp.send('WebAuthn.setAutomaticPresenceSimulation', {
    authenticatorId: primaryAuthenticator.authenticatorId,
    enabled: true,
  });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByText('You’re exploring the demo shelf.')).toBeVisible();

  await primaryAuthenticator.cdp.send('WebAuthn.setAutomaticPresenceSimulation', {
    authenticatorId: primaryAuthenticator.authenticatorId,
    enabled: false,
  });
  await page.getByRole('button', { name: 'Unlock with passkey' }).first().click();
  await expect(page.getByLabel('Saved passkey')).toHaveAttribute('autocomplete', 'username webauthn');
  await page.getByRole('button', { name: 'Continue with a passkey' }).click();
  await primaryAuthenticator.cdp.send('WebAuthn.setAutomaticPresenceSimulation', {
    authenticatorId: primaryAuthenticator.authenticatorId,
    enabled: true,
  });
  await expect(page.getByText('Virtual Reader’s library')).toBeVisible();
  await page.getByRole('button', { name: 'Settings and about' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByText('You’re exploring the demo shelf.')).toBeVisible();

  await primaryAuthenticator.cdp.send('WebAuthn.removeVirtualAuthenticator', {
    authenticatorId: primaryAuthenticator.authenticatorId,
  });
  await backupAuthenticator.cdp.send('WebAuthn.removeVirtualAuthenticator', {
    authenticatorId: backupAuthenticator.authenticatorId,
  });
  await addVirtualAuthenticator(context, page);

  await page.getByRole('button', { name: 'Unlock with passkey' }).first().click();
  await page.getByRole('tab', { name: 'Recover' }).click();
  await page.getByLabel('Recovery key').fill(recoveryKey);
  await page.getByRole('button', { name: 'Enroll replacement passkey' }).click();
  await expect(page.getByRole('heading', { name: 'Save your recovery key' })).toBeVisible();
  const replacementKey = (await page.locator('.recovery-key').textContent())?.trim() ?? '';
  expect(replacementKey).toMatch(/^MBN1\./);
  expect(replacementKey).not.toBe(recoveryKey);
  await page.getByLabel('I saved this key somewhere private.').check();
  await page.getByRole('button', { name: 'Continue to my library' }).click();
  await expect(page.getByRole('button', { name: /The Virtual Garden Codex Reader/i })).toBeVisible();

  const reusedRecovery = await page.request.post(`${BASE_URL}/api/passkeys/recover/options`, {
    headers: { Origin: BASE_URL },
    data: { recoveryKey },
  });
  expect(reusedRecovery.status()).toBe(400);
  expect((await reusedRecovery.json()).code).toBe('RECOVERY_INVALID');

  const deleted = await page.request.delete(`${BASE_URL}/api/account`, { headers: { Origin: BASE_URL } });
  expect(deleted.ok()).toBe(true);
  const session = await page.request.get(`${BASE_URL}/api/session`);
  expect(await session.json()).toEqual({ authenticated: false });
});
