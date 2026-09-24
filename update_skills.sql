-- ATUALIZAÇÃO DA LÓGICA DE BATALHA (SUPABASE RPC)
-- Objetivo: Refletir o impacto das novas Skills de Arena (Ultimate) no cálculo do resultado.
-- Se o elemento do galo coincidir com a arena, o bônus sobe de 25% para 40% para representar o "Poder da Arena".

CREATE OR REPLACE FUNCTION public.process_evolution_battle(
    p_player_id UUID,
    p_element TEXT,
    p_color TEXT,
    p_bet_amount INTEGER,
    p_game_mode TEXT DEFAULT '1v1'
)
RETURNS JSONB AS $$
DECLARE
    v_balance BIGINT;
    v_cpu_element TEXT;
    v_cpu_color TEXT;
    v_arena TEXT;
    v_player_score INTEGER;
    v_cpu_score INTEGER;
    v_result TEXT;
    v_payout INTEGER;
    v_profit INTEGER;
    v_new_balance BIGINT;
    v_match_id UUID;
    v_cpu_team JSONB := '[]'::jsonb;
    v_player_hp_factor FLOAT := 1.0;
    v_base_strengths JSONB := '{"fire": 100, "earth": 95, "water": 90, "air": 85}'::jsonb;
    v_elements TEXT[] := ARRAY['fire', 'earth', 'water', 'air'];
    v_colors TEXT[] := ARRAY['red', 'blue', 'green', 'yellow'];
    v_arenas TEXT[] := ARRAY['fire', 'earth', 'water', 'air'];
BEGIN
    -- 1. Verificar saldo (Bloqueio para evitar race conditions)
    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_player_id FOR UPDATE;
    IF v_balance < p_bet_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente';
    END IF;

    -- 2. Debitar aposta imediatamente
    UPDATE public.profiles SET balance = balance - p_bet_amount WHERE id = p_player_id;

    -- 2.1 Buscar HP atual do galo principal (ou líder do time) para influenciar o resultado
    IF p_game_mode = '3v3' THEN
        -- No 3v3, pegamos a média de HP do time ativo
        SELECT COALESCE(AVG(hp_current::FLOAT / hp_max::FLOAT), 1.0) INTO v_player_hp_factor 
        FROM public.roosters 
        WHERE owner_id = p_player_id AND in_team = TRUE;
    ELSE
        -- No 1v1, pegamos o HP do galo que condiz com o elemento/cor
        SELECT COALESCE(hp_current::FLOAT / hp_max::FLOAT, 1.0) INTO v_player_hp_factor 
        FROM public.roosters 
        WHERE owner_id = p_player_id AND element = p_element AND color = p_color
        LIMIT 1;
    END IF;

    -- 3. Gerar Arena RNG
    v_arena := v_arenas[floor(random() * 4 + 1)];

    -- 4. Gerar CPU(s) conforme o modo
    IF p_game_mode = '3v3' THEN
        FOR i IN 1..3 LOOP
            DECLARE
                v_el TEXT := v_elements[floor(random() * 4 + 1)];
                v_col TEXT := v_colors[floor(random() * 4 + 1)];
                v_atk INTEGER := (v_base_strengths->>v_el)::INTEGER + 2;
            BEGIN
                v_cpu_team := v_cpu_team || jsonb_build_object(
                    'element', v_el, 
                    'color', v_col, 
                    'level', 1, 
                    'atk', v_atk, 
                    'energy_max', 100
                );
                -- No 3v3, o score base é a soma ou média. Para o MVP, usamos o primeiro como líder de stats.
                IF i = 1 THEN
                    v_cpu_element := v_el;
                    v_cpu_color := v_col;
                END IF;
            END;
        END LOOP;
    ELSE
        v_cpu_element := v_elements[floor(random() * 4 + 1)];
        v_cpu_color := v_colors[floor(random() * 4 + 1)];
        v_cpu_team := jsonb_build_array(jsonb_build_object(
            'element', v_cpu_element, 
            'color', v_cpu_color, 
            'level', 1, 
            'atk', (v_base_strengths->>v_cpu_element)::INTEGER + 2, 
            'energy_max', 100
        ));
    END IF;

    -- 5. Cálculo de Pontuação (Regras de Negócio)
    -- Jogador
    v_player_score := round((v_base_strengths->>p_element)::INTEGER * v_player_hp_factor);
    
    -- Lógica de Arena (Bônus Elemental) - ATUALIZADO PARA REFLETIR NOVA SKILL DE ARENA
    IF p_element = v_arena THEN
        -- Bônus aumentado de 1.25 para 1.40 (40%) devido ao desbloqueio da Skill de Arena
        v_player_score := round(v_player_score * 1.40);
    END IF;
    
    -- Lógica de Counter de Cor (Vermelho > Azul > Verde > Amarelo > Vermelho)
    IF (p_color = 'red' AND v_cpu_color = 'blue') OR
       (p_color = 'blue' AND v_cpu_color = 'green') OR
       (p_color = 'green' AND v_cpu_color = 'yellow') OR
       (p_color = 'yellow' AND v_cpu_color = 'red') THEN
        v_player_score := round(v_player_score * 1.30);
    END IF;

    -- CPU
    v_cpu_score := (v_base_strengths->>v_cpu_element)::INTEGER;
    
    -- CPU também ganha bônus de arena se tiver o elemento certo
    IF v_cpu_element = v_arena THEN
        v_cpu_score := round(v_cpu_score * 1.40);
    END IF;
    
    IF (v_cpu_color = 'red' AND p_color = 'blue') OR
       (v_cpu_color = 'blue' AND p_color = 'green') OR
       (v_cpu_color = 'green' AND p_color = 'yellow') OR
       (v_cpu_color = 'yellow' AND p_color = 'red') THEN
        v_cpu_score := round(v_cpu_score * 1.30);
    END IF;

    -- 6. Determinar Vencedor e Payout (Economia GaloCoin)
    IF v_player_score > v_cpu_score THEN
        v_result := 'WIN';
        v_payout := floor(p_bet_amount * 1.8);
    ELSIF v_cpu_score > v_player_score THEN
        v_result := 'LOSS';
        v_payout := 0;
    ELSE
        v_result := 'DRAW';
        v_payout := p_bet_amount;
    END IF;

    v_profit := v_payout - p_bet_amount;

    -- 7. Atualizar Saldo e Estatísticas
    UPDATE public.profiles
    SET balance = balance + v_payout,
        wins = wins + (CASE WHEN v_result = 'WIN' THEN 1 ELSE 0 END),
        losses = losses + (CASE WHEN v_result = 'LOSS' THEN 1 ELSE 0 END),
        updated_at = NOW()
    WHERE id = p_player_id
    RETURNING balance INTO v_new_balance;

    -- 8. Registrar Partida na Tabela Matches
    INSERT INTO public.matches (
        player_id, winner_id, bet_amount, rake_amount, jackpot_contribution,
        player_team, opponent_team, result_logs
    ) VALUES (
        p_player_id, 
        (CASE WHEN v_result = 'WIN' THEN p_player_id ELSE NULL END),
        p_bet_amount,
        (p_bet_amount * 0.1)::INTEGER, -- 10% Rake implícito
        0,
        jsonb_build_object('element', p_element, 'color', p_color, 'score', v_player_score),
        v_cpu_team,
        jsonb_build_object('arena', v_arena, 'result', v_result, 'payout', v_payout, 'profit', v_profit, 'mode', p_game_mode)
    ) RETURNING id INTO v_match_id;

    -- 9. Registrar Transação Financeira
    INSERT INTO public.economy_transactions (user_id, amount, type, description)
    VALUES (p_player_id, v_profit, 'evolution_battle', 'Resultado da Rinha Evolution (Processamento Seguro)');

    -- 10. Retornar Objeto JSON para o Frontend
    RETURN jsonb_build_object(
        'matchId', v_match_id,
        'arena', v_arena,
        'cpu', jsonb_build_object('element', v_cpu_element, 'color', v_cpu_color),
        'cpuTeam', v_cpu_team,
        'scores', jsonb_build_object('player', v_player_score, 'cpu', v_cpu_score),
        'result', v_result,
        'financial', jsonb_build_object(
            'bet', p_bet_amount,
            'payout', v_payout,
            'profit', v_profit,
            'newBalance', v_new_balance
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
