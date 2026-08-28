'use client';

import { useEffect, useState } from 'react';
import { Copy, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ApiClientError, api, authenticateWithPasskey, recoverWithKey, registerWithInvitation } from '@/lib/client/api';

type Mode = 'signin' | 'register' | 'recover';

export function AuthDialog({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: () => Promise<void> | void }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [savedRecovery, setSavedRecovery] = useState(false);
  const [inviteToken, setInviteToken] = useState('');

  useEffect(() => {
    if (mode !== 'signin' || recoveryKey) return;
    let active = true;
    void (async () => {
      try {
        const available = typeof PublicKeyCredential !== 'undefined'
          && typeof PublicKeyCredential.isConditionalMediationAvailable === 'function'
          && await PublicKeyCredential.isConditionalMediationAvailable();
        if (!available || !active) return;
        await authenticateWithPasskey(true);
        if (active) await onAuthenticated();
      } catch (caught) {
        if (caught instanceof DOMException && ['AbortError', 'NotAllowedError'].includes(caught.name)) return;
      }
    })();
    return () => { active = false; };
  }, [mode, onAuthenticated, recoveryKey]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (caught) {
      if (caught instanceof DOMException && ['AbortError', 'NotAllowedError'].includes(caught.name)) {
        setError('The passkey prompt was closed. You can try again whenever you are ready.');
      } else {
        setError(caught instanceof ApiClientError || caught instanceof Error ? caught.message : 'Passkey request failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (recoveryKey) {
    return (
      <Dialog title="Save your recovery key" eyebrow="One-time display" onClose={() => undefined}>
        <div className="recovery-callout">
          <ShieldCheck aria-hidden="true" />
          <p>This key is shown once. It is the only way to replace every passkey if you lose access to them.</p>
        </div>
        <code className="recovery-key">{recoveryKey}</code>
        <button className="secondary-action full-action" type="button" onClick={() => void navigator.clipboard.writeText(recoveryKey)}>
          <Copy aria-hidden="true" /> Copy recovery key
        </button>
        <label className="check-row">
          <input type="checkbox" checked={savedRecovery} onChange={(event) => setSavedRecovery(event.target.checked)} />
          <span>I saved this key somewhere private.</span>
        </label>
        <button
          className="primary-action full-action"
          type="button"
          disabled={!savedRecovery}
          onClick={() => { setRecoveryKey(''); void onAuthenticated(); }}
        >
          Continue to my library
        </button>
      </Dialog>
    );
  }

  return (
    <Dialog title={mode === 'signin' ? 'Unlock your nook' : mode === 'register' ? 'Create your nook' : 'Recover your nook'} eyebrow="Private beta" onClose={onClose}>
      <div className="auth-tabs" role="tablist" aria-label="Account options">
        {([['signin', 'Sign in'], ['register', 'Use invitation'], ['recover', 'Recover']] as const).map(([value, label]) => (
          <button
            type="button"
            role="tab"
            aria-selected={mode === value}
            className={mode === value ? 'active' : ''}
            key={value}
            onClick={() => { setMode(value); setError(''); }}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'signin' && (
        <div className="auth-form">
          <div className="auth-illustration"><KeyRound aria-hidden="true" /></div>
          <p className="dialog-lead">Use the passkey already saved in iCloud Keychain, your browser, or a hardware security key.</p>
          <label>
            <span>Saved passkey</span>
            <input autoComplete="username webauthn" inputMode="text" placeholder="Choose a passkey from autofill" />
          </label>
          <button className="primary-action full-action" disabled={busy} type="button" onClick={() => void run(async () => { await authenticateWithPasskey(); await onAuthenticated(); })}>
            <KeyRound aria-hidden="true" /> {busy ? 'Waiting for passkey…' : 'Continue with a passkey'}
          </button>
        </div>
      )}

      {mode === 'register' && (
        <form className="auth-form" onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void run(async () => {
            const result = await registerWithInvitation({
              inviteToken: String(data.get('inviteToken') || '').trim(),
              displayName: String(data.get('displayName') || '').trim() || 'Reader',
              passkeyName: 'Primary passkey',
            });
            setRecoveryKey(result.recoveryKey);
          });
        }}>
          <p className="dialog-lead">Registration is invitation-only. No email address, password, Google account, or Apple account is used.</p>
          <label><span>Your name</span><input name="displayName" maxLength={80} placeholder="How your nook should greet you" /></label>
          <label><span>Invitation</span><textarea name="inviteToken" required rows={3} spellCheck={false} value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} placeholder="Paste your private invitation" /></label>
          <details className="owner-setup">
            <summary>Site owner setup</summary>
            <p>The allowlisted Site owner can generate the first invitation here. Other visitors cannot issue invitations.</p>
            <button className="secondary-action full-action" disabled={busy} type="button" onClick={() => void run(async () => {
              const result = await api.createInvite('Initial owner registration');
              setInviteToken(result.inviteToken);
            })}><ShieldCheck aria-hidden="true" />Generate my owner invitation</button>
          </details>
          <button className="primary-action full-action" disabled={busy} type="submit"><Sparkles aria-hidden="true" /> {busy ? 'Creating passkey…' : 'Create my passkey'}</button>
        </form>
      )}

      {mode === 'recover' && (
        <form className="auth-form" onSubmit={(event) => {
          event.preventDefault();
          const key = String(new FormData(event.currentTarget).get('recoveryKey') || '').trim();
          void run(async () => {
            const result = await recoverWithKey(key);
            setRecoveryKey(result.recoveryKey);
          });
        }}>
          <p className="dialog-lead">Your recovery key can only enroll a replacement passkey. After use, it is replaced with a new one.</p>
          <label><span>Recovery key</span><textarea name="recoveryKey" required rows={3} spellCheck={false} placeholder="MBN1.…" /></label>
          <button className="primary-action full-action" disabled={busy} type="submit"><ShieldCheck aria-hidden="true" /> {busy ? 'Checking key…' : 'Enroll replacement passkey'}</button>
        </form>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="auth-footnote">Lose every passkey and the recovery key, and the account cannot be recovered.</p>
    </Dialog>
  );
}
