'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  Download,
  Info,
  KeyRound,
  LogOut,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { addPasskey, api, authenticateWithPasskey, enrichLibraryMetadata, type SessionState } from '@/lib/client/api';
import { makeLocalMigrationPayload, markLocalMigrationConfirmed, readLegacyBooks } from '@/lib/migration/local';
import { APP_VERSION } from '@/lib/version';

type Passkey = {
  id: string;
  name: string;
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

export function SettingsDialog({
  session,
  onClose,
  onAuth,
  onSessionChanged,
  onLibraryChanged,
}: {
  session: SessionState;
  onClose: () => void;
  onAuth: () => void;
  onSessionChanged: () => Promise<void>;
  onLibraryChanged: () => Promise<void>;
}) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [invite, setInvite] = useState<{ token: string; expiresAt: string } | null>(null);
  const [inviteName, setInviteName] = useState('');
  const legacyCount = typeof window === 'undefined' ? 0 : readLegacyBooks().length;

  useEffect(() => {
    if (!session.authenticated) return;
    let active = true;
    void api.passkeys().then((result) => active && setPasskeys(result.passkeys)).catch(() => undefined);
    return () => { active = false; };
  }, [session]);

  const run = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That request could not be completed.');
    } finally {
      setBusy('');
    }
  };

  const refreshPasskeys = async () => {
    const result = await api.passkeys();
    setPasskeys(result.passkeys);
  };

  return (
    <Dialog title="Settings & about" eyebrow="My Book Nook" onClose={onClose} wide>
      <div className="settings-layout">
        <section className="settings-main">
          <div className="settings-card account-card">
            <div className="settings-card-heading"><UserRound aria-hidden="true" /><div><h3>{session.authenticated ? session.user.displayName : 'Demo shelf'}</h3><p>{session.authenticated ? 'Private, passkey-protected library' : 'Changes are not saved in demo mode.'}</p></div></div>
            {session.authenticated ? (
              <button className="secondary-action" type="button" disabled={busy === 'signout'} onClick={() => void run('signout', async () => { await api.signOut(); await onSessionChanged(); onClose(); })}><LogOut aria-hidden="true" />Sign out</button>
            ) : (
              <button className="primary-action" type="button" onClick={onAuth}><KeyRound aria-hidden="true" />Unlock with a passkey</button>
            )}
          </div>

          {session.authenticated && (
            <>
              <section className="settings-section" aria-labelledby="passkeys-title">
                <div className="section-inline-heading"><div><span className="eyebrow">Security</span><h3 id="passkeys-title">Your passkeys</h3></div><button className="secondary-action" type="button" disabled={busy === 'add'} onClick={() => void run('add', async () => { await addPasskey(); await refreshPasskeys(); setMessage('Backup passkey added.'); })}><Plus aria-hidden="true" />Add passkey</button></div>
                <p className="settings-explainer">Keep at least two passkeys on different devices. Every ceremony requires your device biometric or PIN.</p>
                <div className="passkey-list">
                  {passkeys.map((passkey) => (
                    <div className="passkey-row" key={passkey.id}>
                      <span className="passkey-icon"><KeyRound aria-hidden="true" /></span>
                      <span><strong>{passkey.name}</strong><small>{passkey.backedUp ? 'Synced passkey' : passkey.deviceType} · added {formatDate(passkey.createdAt)}</small></span>
                      <button className="icon-control" type="button" disabled={passkeys.length <= 1 || busy === passkey.id} aria-label={`Revoke ${passkey.name}`} title={passkeys.length <= 1 ? 'Add another passkey before revoking this one' : 'Revoke passkey'} onClick={() => void run(passkey.id, async () => { await api.revokePasskey(passkey.id); await refreshPasskeys(); setMessage('Passkey revoked.'); })}><Trash2 aria-hidden="true" /></button>
                    </div>
                  ))}
                </div>
                <div className="settings-button-row">
                  <button className="secondary-action" type="button" disabled={busy === 'verify'} onClick={() => void run('verify', async () => { await authenticateWithPasskey(); setMessage('Passkey verified. Sensitive actions are unlocked for 10 minutes.'); })}><ShieldCheck aria-hidden="true" />Verify passkey now</button>
                  <button className="secondary-action" type="button" disabled={busy === 'rotate'} onClick={() => void run('rotate', async () => { const result = await api.rotateRecovery(); setRecoveryKey(result.recoveryKey); })}><RefreshCcw aria-hidden="true" />Rotate recovery key</button>
                </div>
              </section>

              {legacyCount > 0 && (
                <section className="settings-section legacy-migration" aria-labelledby="migration-title">
                  <div className="settings-card-heading"><Download aria-hidden="true" /><div><h3 id="migration-title">Move this device’s library</h3><p>{legacyCount} genuine local book{legacyCount === 1 ? '' : 's'} found. Demo titles are excluded, and the local copy stays untouched.</p></div></div>
                  <button className="primary-action" type="button" disabled={busy === 'migrate'} onClick={() => void run('migrate', async () => { const payload = await makeLocalMigrationPayload(); if (!payload) throw new Error('No local books are ready to migrate.'); const receipt = await api.migrateLocal(payload); markLocalMigrationConfirmed(receipt); await onLibraryChanged(); setMessage(`${receipt.imported} local book${receipt.imported === 1 ? '' : 's'} confirmed in your account.`); })}><Download aria-hidden="true" />Migrate local books</button>
                </section>
              )}

              <section className="settings-section" aria-labelledby="book-details-title">
                <span className="eyebrow">Library maintenance</span>
                <h3 id="book-details-title">Covers & book details</h3>
                <p className="settings-explainer">Find missing covers, publication details, subjects, and Open Library identifiers for Goodreads books with an ISBN. Existing information and your edits stay untouched.</p>
                <button className="secondary-action" type="button" disabled={busy === 'enrich'} onClick={() => void run('enrich', async () => {
                  const result = await enrichLibraryMetadata();
                  await onLibraryChanged();
                  if (result.updated) setMessage(`Added covers and details to ${result.updated} book${result.updated === 1 ? '' : 's'}.${result.complete ? '' : ' Run it again to continue.'}`);
                  else setMessage(result.processed ? 'No new Open Library matches were found.' : 'Your ISBN-matched Goodreads books already have details.');
                })}><RefreshCcw aria-hidden="true" />{busy === 'enrich' ? 'Finding details…' : 'Find missing details'}</button>
              </section>

              <section className="settings-section invitation-section" aria-labelledby="invite-title">
                <span className="eyebrow">Owner tools</span>
                <h3 id="invite-title">Private-beta invitation</h3>
                <p className="settings-explainer">Only an allowlisted Site owner can issue a signed, single-use invitation. It expires automatically.</p>
                <div className="inline-form"><label><span>Reader name <small>optional</small></span><input value={inviteName} maxLength={80} onChange={(event) => setInviteName(event.target.value)} /></label><button className="secondary-action" type="button" disabled={busy === 'invite'} onClick={() => void run('invite', async () => { const result = await api.createInvite(inviteName || undefined); setInvite({ token: result.inviteToken, expiresAt: result.expiresAt }); })}><Plus aria-hidden="true" />Create invite</button></div>
                {invite && <div className="secret-output"><code>{invite.token}</code><button className="secondary-action" type="button" onClick={() => void navigator.clipboard.writeText(invite.token)}><Copy aria-hidden="true" />Copy</button><small>Expires {formatDateTime(invite.expiresAt)}. This token is shown only here.</small></div>}
              </section>

              <section className="settings-section danger-zone" aria-labelledby="danger-title">
                <h3 id="danger-title">Delete account</h3>
                <p>Permanently removes the account, its books, reviews, passkeys, sessions, and import history.</p>
                <button className="danger-action" type="button" disabled={busy === 'delete'} onClick={() => void run('delete', async () => { if (!window.confirm('Permanently delete this My Book Nook account and every saved book? This cannot be undone.')) return; await api.deleteAccount(); await onSessionChanged(); onClose(); })}><Trash2 aria-hidden="true" />Delete my account</button>
              </section>
            </>
          )}
        </section>

        <aside className="about-panel">
          <span className="about-mark"><BookOpen aria-hidden="true" /></span>
          <span className="eyebrow">About</span>
          <h3>My Book Nook</h3>
          <p>A private place to remember not just what you read, but what it felt like.</p>
          <dl><div><dt>Version</dt><dd>{APP_VERSION}</dd></div><div><dt>Data</dt><dd>Cloudflare D1</dd></div><div><dt>Sign-in</dt><dd>Passkeys only</dd></div><div><dt>Fonts</dt><dd>36 self-hosted families</dd></div></dl>
          <div className="about-note"><Info aria-hidden="true" /><span>The Sites deployment revision is separate from this product version.</span></div>
        </aside>
      </div>

      {recoveryKey && (
        <div className="one-time-secret" role="alertdialog" aria-modal="true" aria-labelledby="new-recovery-title">
          <ShieldCheck aria-hidden="true" />
          <h3 id="new-recovery-title">Save the new recovery key</h3>
          <p>The previous key no longer works. This replacement is shown once.</p>
          <code>{recoveryKey}</code>
          <button className="secondary-action" type="button" onClick={() => void navigator.clipboard.writeText(recoveryKey)}><Copy aria-hidden="true" />Copy key</button>
          <button className="primary-action" type="button" onClick={() => setRecoveryKey('')}><Check aria-hidden="true" />I saved it</button>
        </div>
      )}
      {message && <p className="form-success" role="status"><Check aria-hidden="true" />{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </Dialog>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
