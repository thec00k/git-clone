// Supabase Edge Function (Deno): the daily trash purge. Removes the Storage files of photos that have been in
// the trash for more than 30 days and raw uploads that were never processed (older than a day), then deletes
// the trashed rows (purge_trash). Storage files can only be deleted through the Storage API, which is why
// this is a function and not only SQL.
// Trigger: once a day from pg_cron (see docs/backend-design.md, "Trash purge"). Only the service role may call it.
import {createClient} from 'npm:@supabase/supabase-js@2';

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

async function removeAll(bucket: string, names: string[]) {
  for (let i = 0; i < names.length; i += 100) {
    const {error} = await admin.storage.from(bucket).remove(names.slice(i, i + 100));
    if (error) throw new Error(`${bucket}: ${error.message}`);
  }
}

Deno.serve(async req => {
  if (req.headers.get('Authorization') !== `Bearer ${serviceKey}`)
    return new Response('not allowed', {status: 401});
  const photos = await admin.rpc('purgeable_photo_files');
  if (photos.error) return new Response(photos.error.message, {status: 500});
  const uploads = await admin.rpc('stale_uploads');
  if (uploads.error) return new Response(uploads.error.message, {status: 500});
  // Files first: if removing them fails, the rows stay and the next run tries again.
  await removeAll('photos', photos.data as string[]);
  await removeAll('uploads', uploads.data as string[]);
  const purged = await admin.rpc('purge_trash');
  if (purged.error) return new Response(purged.error.message, {status: 500});
  return Response.json({
    rows: purged.data,
    photoFiles: (photos.data as string[]).length,
    uploads: (uploads.data as string[]).length,
  });
});
