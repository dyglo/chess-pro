begin;

do $$
declare
  r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'match_players' loop
    execute format('drop policy if exists %I on public.match_players', r.policyname);
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'matches' loop
    execute format('drop policy if exists %I on public.matches', r.policyname);
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'match_invites' loop
    execute format('drop policy if exists %I on public.match_invites', r.policyname);
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'notifications' loop
    execute format('drop policy if exists %I on public.notifications', r.policyname);
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'match_events' loop
    execute format('drop policy if exists %I on public.match_events', r.policyname);
  end loop;
end $$;

create policy match_players_select_own
on public.match_players
for select
using (user_id = auth.uid());

create policy matches_select_participant
on public.matches
for select
using (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or white_user_id = auth.uid()
    or black_user_id = auth.uid()
    or exists (
      select 1
      from public.match_players mp
      where mp.match_id = matches.id
        and mp.user_id = auth.uid()
    )
  )
);

create policy match_invites_select_participants
on public.match_invites
for select
using (to_user_id = auth.uid() or from_user_id = auth.uid());

create policy match_invites_insert_sender
on public.match_invites
for insert
with check (from_user_id = auth.uid());

create policy match_invites_update_participants
on public.match_invites
for update
using (to_user_id = auth.uid() or from_user_id = auth.uid())
with check (to_user_id = auth.uid() or from_user_id = auth.uid());

create policy notifications_select_own
on public.notifications
for select
using (user_id = auth.uid());

create policy notifications_update_own
on public.notifications
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy match_events_select_participant
on public.match_events
for select
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_events.match_id
      and (
        m.created_by = auth.uid()
        or m.white_user_id = auth.uid()
        or m.black_user_id = auth.uid()
        or exists (
          select 1
          from public.match_players mp
          where mp.match_id = match_events.match_id
            and mp.user_id = auth.uid()
        )
      )
  )
);

create or replace function public.get_match_roster(p_match_id uuid)
returns setof public.match_players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_allowed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_match
  from public.matches
  where id = p_match_id;

  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.game_type = 'chess' then
    v_allowed := auth.uid() = v_match.white_user_id
      or auth.uid() = v_match.black_user_id
      or auth.uid() = v_match.created_by;
  else
    v_allowed := exists (
      select 1
      from public.match_players mp
      where mp.match_id = p_match_id
        and mp.user_id = auth.uid()
    ) or auth.uid() = v_match.created_by;
  end if;

  if not v_allowed then
    raise exception 'Not authorized';
  end if;

  return query
    select *
    from public.match_players
    where match_id = p_match_id
    order by seat_index;
end;
$$;

grant execute on function public.get_match_roster(uuid) to authenticated;

create index if not exists match_players_match_id_idx
  on public.match_players(match_id);

create index if not exists match_players_user_id_idx
  on public.match_players(user_id);

create index if not exists match_events_match_id_seq_idx
  on public.match_events(match_id, seq);

create index if not exists match_invites_to_user_status_idx
  on public.match_invites(to_user_id, status);

commit;
