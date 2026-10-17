// Supabase Edge Function (Deno): processes one raw upload. NOT DEPLOYED AND NOT YET RUN: vendor calls are
// placeholders until a moderation provider and hash-matching service are chosen (docs/safety-model.md).
// Trigger: a Storage webhook on inserts into the 'uploads' bucket, or a call from the client after upload.
//
// Steps: check limits -> decode -> resize to max 2048 px and re-encode as WebP (re-encoding drops all EXIF,
// GPS and other metadata) -> hash-match and classify -> store the processed copy in 'photos' ->
// insert the photos row with the moderation state -> delete the raw upload.
import {createClient} from 'npm:@supabase/supabase-js@2';
import {checkUpload, decide, type Signals} from '../_shared/moderation.ts';

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

async function toWebp(_raw: Uint8Array): Promise<{webp: Uint8Array; width: number; height: number}> {
  // TODO: decode and resize (e.g. imagescript or a WASM build of libvips/sharp), longest edge 2048 px.
  throw new Error('image processing not implemented yet');
}

Deno.serve(async req => {
  const {path, owner} = (await req.json()) as {path: string; owner: string};
  if (!path.startsWith(owner + '/')) return new Response('bad path', {status: 400});
  const {data: file, error} = await admin.storage.from('uploads').download(path);
  if (error || !file) return new Response('missing upload', {status: 404});
  const {count} = await admin
    .from('photos')
    .select('id', {count: 'exact', head: true})
    .eq('owner_id', owner)
    .is('deleted_at', null);
  const problem = checkUpload({bytes: file.size, type: file.type}, count ?? 0);
  if (problem) {
    await admin.storage.from('uploads').remove([path]);
    return Response.json({error: problem}, {status: 422});
  }

  const {webp, width, height} = await toWebp(new Uint8Array(await file.arrayBuffer()));
  const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', webp))]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
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
  return Response.json({id, state: decision.state});
});
