begin;

create or replace function public.apply_ludo_move(p_match_id uuid, p_client_version bigint, p_token_id integer)
 returns jsonb
 language plpgsql
 security definer
as $function$
declare
    v_match public.matches%rowtype;
    v_current_seat int;
    v_player public.match_players%rowtype;
    v_dice_value int;
    v_new_version bigint;
    v_tokens jsonb;
    v_tokens_updated jsonb := '[]'::jsonb;
    v_token jsonb;
    v_token_idx int;
    v_current_pos int;
    v_new_pos int;
    v_extra_turn boolean := false;
    v_next_seat int;
    v_winner int := null;
    v_finished_count int;
    v_active_seats jsonb;
    v_seat_count int;
    v_current_idx int;
    v_player_status text;
    v_safe_cells int[] := array[0, 8, 13, 21, 26, 34, 39, 47];
    v_start_offsets int[] := array[0, 13, 26, 39];
    v_target_global int;
    v_is_safe boolean := false;
    v_knocked jsonb := '[]'::jsonb;
    v_entered_lane boolean := false;
begin
    -- Lock and get match
    select * into v_match from public.matches where id = p_match_id for update;

    if not found then
        raise exception 'Match not found';
    end if;

    if v_match.status != 'active' then
        raise exception 'Match is not active';
    end if;

    -- Optimistic concurrency check
    if v_match.version != p_client_version then
        raise exception 'Version mismatch: expected %, got %', v_match.version, p_client_version;
    end if;

    -- Get game state
    v_current_seat := coalesce((v_match.state->>'currentPlayerIndex')::int, 0);
    v_dice_value := (v_match.state->>'diceValue')::int;
    v_tokens := v_match.state->'tokens';
    v_active_seats := coalesce(v_match.state->'activeSeats', '[0,1,2,3]'::jsonb);
    v_seat_count := jsonb_array_length(v_active_seats);

    if v_dice_value is null then
        raise exception 'Must roll dice first';
    end if;

    -- Verify current player
    select * into v_player
    from public.match_players
    where match_id = p_match_id and seat_index = v_current_seat;

    if v_player.is_ai = false and v_player.user_id != auth.uid() then
        raise exception 'Not your turn';
    end if;

    -- Find and validate the token
    v_current_pos := null;
    for v_token_idx in 0..jsonb_array_length(v_tokens)-1 loop
        v_token := v_tokens->v_token_idx;
        if (v_token->>'id')::int = p_token_id then
            -- Verify token belongs to current player
            if (v_token->>'playerIndex')::int != v_current_seat then
                raise exception 'Token does not belong to current player';
            end if;

            v_current_pos := (v_token->>'position')::int;

            -- Canonical movement rules:
            -- - Track positions are relative (0..51), door at 51
            -- - Home lane is 52..57, finish is 58
            if v_current_pos = -1 then
                if v_dice_value != 6 then
                    raise exception 'Need 6 to move from home';
                end if;
                v_new_pos := 0;
                v_extra_turn := true;
            elsif v_current_pos >= 0 and v_current_pos <= 51 then
                if v_dice_value <= (51 - v_current_pos) then
                    v_new_pos := v_current_pos + v_dice_value;
                else
                    v_new_pos := 52 + (v_dice_value - (51 - v_current_pos) - 1);
                    v_entered_lane := true;
                end if;
                if v_new_pos > 58 then
                    raise exception 'Move would exceed finish line';
                end if;
            elsif v_current_pos >= 52 and v_current_pos <= 57 then
                v_new_pos := v_current_pos + v_dice_value;
                if v_new_pos > 58 then
                    raise exception 'Move would exceed finish line';
                end if;
            else
                raise exception 'Token already finished';
            end if;

            -- Update token position
            v_tokens := jsonb_set(
                v_tokens,
                array[v_token_idx::text, 'position'],
                to_jsonb(v_new_pos)
            );

            exit;
        end if;
    end loop;

    if v_current_pos is null then
        raise exception 'Token not found';
    end if;

    -- Knockout on non-safe track squares
    if v_new_pos >= 0 and v_new_pos < 52 then
        v_target_global := (v_new_pos + v_start_offsets[v_current_seat + 1]) % 52;
        v_is_safe := v_target_global = any(v_safe_cells);

        if not v_is_safe then
            v_tokens_updated := '[]'::jsonb;
            for v_token_idx in 0..jsonb_array_length(v_tokens)-1 loop
                v_token := v_tokens->v_token_idx;
                if (v_token->>'playerIndex')::int != v_current_seat
                   and (v_token->>'position')::int >= 0
                   and (v_token->>'position')::int < 52 then
                    if (((v_token->>'position')::int + v_start_offsets[((v_token->>'playerIndex')::int) + 1]) % 52) = v_target_global then
                        v_knocked := v_knocked || jsonb_build_object(
                            'tokenId', (v_token->>'id')::int,
                            'playerIndex', (v_token->>'playerIndex')::int
                        );
                        v_token := jsonb_set(v_token, '{position}', '-1'::jsonb);
                    end if;
                end if;
                v_tokens_updated := v_tokens_updated || v_token;
            end loop;
            v_tokens := v_tokens_updated;
        end if;
    end if;

    -- Rolling 6 grants extra turn
    if v_dice_value = 6 then
        v_extra_turn := true;
    end if;

    -- Find current seat's index in active_seats
    v_current_idx := 0;
    for i in 0..v_seat_count-1 loop
        if (v_active_seats->i)::int = v_current_seat then
            v_current_idx := i;
            exit;
        end if;
    end loop;

    -- Calculate next seat from active_seats array
    if v_extra_turn then
        v_next_seat := v_current_seat;
    else
        v_next_seat := (v_active_seats->((v_current_idx + 1) % v_seat_count))::int;
    end if;

    -- Check for winner
    select count(*) into v_finished_count
    from jsonb_array_elements(v_tokens) t
    where (t->>'playerIndex')::int = v_current_seat
      and (t->>'position')::int = 58;

    if v_finished_count = 4 then
        v_winner := v_current_seat;
    end if;

    v_new_version := v_match.version + 1;

    -- Insert move event
    insert into public.match_events (match_id, seq, event_type, payload, actor_user_id)
    values (
        p_match_id,
        v_new_version,
        'ludo_move',
        jsonb_build_object(
            'tokenId', p_token_id,
            'from', v_current_pos,
            'to', v_new_pos,
            'diceValue', v_dice_value,
            'seat', v_current_seat,
            'nextSeat', v_next_seat,
            'winner', v_winner,
            'enteredLane', v_entered_lane,
            'knockedTokens', v_knocked
        ),
        auth.uid()
    );

    -- If next seat is pending, auto-skip until a joined seat
    for i in 1..v_seat_count loop
        select status into v_player_status
        from public.match_players
        where match_id = p_match_id and seat_index = v_next_seat;

        if v_player_status = 'joined' then
            exit;
        end if;

        v_current_idx := 0;
        for j in 0..v_seat_count-1 loop
            if (v_active_seats->j)::int = v_next_seat then
                v_current_idx := j;
                exit;
            end if;
        end loop;

        v_new_version := v_new_version + 1;
        insert into public.match_events (match_id, seq, event_type, payload, actor_user_id)
        values (
            p_match_id,
            v_new_version,
            'TURN_SKIPPED',
            jsonb_build_object('seat', v_next_seat, 'nextSeat', (v_active_seats->((v_current_idx + 1) % v_seat_count))::int, 'reason', 'pending'),
            null
        );

        v_next_seat := (v_active_seats->((v_current_idx + 1) % v_seat_count))::int;
    end loop;

    -- Update match state
    update public.matches
    set
        state = jsonb_build_object(
            'currentPlayerIndex', v_next_seat,
            'diceValue', null,
            'tokens', v_tokens,
            'winner', v_winner,
            'activeSeats', v_active_seats
        ),
        version = v_new_version,
        status = case when v_winner is not null then 'completed' else 'active' end,
        ended_at = case when v_winner is not null then now() else null end
    where id = p_match_id;

    return jsonb_build_object(
        'success', true,
        'newVersion', v_new_version,
        'newPosition', v_new_pos,
        'nextSeat', v_next_seat,
        'winner', v_winner,
        'knockedTokens', v_knocked
    );
end;
$function$;

commit;
