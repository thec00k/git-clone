import type {AppState} from '../../types/app';
import {assetKey, readAsset} from '../storage.ts';
import {syncConfigured} from './config.ts';
import {flush, link, record, type Local} from './engine.ts';

// The Supabase library loads only when a project is configured, so the local-only app stays as small as before.
const api = () => (syncConfigured ? import('./supabaseBackend.ts') : null);
async function connection() {
  const mod = await api();
  const sb = mod?.supabase();
  return mod && sb ? {sb, backend: mod.supabaseBackend(sb)} : null;
}

/**
 * Wires the sync engine to the app: sign-in state, saves, and coming back online.
 * Everything is a no-op when no Supabase project is configured (see config.ts).
 */
const local: Local = {keyOf: assetKey, readFile: readAsset};
let active = false;
let latest: AppState | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export type Account =
  | {state: 'off'}
  | {state: 'signed-out'}
  | {state: 'needs-profile'; email: string}
  | {state: 'signed-in'; email: string; username: string};
let account: Account = {state: syncConfigured ? 'signed-out' : 'off'};
const listeners = new Set<() => void>();
export const getAccount = () => account;
export const onAccountChange = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));
function setAccount(next: Account) {
  account = next;
  listeners.forEach(fn => fn());
}

async function refresh() {
  const c = await connection();
  if (!c) return;
  const {sb, backend} = c;
  const {data} = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user) {
    active = false;
    return setAccount({state: 'signed-out'});
  }
  const email = user.email ?? '';
  const {data: profile, error} = await sb.from('profiles').select('username').eq('id', user.id).maybeSingle();
  if (error) {
    // Offline with a saved sign-in: keep sending queued changes once the connection returns.
    if (account.state !== 'signed-in') setAccount({state: 'signed-in', email, username: ''});
  } else if (!profile) {
    active = false;
    return setAccount({state: 'needs-profile', email});
  } else setAccount({state: 'signed-in', email, username: profile.username});
  await link(backend);
  active = true;
  if (latest) await record(latest, local);
  await flush(backend, local);
}

/** Call once at start-up. */
export function startSync() {
  if (!syncConfigured) return;
  void connection().then(c => {
    if (!c) return;
    c.sb.auth.onAuthStateChange(() => {
      // Supabase asks for no awaiting inside this callback.
      setTimeout(() => void refresh().catch(() => {}), 0);
    });
    addEventListener('online', () => void sendNow());
    setInterval(() => void sendNow(), 60_000);
    void refresh().catch(() => {});
  });
}

/** Call after the room was saved on this device. Waits a moment so a burst of edits is sent together. */
export function syncAfterSave(state: AppState) {
  latest = state;
  if (!active) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const state = latest;
    if (!state) return;
    void record(state, local)
      .then(sendNow)
      .catch(() => {});
  }, 3_000);
}

export async function sendNow() {
  if (!active || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  const c = await connection();
  if (c) await flush(c.backend, local).catch(() => {});
}

export async function sendSignInLink(email: string) {
  const sb = (await connection())?.sb;
  if (!sb) throw new Error('Backup is not set up on this site yet.');
  const {error} = await sb.auth.signInWithOtp({
    email,
    options: {emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true},
  });
  if (error) throw new Error(error.message);
}

export async function completeSignup(username: string, displayName: string, bornOn: string) {
  const sb = (await connection())?.sb;
  if (!sb) return;
  const {error} = await sb.rpc('complete_signup', {
    p_username: username,
    p_display_name: displayName,
    p_born_on: bornOn,
  });
  if (error) throw new Error(error.message);
  await refresh();
}

/** Signs out on this device only. The room stays here, and so does anything still waiting to be sent. */
export async function signOut() {
  const sb = (await connection())?.sb;
  if (!sb) return;
  active = false;
  await sb.auth.signOut({scope: 'local'});
  setAccount({state: 'signed-out'});
}
