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
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    mp.id,
    mp.match_id,
    mp.user_id,
    mp.seat_index,
    mp.status,
    mp.is_ai,
    mp.color,
    coalesce(p.full_name, p.username, 'Player') as display_name,
    p.username,
    p.avatar_url
  from public.match_players mp
  left join public.profiles p on p.id = mp.user_id
  where mp.match_id = p_match_id
  order by mp.seat_index;
$$;

grant execute on function public.get_match_roster(uuid) to authenticated;

create or replace function public.start_match(p_match_id uuid)
 returns jsonb
 language plpgsql
 security definer
as $function$
DECLARE
    v_match public.matches%ROWTYPE;
    v_joined_count int;
    v_min_players int;
    v_max_players int;
    v_seat_colors text[];
    v_seat record;
    v_initial_tokens jsonb := '[]'::jsonb;
    v_token_idx int;
    v_active_seats jsonb;
BEGIN
    -- Lock and get match
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;
    
    IF v_match.created_by != auth.uid() THEN
        RAISE EXCEPTION 'Only match creator can start the game';
    END IF;
    
    IF v_match.status NOT IN ('pending', 'lobby') THEN
        RAISE EXCEPTION 'Match cannot be started in status: %', v_match.status;
    END IF;

    -- Set constraints based on game type
    IF v_match.game_type = 'chess' THEN
        v_min_players := 2;
        v_max_players := 2;
    ELSE
        -- Ludo can be played with 2-4 players
        v_min_players := 2;
        v_max_players := 4;
    END IF;

    -- Count joined players
    SELECT COUNT(*) INTO v_joined_count
    FROM public.match_players
    WHERE match_id = p_match_id AND status = 'joined';

    IF v_joined_count < v_min_players THEN
        RAISE EXCEPTION 'Need at least % joined players to start (have %)', v_min_players, v_joined_count;
    END IF;

    -- Active seats include all seats present (joined + pending)
    SELECT jsonb_agg(seat_index ORDER BY seat_index)
    INTO v_active_seats
    FROM public.match_players
    WHERE match_id = p_match_id;

    IF v_active_seats IS NULL THEN
        RAISE EXCEPTION 'No seats available for match';
    END IF;

    -- For Ludo: Initialize tokens for ALL seats (joined + pending)
    IF v_match.game_type = 'ludo' THEN
        v_seat_colors := ARRAY['blue', 'red', 'green', 'yellow'];
        
        FOR v_seat IN 
            SELECT seat_index 
            FROM public.match_players 
            WHERE match_id = p_match_id
            ORDER BY seat_index
        LOOP
            FOR v_token_idx IN 0..3 LOOP
                v_initial_tokens := v_initial_tokens || jsonb_build_object(
                    'id', v_seat.seat_index * 4 + v_token_idx,
                    'playerIndex', v_seat.seat_index,
                    'position', -1,
                    'color', v_seat_colors[v_seat.seat_index + 1]
                );
            END LOOP;
        END LOOP;

        -- Update state with tokens and active seats
        UPDATE public.matches
        SET state = jsonb_set(
                jsonb_set(state, '{tokens}', v_initial_tokens),
                '{activeSeats}', v_active_seats
            ),
            status = 'active',
            started_at = now()
        WHERE id = p_match_id;
    ELSE
        -- Chess: just start
        UPDATE public.matches
        SET status = 'active',
            started_at = now()
        WHERE id = p_match_id;
    END IF;

    -- Notify all joined players
    INSERT INTO public.notifications (user_id, type, title, message, payload)
    SELECT 
        mp.user_id,
        'match_started',
        'Game Started!',
        format('Your %s game has started!', v_match.game_type),
        jsonb_build_object('matchId', p_match_id, 'gameType', v_match.game_type)
    FROM public.match_players mp
    WHERE mp.match_id = p_match_id 
      AND mp.status = 'joined' 
      AND mp.user_id IS NOT NULL
      AND mp.user_id != auth.uid();

    RETURN jsonb_build_object('success', true, 'matchId', p_match_id, 'playerCount', v_joined_count);
END;
$function$;

create or replace function public.accept_invite(p_invite_id uuid)
 returns jsonb
 language plpgsql
 security definer
as $function$
DECLARE
    v_invite public.match_invites%ROWTYPE;
    v_match public.matches%ROWTYPE;
    v_tokens jsonb;
    v_seat_colors text[];
    v_token_idx int;
    v_active_seats jsonb;
    v_has_seat boolean := false;
BEGIN
    -- Lock and get invite
    SELECT * INTO v_invite FROM public.match_invites WHERE id = p_invite_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invite not found';
    END IF;
    
    IF v_invite.to_user_id != auth.uid() THEN
        RAISE EXCEPTION 'This invite is not for you';
    END IF;
    
    IF v_invite.status != 'pending' THEN
        RAISE EXCEPTION 'Invite already handled';
    END IF;

    -- Get match
    SELECT * INTO v_match FROM public.matches WHERE id = v_invite.match_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    -- Update invite status
    UPDATE public.match_invites
    SET status = 'accepted', responded_at = now()
    WHERE id = p_invite_id;

    -- Update player status to joined
    UPDATE public.match_players
    SET status = 'joined'
    WHERE match_id = v_invite.match_id AND user_id = auth.uid();

    -- If match already active (Ludo), ensure seat exists in activeSeats and tokens exist
    IF v_match.status = 'active' AND v_match.game_type = 'ludo' THEN
        v_active_seats := COALESCE(v_match.state->'activeSeats', '[]'::jsonb);
        v_tokens := COALESCE(v_match.state->'tokens', '[]'::jsonb);

        SELECT EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(v_active_seats) s
            WHERE (s::int) = v_invite.seat_index
        ) INTO v_has_seat;

        IF NOT v_has_seat THEN
            v_active_seats := v_active_seats || to_jsonb(v_invite.seat_index);
        END IF;

        SELECT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_tokens) t
            WHERE (t->>'playerIndex')::int = v_invite.seat_index
        ) INTO v_has_seat;

        IF NOT v_has_seat THEN
            v_seat_colors := ARRAY['blue', 'red', 'green', 'yellow'];
            FOR v_token_idx IN 0..3 LOOP
                v_tokens := v_tokens || jsonb_build_object(
                    'id', v_invite.seat_index * 4 + v_token_idx,
                    'playerIndex', v_invite.seat_index,
                    'position', -1,
                    'color', v_seat_colors[v_invite.seat_index + 1]
                );
            END LOOP;
        END IF;

        UPDATE public.matches
        SET state = jsonb_set(
                jsonb_set(state, '{tokens}', v_tokens),
                '{activeSeats}', v_active_seats
            )
        WHERE id = v_invite.match_id;
    END IF;

    -- Notify match creator
    INSERT INTO public.notifications (user_id, type, title, message, payload)
    VALUES (
        v_match.created_by,
        'invite_accepted',
        'Player Joined',
        'A player accepted your game invite!',
        jsonb_build_object(
            'matchId', v_invite.match_id,
            'userId', auth.uid(),
            'gameType', v_match.game_type
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'matchId', v_invite.match_id,
        'gameType', v_match.game_type,
        'seatIndex', v_invite.seat_index
    );
END;
$function$;

create or replace function public.advance_ludo_turn_if_needed(p_match_id uuid)
 returns jsonb
 language plpgsql
 security definer
as $function$
DECLARE
    v_match public.matches%ROWTYPE;
    v_current_seat int;
    v_next_seat int;
    v_active_seats jsonb;
    v_seat_count int;
    v_current_idx int;
    v_player_status text;
    v_skipped_seat int;
    v_skipped_seat int;
    v_new_version bigint;
    v_skipped boolean := false;
BEGIN
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    IF v_match.status != 'active' THEN
        RAISE EXCEPTION 'Match is not active';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.match_players
        WHERE match_id = p_match_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not a participant';
    END IF;

    v_current_seat := COALESCE((v_match.state->>'currentPlayerIndex')::int, 0);
    v_active_seats := COALESCE(v_match.state->'activeSeats', (
        SELECT jsonb_agg(seat_index ORDER BY seat_index)
        FROM public.match_players
        WHERE match_id = p_match_id
    ));

    IF v_active_seats IS NULL THEN
        RAISE EXCEPTION 'No active seats';
    END IF;

    v_seat_count := jsonb_array_length(v_active_seats);
    v_new_version := v_match.version;

    FOR i IN 1..v_seat_count LOOP
        SELECT status INTO v_player_status
        FROM public.match_players
        WHERE match_id = p_match_id AND seat_index = v_current_seat;

        IF v_player_status = 'joined' THEN
            EXIT;
        END IF;

        v_current_idx := 0;
        FOR j IN 0..v_seat_count-1 LOOP
            IF (v_active_seats->j)::int = v_current_seat THEN
                v_current_idx := j;
                EXIT;
            END IF;
        END LOOP;

        v_next_seat := (v_active_seats->((v_current_idx + 1) % v_seat_count))::int;
        v_new_version := v_new_version + 1;

        INSERT INTO public.match_events (match_id, seq, event_type, payload, actor_user_id)
        VALUES (
            p_match_id,
            v_new_version,
            'TURN_SKIPPED',
            jsonb_build_object('seat', v_current_seat, 'nextSeat', v_next_seat, 'reason', 'pending'),
            NULL
        );

        v_current_seat := v_next_seat;
        v_skipped := true;
    END LOOP;

    IF v_skipped THEN
        UPDATE public.matches
        SET state = jsonb_set(
                jsonb_set(state, '{currentPlayerIndex}', to_jsonb(v_current_seat)),
                '{diceValue}', 'null'::jsonb
            ),
            version = v_new_version
        WHERE id = p_match_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'skipped', v_skipped, 'currentSeat', v_current_seat, 'newVersion', v_new_version);
END;
$function$;

create or replace function public.apply_ludo_roll(p_match_id uuid, p_client_version bigint)
 returns jsonb
 language plpgsql
 security definer
as $function$
DECLARE
    v_match public.matches%ROWTYPE;
    v_current_seat int;
    v_player public.match_players%ROWTYPE;
    v_player_status text;
    v_dice_value int;
    v_new_version bigint;
    v_active_seats jsonb;
    v_seat_count int;
    v_current_idx int;
    v_next_seat int;
    v_skipped boolean := false;
BEGIN
    -- Lock and get match
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;
    
    IF v_match.status != 'active' THEN
        RAISE EXCEPTION 'Match is not active';
    END IF;
    
    -- Optimistic concurrency check
    IF v_match.version != p_client_version THEN
        RAISE EXCEPTION 'Version mismatch: expected %, got %', v_match.version, p_client_version;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.match_players
        WHERE match_id = p_match_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not a participant';
    END IF;
    
    v_current_seat := COALESCE((v_match.state->>'currentPlayerIndex')::int, 0);
    v_active_seats := COALESCE(v_match.state->'activeSeats', (
        SELECT jsonb_agg(seat_index ORDER BY seat_index)
        FROM public.match_players
        WHERE match_id = p_match_id
    ));
    v_seat_count := jsonb_array_length(v_active_seats);
    v_new_version := v_match.version;

    -- Auto-skip pending seats until a joined player is current
    FOR i IN 1..v_seat_count LOOP
        SELECT status INTO v_player_status
        FROM public.match_players
        WHERE match_id = p_match_id AND seat_index = v_current_seat;

        IF v_player_status = 'joined' THEN
            EXIT;
        END IF;

        v_current_idx := 0;
        FOR j IN 0..v_seat_count-1 LOOP
            IF (v_active_seats->j)::int = v_current_seat THEN
                v_current_idx := j;
                EXIT;
            END IF;
        END LOOP;

        v_next_seat := (v_active_seats->((v_current_idx + 1) % v_seat_count))::int;
        v_new_version := v_new_version + 1;

        INSERT INTO public.match_events (match_id, seq, event_type, payload, actor_user_id)
        VALUES (
            p_match_id,
            v_new_version,
            'TURN_SKIPPED',
            jsonb_build_object('seat', v_current_seat, 'nextSeat', v_next_seat, 'reason', 'pending'),
            NULL
        );

        v_current_seat := v_next_seat;
        v_skipped := true;
    END LOOP;

    IF v_skipped THEN
        UPDATE public.matches
        SET state = jsonb_set(
                jsonb_set(state, '{currentPlayerIndex}', to_jsonb(v_current_seat)),
                '{diceValue}', 'null'::jsonb
            ),
            version = v_new_version
        WHERE id = p_match_id;
    END IF;

    -- Verify current player
    SELECT * INTO v_player 
    FROM public.match_players 
    WHERE match_id = p_match_id AND seat_index = v_current_seat;
    
    IF v_player.is_ai = false AND v_player.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Not your turn';
    END IF;
    
    -- Check if already rolled
    IF (v_match.state->>'diceValue') IS NOT NULL THEN
        RAISE EXCEPTION 'Already rolled, must move or skip';
    END IF;
    
    -- Roll dice
    v_dice_value := floor(random() * 6 + 1)::int;
    v_new_version := v_new_version + 1;
    
    -- Insert event
    INSERT INTO public.match_events (match_id, seq, event_type, payload, actor_user_id)
    VALUES (
        p_match_id, 
        v_new_version,
        'ludo_roll',
        jsonb_build_object('diceValue', v_dice_value, 'seat', v_current_seat),
        auth.uid()
    );
    
    -- Update match state
    UPDATE public.matches
    SET 
        state = jsonb_set(state, '{diceValue}', to_jsonb(v_dice_value)),
        version = v_new_version
    WHERE id = p_match_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'diceValue', v_dice_value, 
        'newVersion', v_new_version
    );
END;
$function$;

create or replace function public.apply_ludo_move(p_match_id uuid, p_client_version bigint, p_token_id integer)
 returns jsonb
 language plpgsql
 security definer
as $function$
DECLARE
    v_match public.matches%ROWTYPE;
    v_current_seat int;
    v_player public.match_players%ROWTYPE;
    v_dice_value int;
    v_new_version bigint;
    v_tokens jsonb;
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
BEGIN
    -- Lock and get match
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;
    
    IF v_match.status != 'active' THEN
        RAISE EXCEPTION 'Match is not active';
    END IF;
    
    -- Optimistic concurrency check
    IF v_match.version != p_client_version THEN
        RAISE EXCEPTION 'Version mismatch: expected %, got %', v_match.version, p_client_version;
    END IF;
    
    -- Get game state
    v_current_seat := COALESCE((v_match.state->>'currentPlayerIndex')::int, 0);
    v_dice_value := (v_match.state->>'diceValue')::int;
    v_tokens := v_match.state->'tokens';
    v_active_seats := COALESCE(v_match.state->'activeSeats', '[0,1,2,3]'::jsonb);
    v_seat_count := jsonb_array_length(v_active_seats);
    
    IF v_dice_value IS NULL THEN
        RAISE EXCEPTION 'Must roll dice first';
    END IF;
    
    -- Verify current player
    SELECT * INTO v_player 
    FROM public.match_players 
    WHERE match_id = p_match_id AND seat_index = v_current_seat;
    
    IF v_player.is_ai = false AND v_player.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Not your turn';
    END IF;
    
    -- Find and validate the token
    FOR v_token_idx IN 0..jsonb_array_length(v_tokens)-1 LOOP
        v_token := v_tokens->v_token_idx;
        IF (v_token->>'id')::int = p_token_id THEN
            -- Verify token belongs to current player
            IF (v_token->>'playerIndex')::int != v_current_seat THEN
                RAISE EXCEPTION 'Token does not belong to current player';
            END IF;
            
            v_current_pos := (v_token->>'position')::int;
            
            -- Calculate new position
            IF v_current_pos = -1 THEN
                -- Moving from home (only on 6)
                IF v_dice_value != 6 THEN
                    RAISE EXCEPTION 'Need 6 to move from home';
                END IF;
                v_new_pos := 0;
                v_extra_turn := true;
            ELSE
                v_new_pos := v_current_pos + v_dice_value;
                
                -- Check finish line (position 57 is finish)
                IF v_new_pos > 57 THEN
                    RAISE EXCEPTION 'Move would exceed finish line';
                END IF;
            END IF;
            
            -- Update token position
            v_tokens := jsonb_set(
                v_tokens, 
                ARRAY[v_token_idx::text, 'position'], 
                to_jsonb(v_new_pos)
            );
            
            EXIT;
        END IF;
    END LOOP;
    
    -- Rolling 6 grants extra turn
    IF v_dice_value = 6 THEN
        v_extra_turn := true;
    END IF;
    
    -- Find current seat's index in active_seats
    v_current_idx := 0;
    FOR i IN 0..v_seat_count-1 LOOP
        IF (v_active_seats->i)::int = v_current_seat THEN
            v_current_idx := i;
            EXIT;
        END IF;
    END LOOP;
    
    -- Calculate next seat from active_seats array
    IF v_extra_turn THEN
        v_next_seat := v_current_seat;
    ELSE
        v_next_seat := (v_active_seats->((v_current_idx + 1) % v_seat_count))::int;
    END IF;
    
    -- Check for winner
    SELECT COUNT(*) INTO v_finished_count
    FROM jsonb_array_elements(v_tokens) t
    WHERE (t->>'playerIndex')::int = v_current_seat
      AND (t->>'position')::int = 57;
    
    IF v_finished_count = 4 THEN
        v_winner := v_current_seat;
    END IF;
    
    v_new_version := v_match.version + 1;
    
    -- Insert move event
    INSERT INTO public.match_events (match_id, seq, event_type, payload, actor_user_id)
    VALUES (
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
            'winner', v_winner
        ),
        auth.uid()
    );

    -- If next seat is pending, auto-skip until a joined seat
    FOR i IN 1..v_seat_count LOOP
        SELECT status INTO v_player_status
        FROM public.match_players
        WHERE match_id = p_match_id AND seat_index = v_next_seat;

        IF v_player_status = 'joined' THEN
            EXIT;
        END IF;

        v_current_idx := 0;
        FOR j IN 0..v_seat_count-1 LOOP
            IF (v_active_seats->j)::int = v_next_seat THEN
                v_current_idx := j;
                EXIT;
            END IF;
        END LOOP;

        v_skipped_seat := v_next_seat;
        v_next_seat := (v_active_seats->((v_current_idx + 1) % v_seat_count))::int;
        v_new_version := v_new_version + 1;

        INSERT INTO public.match_events (match_id, seq, event_type, payload, actor_user_id)
        VALUES (
            p_match_id,
            v_new_version,
            'TURN_SKIPPED',
            jsonb_build_object('seat', v_skipped_seat, 'nextSeat', v_next_seat, 'reason', 'pending'),
            NULL
        );
    END LOOP;
    
    -- Update match state
    UPDATE public.matches
    SET 
        state = jsonb_build_object(
            'currentPlayerIndex', v_next_seat,
            'diceValue', NULL,
            'tokens', v_tokens,
            'winner', v_winner,
            'activeSeats', v_active_seats
        ),
        version = v_new_version,
        status = CASE WHEN v_winner IS NOT NULL THEN 'completed' ELSE 'active' END,
        ended_at = CASE WHEN v_winner IS NOT NULL THEN now() ELSE NULL END
    WHERE id = p_match_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'newVersion', v_new_version,
        'newPosition', v_new_pos,
        'nextSeat', v_next_seat,
        'winner', v_winner
    );
END;
$function$;

create or replace function public.skip_ludo_turn(p_match_id uuid, p_client_version bigint, p_reason text DEFAULT 'no_valid_moves'::text)
 returns jsonb
 language plpgsql
 security definer
as $function$
DECLARE
    v_match public.matches%ROWTYPE;
    v_current_seat int;
    v_player public.match_players%ROWTYPE;
    v_new_version bigint;
    v_next_seat int;
    v_active_seats jsonb;
    v_seat_count int;
    v_current_idx int;
    v_player_status text;
BEGIN
    -- Lock and get match
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;
    
    IF v_match.status != 'active' THEN
        RAISE EXCEPTION 'Match is not active';
    END IF;
    
    -- Optimistic concurrency check
    IF v_match.version != p_client_version THEN
        RAISE EXCEPTION 'Version mismatch: expected %, got %', v_match.version, p_client_version;
    END IF;
    
    -- Get current seat and active seats
    v_current_seat := COALESCE((v_match.state->>'currentPlayerIndex')::int, 0);
    v_active_seats := COALESCE(v_match.state->'activeSeats', '[0,1,2,3]'::jsonb);
    v_seat_count := jsonb_array_length(v_active_seats);
    
    -- Verify current player
    SELECT * INTO v_player 
    FROM public.match_players 
    WHERE match_id = p_match_id AND seat_index = v_current_seat;
    
    IF v_player.is_ai = false AND v_player.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Not your turn';
    END IF;
    
    -- Find current seat's index in active_seats
    v_current_idx := 0;
    FOR i IN 0..v_seat_count-1 LOOP
        IF (v_active_seats->i)::int = v_current_seat THEN
            v_current_idx := i;
            EXIT;
        END IF;
    END LOOP;
    
    -- Calculate next seat
    v_next_seat := (v_active_seats->((v_current_idx + 1) % v_seat_count))::int;
    v_new_version := v_match.version + 1;
    
    -- Insert skip event for current seat
    INSERT INTO public.match_events (match_id, seq, event_type, payload, actor_user_id)
    VALUES (
        p_match_id, 
        v_new_version,
        'TURN_SKIPPED',
        jsonb_build_object('seat', v_current_seat, 'nextSeat', v_next_seat, 'reason', p_reason),
        auth.uid()
    );

    -- Skip pending seats as needed
    FOR i IN 1..v_seat_count LOOP
        SELECT status INTO v_player_status
        FROM public.match_players
        WHERE match_id = p_match_id AND seat_index = v_next_seat;

        IF v_player_status = 'joined' THEN
            EXIT;
        END IF;

        v_current_idx := 0;
        FOR j IN 0..v_seat_count-1 LOOP
            IF (v_active_seats->j)::int = v_next_seat THEN
                v_current_idx := j;
                EXIT;
            END IF;
        END LOOP;

        v_skipped_seat := v_next_seat;
        v_next_seat := (v_active_seats->((v_current_idx + 1) % v_seat_count))::int;
        v_new_version := v_new_version + 1;

        INSERT INTO public.match_events (match_id, seq, event_type, payload, actor_user_id)
        VALUES (
            p_match_id,
            v_new_version,
            'TURN_SKIPPED',
            jsonb_build_object('seat', v_skipped_seat, 'nextSeat', v_next_seat, 'reason', 'pending'),
            NULL
        );
    END LOOP;
    
    -- Update match state
    UPDATE public.matches
    SET 
        state = jsonb_set(
            jsonb_set(state, '{currentPlayerIndex}', to_jsonb(v_next_seat)),
            '{diceValue}', 'null'::jsonb
        ),
        version = v_new_version
    WHERE id = p_match_id;
    
    RETURN jsonb_build_object('success', true, 'nextSeat', v_next_seat, 'newVersion', v_new_version);
END;
$function$;

commit;
