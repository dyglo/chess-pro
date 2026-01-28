begin;

drop function if exists public.get_match_roster(uuid);

create or replace function public.get_match_roster(p_match_id uuid)
returns table (
  id uuid,
  match_id uuid,
  user_id uuid,
  seat_index integer,
  status text,
  is_ai boolean,
  color text,
  display_name text,
  username text,
  avatar_url text,
  country text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    mp.id,
    mp.match_id,
    mp.user_id,
    mp.seat_index,
    mp.status,
    mp.is_ai,
    mp.color,
    coalesce(
      p.full_name,
      p.username,
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      u.raw_user_meta_data->>'username',
      u.email,
      'Player'
    ) as display_name,
    coalesce(p.username, u.raw_user_meta_data->>'username') as username,
    coalesce(p.avatar_url, u.raw_user_meta_data->>'avatar_url') as avatar_url,
    coalesce(p.country, u.raw_user_meta_data->>'country') as country
  from public.match_players mp
  left join public.profiles p on p.id = mp.user_id
  left join auth.users u on u.id = mp.user_id
  where mp.match_id = p_match_id
  order by mp.seat_index;
$$;

grant execute on function public.get_match_roster(uuid) to authenticated;

commit;
