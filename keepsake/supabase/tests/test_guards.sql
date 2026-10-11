-- Structural guards: every table has row level security, and signed-out users can run none of our functions.
do $$ declare t record; begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity loop
    raise exception 'table public.% has row level security off', t.relname;
  end loop;
end $$;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    raise exception 'anon can execute %', f.sig;
  end loop;
end $$;
-- Every SECURITY DEFINER function pins its search_path (prevents search-path hijacking).
do $$ declare f record; begin
  for f in select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%') loop
    raise exception 'security definer function % has no fixed search_path', f.proname;
  end loop;
end $$;
-- Signed-out visitors hold no privilege on any of our tables (Supabase grants new tables to anon by default).
do $$ declare t record; begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r'
             and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('anon', c.oid, 'insert')
               or has_table_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'delete')) loop
    raise exception 'anon has access to table public.%', t.relname;
  end loop;
end $$;
-- Signed-in people can call only the functions meant for them.
do $$ declare f record; begin
  for f in select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
             and p.proname not in ('is_blocked', 'are_friends', 'can_view_room', 'can_view_book', 'can_view_photo',
               'complete_signup', 'find_profile', 'claim_daily_stamps', 'buy_item', 'save_room', 'save_book') loop
    raise exception 'signed-in people can execute %', f.proname;
  end loop;
end $$;
\echo guard tests passed
