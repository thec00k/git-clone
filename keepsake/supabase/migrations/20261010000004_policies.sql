-- Row level security policies and grants. Default is deny: a table with no matching policy returns nothing.
-- anon (signed out) gets no table access at all.

revoke all on all tables in schema public from anon, authenticated;
-- Revoke default execute on our own functions (not on extension functions such as citext's operators).
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    execute format('revoke all on function %s from public, anon', f.sig);
  end loop;
end $$;
grant usage on schema public to authenticated, service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Helpers callable from policies (they run as definer and only answer yes/no).
grant execute on function public.is_blocked(uuid, uuid), public.are_friends(uuid, uuid), public.can_view_room(uuid),
  public.can_view_book(uuid), public.can_view_photo(uuid) to authenticated;
-- is_teen, rate_limit and stamp_balance stay private: only triggers and definer functions call them.
grant execute on function public.complete_signup(text, text, date), public.find_profile(text),
  public.claim_daily_stamps(text), public.buy_item(text) to authenticated;

-- ---------------------------------------------------------------- profiles
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
-- You see yourself, your friends, people with a pending request involving you, and owners of rooms you can visit.
create policy profiles_read on public.profiles for select to authenticated using (
  id = auth.uid()
  or (not public.is_blocked(auth.uid(), id) and (
       public.are_friends(auth.uid(), id)
       or exists (select 1 from public.friendships f where f.user_low = least(auth.uid(), id) and f.user_high = greatest(auth.uid(), id))
       or public.can_view_room(id))));
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

grant select, update (monthly_email) on public.profile_private to authenticated;
create policy private_own on public.profile_private for select to authenticated using (id = auth.uid());
create policy private_update on public.profile_private for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------- rooms
grant select on public.rooms to authenticated;
grant update (theme, visibility, settings, revision) on public.rooms to authenticated;
create policy rooms_read on public.rooms for select to authenticated using (public.can_view_room(owner_id));
create policy rooms_update on public.rooms for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, insert, delete on public.room_invites to authenticated;
create policy invites_read on public.room_invites for select to authenticated using (owner_id = auth.uid() or guest_id = auth.uid());
-- Only friends can be invited.
create policy invites_insert on public.room_invites for insert to authenticated with check (
  owner_id = auth.uid() and public.are_friends(owner_id, guest_id));
create policy invites_delete on public.room_invites for delete to authenticated using (owner_id = auth.uid() or guest_id = auth.uid());

-- ---------------------------------------------------------------- photos
-- Rows are created by the upload pipeline (service role) after processing and moderation checks start.
grant select on public.photos to authenticated;
grant update (caption, deleted_at) on public.photos to authenticated;
create policy photos_read on public.photos for select to authenticated using (public.can_view_photo(id));
create policy photos_update on public.photos for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------- books and pages
grant select, insert, delete on public.books to authenticated;
grant update (title, subtitle, visibility, cover, deleted_at) on public.books to authenticated;
create policy books_read on public.books for select to authenticated using (public.can_view_book(id) or owner_id = auth.uid());
create policy books_insert on public.books for insert to authenticated with check (owner_id = auth.uid());
create policy books_update on public.books for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy books_delete on public.books for delete to authenticated using (owner_id = auth.uid());

grant select, insert, update, delete on public.pages to authenticated;
create policy pages_read on public.pages for select to authenticated using (public.can_view_book(book_id)
  or exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));
create policy pages_write on public.pages for all to authenticated
  using (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

grant select, insert, update, delete on public.page_photos to authenticated;
create policy page_photos_read on public.page_photos for select to authenticated using (
  exists (select 1 from public.pages p where p.id = page_id and (public.can_view_book(p.book_id)
    or exists (select 1 from public.books b where b.id = p.book_id and b.owner_id = auth.uid()))));
create policy page_photos_write on public.page_photos for all to authenticated
  using (exists (select 1 from public.pages p join public.books b on b.id = p.book_id where p.id = page_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.pages p join public.books b on b.id = p.book_id where p.id = page_id and b.owner_id = auth.uid()));

-- ---------------------------------------------------------------- pins
grant select, insert, update, delete on public.pins to authenticated;
create policy pins_read on public.pins for select to authenticated using (owner_id = auth.uid() or public.can_view_room(owner_id));
create policy pins_write on public.pins for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------- friends and blocks
grant select, insert, update (state), delete on public.friendships to authenticated;
create policy friends_read on public.friendships for select to authenticated using (auth.uid() in (user_low, user_high));
create policy friends_insert on public.friendships for insert to authenticated with check (auth.uid() in (user_low, user_high));
create policy friends_update on public.friendships for update to authenticated using (auth.uid() in (user_low, user_high)) with check (auth.uid() in (user_low, user_high));
create policy friends_delete on public.friendships for delete to authenticated using (auth.uid() in (user_low, user_high));

-- You see only the blocks you made. The blocked person cannot tell.
grant select, insert, delete on public.blocks to authenticated;
create policy blocks_own on public.blocks for all to authenticated using (blocker = auth.uid()) with check (blocker = auth.uid());

-- ---------------------------------------------------------------- guestbook
grant select, insert, delete on public.guestbook_notes to authenticated;
grant update (state) on public.guestbook_notes to authenticated;
-- Owner sees everything in their guestbook; authors see their own notes; visitors see notes the owner chose to show.
create policy notes_read on public.guestbook_notes for select to authenticated using (
  room_owner = auth.uid() or author = auth.uid()
  or (state = 'shown' and public.can_view_room(room_owner) and not public.is_blocked(auth.uid(), author)));
create policy notes_insert on public.guestbook_notes for insert to authenticated with check (author = auth.uid());
create policy notes_moderate on public.guestbook_notes for update to authenticated using (room_owner = auth.uid()) with check (room_owner = auth.uid());
create policy notes_delete on public.guestbook_notes for delete to authenticated using (room_owner = auth.uid() or author = auth.uid());

-- ---------------------------------------------------------------- tags
grant select, insert, delete on public.photo_tags to authenticated;
grant update (state) on public.photo_tags to authenticated;
create policy tags_read on public.photo_tags for select to authenticated using (tagged_user = auth.uid() or tagged_by = auth.uid()
  or (state = 'accepted' and public.can_view_photo(photo_id)));
create policy tags_insert on public.photo_tags for insert to authenticated with check (tagged_by = auth.uid());
create policy tags_answer on public.photo_tags for update to authenticated using (tagged_user = auth.uid()) with check (tagged_user = auth.uid());
create policy tags_delete on public.photo_tags for delete to authenticated using (tagged_user = auth.uid() or tagged_by = auth.uid());

-- ---------------------------------------------------------------- reports (write-only for people; moderators use the service role)
grant select, insert on public.reports to authenticated;
create policy reports_insert on public.reports for insert to authenticated with check (reporter = auth.uid() and state = 'open');
create policy reports_own on public.reports for select to authenticated using (reporter = auth.uid());

-- moderation_log, rate_events: service role only (no policies for authenticated).

-- ---------------------------------------------------------------- stamps
grant select on public.stamp_events, public.owned_items, public.shop_items to authenticated;
create policy stamps_own on public.stamp_events for select to authenticated using (user_id = auth.uid());
create policy owned_own on public.owned_items for select to authenticated using (user_id = auth.uid());
create policy shop_read on public.shop_items for select to authenticated using (active);
