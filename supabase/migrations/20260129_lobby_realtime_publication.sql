begin;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
    ) then
      execute 'alter publication supabase_realtime add table public.matches';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_players'
    ) then
      execute 'alter publication supabase_realtime add table public.match_players';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_invites'
    ) then
      execute 'alter publication supabase_realtime add table public.match_invites';
    end if;
  end if;
end $$;

commit;
