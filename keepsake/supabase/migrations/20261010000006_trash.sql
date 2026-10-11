-- 30-day trash: items moved to the trash (deleted_at set) are removed for good after 30 days.
-- Schedule daily with pg_cron on Supabase: select cron.schedule('purge-trash', '17 3 * * *', 'select public.purge_trash()');
-- Storage files of purged photos are removed by the same job through the storage API (to add with the pipeline).
create function public.purge_trash() returns int language plpgsql security definer set search_path = public as $$
declare n int; m int;
begin
  delete from photos where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count;
  delete from books where deleted_at < now() - interval '30 days';
  get diagnostics m = row_count;
  delete from rate_events where at < now() - interval '2 days';
  return n + m;
end $$;
revoke all on function public.purge_trash() from public, anon, authenticated;
