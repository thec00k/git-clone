-- Supabase grants EXECUTE on every new function to the signed-in role by default, so revoking from public and
-- anon (earlier migrations) is not enough. Signed-in people may call only the functions listed here; helpers
-- such as is_teen and stamp_balance would otherwise answer questions about other people.
-- Found by the Supabase security advisor on the first deployed project (October 11, 2026).
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
grant execute on function
  public.is_blocked(uuid, uuid), public.are_friends(uuid, uuid), public.can_view_room(uuid),
  public.can_view_book(uuid), public.can_view_photo(uuid),
  public.complete_signup(text, text, date), public.find_profile(text),
  public.claim_daily_stamps(text), public.buy_item(text),
  public.save_room(text, jsonb, jsonb, bigint),
  public.save_book(uuid, text, text, public.book_visibility, jsonb, jsonb)
  to authenticated;
alter function public.touch_updated_at() set search_path = public;
-- Functions added later must be revoked the same way; the guard test checks the list.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
