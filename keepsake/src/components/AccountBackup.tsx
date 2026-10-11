import {useEffect, useState, useSyncExternalStore} from 'react';
import {useNav} from '../store/nav';
import {completeSignup, getAccount, onAccountChange, sendNow, sendSignInLink, signOut} from '../lib/sync';
import {onStatusChange, status as readStatus, type SyncStatus} from '../lib/sync/engine';

const PAUSED: Record<NonNullable<SyncStatus['paused']>, string> = {
  'server-has-room':
    'This account already holds a room from another device, so this room was not sent. It is still saved here.',
  'changed-elsewhere':
    'Your room was changed on another device. Backup is paused so neither copy is overwritten; this room is still saved here.',
  'other-account':
    'This device’s room is backed up to a different account. Sign in with that account to keep backing it up.',
};

function useSyncStatus() {
  const [s, setS] = useState<SyncStatus | null>(null);
  useEffect(() => {
    let live = true;
    const update = () =>
      void readStatus().then(
        next => live && setS(next),
        () => {},
      );
    update();
    const off = onStatusChange(update);
    return () => {
      live = false;
      off();
    };
  }, []);
  return s;
}

function when(ms?: number) {
  if (!ms) return '';
  const mins = Math.round((Date.now() - ms) / 60_000);
  return mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : new Date(ms).toLocaleString();
}

/** Sign in and back up the room to an account. Hidden unless the site has a Supabase project configured. */
export function AccountBackup() {
  const {isVisitor} = useNav();
  const account = useSyncExternalStore(onAccountChange, getAccount);
  const sync = useSyncStatus();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bornOn, setBornOn] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (isVisitor || account.state === 'off') return null;

  const act = async (fn: () => Promise<unknown>, done = '') => {
    setBusy(true);
    setMessage('');
    try {
      await fn();
      setMessage(done);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong. Your room here is unchanged.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="ks-backup">
      <summary>Back up to your account</summary>
      {account.state === 'signed-out' && (
        <form
          onSubmit={e => {
            e.preventDefault();
            void act(() => sendSignInLink(email.trim()), 'Check your email for a sign-in link.');
          }}
        >
          <p>Sign in to keep a copy of your room online and open it on another device.</p>
          <label className="block my-2">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              className="block w-full"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </label>
          <button className="ks-tool" disabled={busy}>
            Email me a sign-in link
          </button>
        </form>
      )}
      {account.state === 'needs-profile' && (
        <form
          onSubmit={e => {
            e.preventDefault();
            void act(() => completeSignup(username.trim(), displayName.trim(), bornOn));
          }}
        >
          <p>Signed in as {account.email}. One more step: choose how friends will find you.</p>
          <label className="block my-2">
            Username (letters, numbers and _ only)
            <input
              required
              pattern="[A-Za-z0-9_]{3,24}"
              className="block w-full"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </label>
          <label className="block my-2">
            Display name
            <input
              required
              maxLength={60}
              className="block w-full"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </label>
          <label className="block my-2">
            Birth date (kept private; Keepsake is for ages 13 and up)
            <input
              type="date"
              required
              className="block w-full"
              value={bornOn}
              onChange={e => setBornOn(e.target.value)}
            />
          </label>
          <button className="ks-tool" disabled={busy}>
            Create my account
          </button>
          <button type="button" className="ks-tool" onClick={() => void act(signOut)}>
            Sign out
          </button>
        </form>
      )}
      {account.state === 'signed-in' && (
        <>
          <p>Signed in{account.username ? ` as @${account.username}` : ''}.</p>
          <p role="status">
            {!sync
              ? 'Checking backup…'
              : sync.paused
                ? PAUSED[sync.paused]
                : !sync.linked
                  ? 'Getting ready to back up…'
                  : sync.pending
                    ? `${sync.pending} change${sync.pending === 1 ? '' : 's'} waiting to be backed up.${
                        sync.lastError ? ' Will retry when the connection is back.' : ''
                      }`
                    : `Backed up${sync.lastSyncedAt ? ` ${when(sync.lastSyncedAt)}` : ''}.`}
          </p>
          {!!sync?.problems.length && (
            <ul className="text-sm">
              {sync.problems.slice(-3).map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
          <button className="ks-tool" disabled={busy} onClick={() => void act(sendNow)}>
            Back up now
          </button>
          <button className="ks-tool" disabled={busy} onClick={() => void act(signOut)}>
            Sign out
          </button>
          <p className="text-sm">Signing out keeps your room on this device.</p>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
