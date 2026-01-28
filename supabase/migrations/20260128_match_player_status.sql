begin;

create or replace function public.set_match_player_status(
  p_match_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_player public.match_players%rowtype;
begin
  if p_status not in ('joined', 'left') then
    raise exception 'Invalid status: %', p_status;
  end if;

  select * into v_player
  from public.match_players
  where match_id = p_match_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Not a match participant';
  end if;

  update public.match_players
  set status = p_status
  where id = v_player.id;

  if p_status = 'left' then
    perform public.advance_ludo_turn_if_needed(p_match_id);
  end if;
end;
$function$;

grant execute on function public.set_match_player_status(uuid, text) to authenticated;

commit;
