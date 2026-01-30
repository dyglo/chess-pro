create or replace function public.record_leaderboard_from_games()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner_user uuid;
  v_match_type text;
begin
  if new.winner_color is null or new.winner_color = 'draw' then
    return new;
  end if;

  if new.winner_color = 'white' then
    v_winner_user := new.white_user_id;
  elsif new.winner_color = 'black' then
    v_winner_user := new.black_user_id;
  end if;

  if v_winner_user is null then
    return new;
  end if;

  if not exists (select 1 from public.profiles where id = v_winner_user) then
    return new;
  end if;

  v_match_type := case when new.game_type = 'ai' then 'solo' else 'multiplayer' end;

  insert into public.leaderboard_entries (
    game_mode,
    match_type,
    source_type,
    source_id,
    game_id,
    match_id,
    winner_user_id,
    completed_at
  ) values (
    'chess',
    v_match_type,
    'games',
    new.id,
    new.id,
    new.match_id,
    v_winner_user,
    coalesce(new.ended_at, new.updated_at, now())
  ) on conflict (source_type, source_id) do nothing;

  return new;
end;
$$;

create or replace function public.record_leaderboard_from_ludo_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner_seat int;
  v_winner_user uuid;
begin
  if new.game_type <> 'ludo' then
    return new;
  end if;
  if new.status <> 'completed' then
    return new;
  end if;
  if (new.state ? 'winner') is false then
    return new;
  end if;

  v_winner_seat := (new.state->>'winner')::int;
  if v_winner_seat is null then
    return new;
  end if;

  select mp.user_id
    into v_winner_user
    from public.match_players mp
   where mp.match_id = new.id
     and mp.seat_index = v_winner_seat
     and mp.user_id is not null
   limit 1;

  if v_winner_user is null then
    return new;
  end if;

  if not exists (select 1 from public.profiles where id = v_winner_user) then
    return new;
  end if;

  insert into public.leaderboard_entries (
    game_mode,
    match_type,
    source_type,
    source_id,
    match_id,
    winner_user_id,
    winner_seat,
    completed_at
  ) values (
    'ludo',
    'multiplayer',
    'matches',
    new.id,
    new.id,
    v_winner_user,
    v_winner_seat,
    coalesce(new.ended_at, now())
  ) on conflict (source_type, source_id) do nothing;

  return new;
end;
$$;

create or replace function public.record_leaderboard_from_ludo_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner_user uuid;
begin
  if new.status <> 'finished' or new.winner_index is null then
    return new;
  end if;

  select lp.user_id
    into v_winner_user
    from public.ludo_players lp
   where lp.session_id = new.id
     and lp.player_index = new.winner_index
     and lp.user_id is not null
   limit 1;

  if v_winner_user is null then
    return new;
  end if;

  if not exists (select 1 from public.profiles where id = v_winner_user) then
    return new;
  end if;

  insert into public.leaderboard_entries (
    game_mode,
    match_type,
    source_type,
    source_id,
    ludo_session_id,
    winner_user_id,
    winner_seat,
    completed_at
  ) values (
    'ludo',
    'solo',
    'ludo_sessions',
    new.id,
    new.id,
    v_winner_user,
    new.winner_index,
    coalesce(new.updated_at, now())
  ) on conflict (source_type, source_id) do nothing;

  return new;
end;
$$;
