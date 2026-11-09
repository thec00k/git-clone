-- Tests for the follow-up hardening (migration 20261109000001_security_hardening.sql).
\set QUIET on
create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  perform set_config('role', case when uid is null then 'postgres' else 'authenticated' end, false);
end $$;
create or replace function pg_temp.expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then
    if position(lower(needle) in lower(sqlerrm)) = 0 then raise exception 'expected error containing "%", got "%"', needle, sqlerrm; end if;
    return;
  end;
  raise exception 'expected an error containing "%" from: %', needle, sql;
end $$;
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FAILED: %', what; end if; end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- One person: rua.
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c1');
\set rua '\'00000000-0000-0000-0000-0000000000c1\''
select pg_temp.act_as(:rua); select complete_signup('rua', 'Rua', (current_date - interval '30 years')::date);

-- Page paper and photo layout have a size cap.
select pg_temp.act_as(:rua);
select save_book('30000000-0000-0000-0000-000000000001', 'Ok', '', 'private', '{}', '[{"paper": {"material": "cream"}}]');
select pg_temp.expect_error($$select save_book('30000000-0000-0000-0000-000000000001', 'Big', '', 'private', '{}',
  jsonb_build_array(jsonb_build_object('paper', jsonb_build_object('x', repeat('a', 40000)))))$$, 'pages_paper_size');

-- Reports cannot be backdated or filed as already resolved.
select pg_temp.expect_error($$insert into reports (reporter, target_type, target_id, reason, created_at) values (auth.uid(), 'room', auth.uid(), 'spam', now() - interval '1 year')$$, 'permission denied');
insert into reports (reporter, target_type, target_id, reason) values (auth.uid(), 'room', auth.uid(), 'spam');
select pg_temp.ok((select created_at > now() - interval '1 minute' from reports where reporter = auth.uid()), 'report dated by the server');

-- At most 50 raw uploads waiting per person.
insert into storage.objects (bucket_id, name) select 'uploads', :rua || '/f' || g || '.jpg' from generate_series(1, 50) g;
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('uploads', '00000000-0000-0000-0000-0000000000c1/f51.jpg')$$, 'row-level security');

-- Purge helpers are for the service role only.
select pg_temp.expect_error($$select * from stale_uploads()$$, 'permission denied');
select pg_temp.expect_error($$select * from purgeable_photo_files()$$, 'permission denied');
select pg_temp.act_as(null);
update storage.objects set created_at = now() - interval '2 days' where name = :rua || '/f1.jpg';
select pg_temp.ok((select count(*) from stale_uploads()) = 1, 'only uploads older than a day are stale');
\echo hardening tests passed
