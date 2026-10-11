import {createClient, FunctionsHttpError, type SupabaseClient} from '@supabase/supabase-js';
import {LIMITS} from '../limits.ts';
import {SUPABASE_KEY, SUPABASE_URL, syncConfigured} from './config.ts';
import {PermanentError, type SyncBackend} from './engine.ts';

let client: SupabaseClient | null = null;
/** The one Supabase client, or null when no project is configured. */
export function supabase(): SupabaseClient | null {
  if (!syncConfigured) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    // Implicit flow: the sign-in link returns in the URL hash, so it works from an email opened in any browser
    // and never touches the ?code= that Spotify's sign-in uses.
    auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit'},
  });
  return client;
}

function check<T>(result: {data: T; error: {message: string} | null}): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
function dataUrlToBlob(data: string): Blob {
  const [head, body] = data.split(',', 2);
  const type = /^data:([^;,]+)/.exec(head)?.[1] ?? 'application/octet-stream';
  const bytes = head.includes(';base64')
    ? Uint8Array.from(atob(body), c => c.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(body));
  return new Blob([bytes], {type});
}
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
};

export function supabaseBackend(sb: SupabaseClient): SyncBackend {
  const uid = async () => {
    // getSession reads the saved sign-in without a network call, so this also works offline.
    const {data} = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('Signed out');
    return id;
  };
  return {
    async userId() {
      const {data} = await sb.auth.getSession();
      return data.session?.user.id ?? null;
    },
    async room() {
      const owner = await uid();
      const room = check(await sb.from('rooms').select('revision').eq('owner_id', owner).single()) as {
        revision: number;
      };
      const [books, photos] = await Promise.all([
        sb.from('books').select('id', {count: 'exact', head: true}).eq('owner_id', owner),
        sb.from('photos').select('id', {count: 'exact', head: true}).eq('owner_id', owner),
      ]);
      if (books.error || photos.error) throw new Error((books.error ?? photos.error)!.message);
      return {revision: room.revision, hasContent: room.revision > 0 || !!books.count || !!photos.count};
    },
    async saveRoom(room, expected) {
      return check(
        await sb.rpc('save_room', {
          p_theme: room.theme,
          p_settings: room.settings,
          p_private: room.private,
          p_expected: expected,
        }),
      ) as number | null;
    },
    async saveBook(id, book) {
      check(
        await sb.rpc('save_book', {
          p_id: id,
          p_title: book.title,
          p_subtitle: book.subtitle,
          p_visibility: book.visibility,
          p_cover: book.cover,
          p_pages: book.pages,
        }),
      );
    },
    async trashBook(id) {
      check(await sb.from('books').update({deleted_at: new Date().toISOString()}).eq('id', id));
    },
    async uploadPhoto(key, data) {
      const blob = dataUrlToBlob(data);
      const ext = EXT[blob.type];
      if (!ext) throw new PermanentError('A photo is in a format the server does not accept.');
      if (blob.size > LIMITS.uploadBytes) throw new PermanentError('A photo is larger than 25 MB.');
      const path = `${await uid()}/${key.replace(/^keepsake-asset:/, '')}.${ext}`;
      const up = await sb.storage.from('uploads').upload(path, blob, {contentType: blob.type, upsert: false});
      // Already there from an earlier attempt that did not finish: process that copy.
      if (up.error && !/exists|duplicate/i.test(up.error.message)) throw new Error(up.error.message);
      const res = await sb.functions.invoke<{id: string}>('moderate-photo', {body: {path}});
      if (res.error) {
        const status = res.error instanceof FunctionsHttpError ? (res.error.context as Response).status : 0;
        if (status === 422 || status === 400)
          throw new PermanentError('A photo was not accepted for backup.');
        throw new Error(res.error.message);
      }
      return res.data!.id;
    },
    async trashPhoto(id) {
      check(await sb.from('photos').update({deleted_at: new Date().toISOString()}).eq('id', id));
    },
  };
}
