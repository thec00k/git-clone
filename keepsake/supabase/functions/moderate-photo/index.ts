// Supabase Edge Function (Deno): processes one raw upload. Vendor calls are placeholders until a moderation
// provider and hash-matching service are chosen (docs/safety-model.md), so every upload is held for review.
// Trigger: the app calls it after each upload (src/lib/sync/supabaseBackend.ts) with {path}.
//
// Steps: check limits -> decode -> resize to max 2048 px and re-encode as WebP (re-encoding drops all EXIF,
// GPS and other metadata) -> hash-match and classify -> store the processed copy in 'photos' ->
// insert the photos row with the moderation state -> delete the raw upload.
import {createClient} from 'npm:@supabase/supabase-js@2';
import * as magick from 'npm:@imagemagick/magick-wasm@0.0.44';
import {checkUpload, decide, type Signals} from '../_shared/moderation.ts';
import {magickLib, toWebp, UnsupportedImage} from '../_shared/processImage.ts';

// The edge runtime only runs WebAssembly image libraries (native ones fail to load and crash the function).
await magick.initializeImageMagick(
  await Deno.readFile(new URL('x86/magick.wasm', import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.44'))),
);
const images = magickLib(magick);

// The app calls this from the browser, so every answer carries CORS headers and the preflight is answered.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: BodyInit | null, status = 200) => new Response(body, {status, headers: cors});
const json = (value: unknown, status = 200) => Response.json(value, {status, headers: cors});

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function signalsFor(_webp: Uint8Array): Promise<Signals> {
  // TODO(vendor): call the hash-matching service and the image classifier here.
  // Until then everything is held for review rather than shown.
  return {
    csamHashMatch: false,
    nudity: 0,
    sexualMinor: 0,
    violence: 0,
    selfHarm: 0,
    classifierUnavailable: true,
  };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return reply(null);
  // The owner is whoever is signed in (from their access token), never a value the caller sends.
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const {data: auth} = await admin.auth.getUser(token);
  if (!auth?.user) return reply('sign in first', 401);
  const owner = auth.user.id;
  const {path} = (await req.json()) as {path: string};
  if (typeof path !== 'string' || !path.startsWith(owner + '/') || path.includes('..'))
    return reply('bad path', 400);
  const {data: file, error} = await admin.storage.from('uploads').download(path);
  if (error || !file) return reply('missing upload', 404);
  const {count} = await admin
    .from('photos')
    .select('id', {count: 'exact', head: true})
    .eq('owner_id', owner)
    .is('deleted_at', null);
  const problem = checkUpload({bytes: file.size, type: file.type}, count ?? 0);
  if (problem) {
    await admin.storage.from('uploads').remove([path]);
    return json({error: problem}, 422);
  }

  let processed;
  try {
    processed = await toWebp(new Uint8Array(await file.arrayBuffer()), images);
  } catch (e) {
    if (!(e instanceof UnsupportedImage)) throw e;
    await admin.storage.from('uploads').remove([path]);
    return json({error: e.message}, 422);
  }
  const {webp, width, height} = processed;
  const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', webp))]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  // The same picture uploaded twice (a retry, a second device, or added again) keeps its first copy.
  const {data: existing} = await admin
    .from('photos')
    .select('id, moderation')
    .eq('owner_id', owner)
    .eq('sha256', sha256)
    .maybeSingle();
  if (existing) {
    // Added again after being deleted: take it back out of the trash.
    await admin.from('photos').update({deleted_at: null}).eq('id', existing.id);
    await admin.storage.from('uploads').remove([path]);
    return json({id: existing.id, state: existing.moderation});
  }
  const decision = decide(await signalsFor(webp));
  const id = crypto.randomUUID(),
    storagePath = `${owner}/${id}.webp`;
  await admin.storage.from('photos').upload(storagePath, webp, {contentType: 'image/webp'});
  await admin.from('photos').insert({
    id,
    owner_id: owner,
    storage_path: storagePath,
    width,
    height,
    bytes: webp.length,
    sha256,
    // The app names each upload after its own key for the photo, so a new device can put it back in place.
    source_key: /^[0-9a-f]{64}$/.exec(path.split('/').pop()!.split('.')[0])?.[0] ?? null,
    moderation: decision.state,
  });
  await admin.from('moderation_log').insert({
    actor: 'pipeline',
    target_type: 'photo',
    target_id: id,
    action: decision.state,
    reason: 'reason' in decision ? decision.reason : null,
  });
  // TODO(legal): for 'removed' + 'ncmec-report', preserve the file and metadata as required and file the CyberTipline report.
  await admin.storage.from('uploads').remove([path]);
  return json({id, state: decision.state});
});
