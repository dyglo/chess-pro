create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  game_mode text not null check (game_mode in ('chess', 'ludo')),
  match_type text not null check (match_type in ('solo', 'multiplayer')),
  source_type text not null check (source_type in ('games', 'matches', 'ludo_sessions')),
  source_id uuid not null,
  game_id uuid null references public.games(id) on delete set null,
  match_id uuid null references public.matches(id) on delete set null,
  ludo_session_id uuid null references public.ludo_sessions(id) on delete set null,
  winner_user_id uuid not null references public.profiles(id) on delete cascade,
  winner_seat integer null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create unique index if not exists leaderboard_entries_source_idx on public.leaderboard_entries(source_type, source_id);
create index if not exists leaderboard_entries_winner_idx on public.leaderboard_entries(winner_user_id);
create index if not exists leaderboard_entries_completed_idx on public.leaderboard_entries(completed_at desc);
create index if not exists leaderboard_entries_mode_idx on public.leaderboard_entries(game_mode, match_type);

alter table public.leaderboard_entries enable row level security;

create policy "leaderboard_entries_select" on public.leaderboard_entries
  for select using (true);

grant select on public.leaderboard_entries to anon, authenticated;

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

drop trigger if exists trg_leaderboard_games on public.games;
create trigger trg_leaderboard_games
  after insert or update of winner_color on public.games
  for each row
  execute function public.record_leaderboard_from_games();

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

drop trigger if exists trg_leaderboard_ludo_match on public.matches;
create trigger trg_leaderboard_ludo_match
  after update of status, state on public.matches
  for each row
  when (new.status = 'completed')
  execute function public.record_leaderboard_from_ludo_match();

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

drop trigger if exists trg_leaderboard_ludo_session on public.ludo_sessions;
create trigger trg_leaderboard_ludo_session
  after update of status, winner_index on public.ludo_sessions
  for each row
  when (new.status = 'finished' and new.winner_index is not null)
  execute function public.record_leaderboard_from_ludo_session();

create or replace view public.leaderboard_summary as
select
  winner_user_id,
  game_mode,
  match_type,
  count(*)::int as win_count,
  max(completed_at) as last_win_at
from public.leaderboard_entries
group by winner_user_id, game_mode, match_type;

grant select on public.leaderboard_summary to anon, authenticated;

insert into public.leaderboard_entries (
  game_mode,
  match_type,
  source_type,
  source_id,
  game_id,
  match_id,
  winner_user_id,
  completed_at
)
select
  'chess',
  case when g.game_type = 'ai' then 'solo' else 'multiplayer' end,
  'games',
  g.id,
  g.id,
  g.match_id,
  case when g.winner_color = 'white' then g.white_user_id else g.black_user_id end,
  coalesce(g.ended_at, g.updated_at, g.created_at)
from public.games g
where g.winner_color in ('white', 'black')
  and ((g.winner_color = 'white' and g.white_user_id is not null)
    or (g.winner_color = 'black' and g.black_user_id is not null))
on conflict (source_type, source_id) do nothing;

insert into public.leaderboard_entries (
  game_mode,
  match_type,
  source_type,
  source_id,
  match_id,
  winner_user_id,
  winner_seat,
  completed_at
)
select
  'ludo',
  'multiplayer',
  'matches',
  m.id,
  m.id,
  mp.user_id,
  (m.state->>'winner')::int,
  coalesce(m.ended_at, m.updated_at, m.created_at)
from public.matches m
join public.match_players mp
  on mp.match_id = m.id
  and mp.seat_index = (m.state->>'winner')::int
where m.game_type = 'ludo'
  and m.status = 'completed'
  and (m.state ? 'winner')
  and mp.user_id is not null
on conflict (source_type, source_id) do nothing;

insert into public.leaderboard_entries (
  game_mode,
  match_type,
  source_type,
  source_id,
  ludo_session_id,
  winner_user_id,
  winner_seat,
  completed_at
)
select
  'ludo',
  'solo',
  'ludo_sessions',
  s.id,
  s.id,
  lp.user_id,
  s.winner_index,
  coalesce(s.updated_at, s.created_at)
from public.ludo_sessions s
join public.ludo_players lp
  on lp.session_id = s.id
  and lp.player_index = s.winner_index
where s.status = 'finished'
  and s.winner_index is not null
  and lp.user_id is not null
on conflict (source_type, source_id) do nothing;
