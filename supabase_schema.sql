-- RINHA EVOLUTION - DATABASE SCHEMA
-- Execute este script no SQL Editor do seu Dashboard Supabase

-- 1. PERFIS (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    balance BIGINT DEFAULT 1000 CHECK (balance >= 0),
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{"mute": false, "lang": "pt-BR"}'::jsonb,
    referral_code TEXT UNIQUE,
    referrer_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS no Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas Profiles (Idempotentes)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. GALOS (roosters)
CREATE TABLE IF NOT EXISTS public.roosters (
    id TEXT PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    element TEXT NOT NULL CHECK (element IN ('fire', 'earth', 'water', 'air')),
    color TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    dna TEXT NOT NULL,
    hp_max INTEGER NOT NULL,
    hp_current INTEGER NOT NULL DEFAULT 100,
    atk_base INTEGER NOT NULL,
    price INTEGER,
    in_team BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.roosters ENABLE ROW LEVEL SECURITY;

-- Políticas Roosters (Idempotentes)
DROP POLICY IF EXISTS "Roosters are viewable by everyone" ON public.roosters;
CREATE POLICY "Roosters are viewable by everyone" ON public.roosters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own roosters" ON public.roosters;
CREATE POLICY "Users can manage own roosters" ON public.roosters FOR ALL USING (auth.uid() = owner_id);

-- 3. PARTIDAS (matches)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES public.profiles(id),
    winner_id UUID, -- NULL se for CPU
    bet_amount INTEGER NOT NULL,
    rake_amount INTEGER NOT NULL,
    jackpot_contribution INTEGER NOT NULL,
    player_team JSONB NOT NULL,
    opponent_team JSONB NOT NULL,
    result_logs JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Políticas Matches (Idempotentes)
DROP POLICY IF EXISTS "Matches viewable by everyone" ON public.matches;
CREATE POLICY "Matches viewable by everyone" ON public.matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own matches" ON public.matches;
CREATE POLICY "Users can insert own matches" ON public.matches FOR INSERT WITH CHECK (auth.uid() = player_id);

-- 4. ECONOMIA (economy_stats)
CREATE TABLE IF NOT EXISTS public.economy_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_rake BIGINT DEFAULT 0,
    jackpot_pool BIGINT DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir registro único de economia se não existir
INSERT INTO public.economy_stats (id, total_rake, jackpot_pool) 
VALUES (1, 0, 0) 
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.economy_stats ENABLE ROW LEVEL SECURITY;

-- Políticas Economy Stats (Idempotentes)
DROP POLICY IF EXISTS "Economy stats viewable by everyone" ON public.economy_stats;
CREATE POLICY "Economy stats viewable by everyone" ON public.economy_stats FOR SELECT USING (true);

-- 5. INDICAÇÕES (referrals)
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES public.profiles(id),
    referred_id UUID REFERENCES public.profiles(id) UNIQUE,
    level INTEGER CHECK (level BETWEEN 1 AND 5),
    total_commission_earned BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Políticas Referrals (Idempotentes)
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "Users can insert own referral connection" ON public.referrals;
CREATE POLICY "Users can insert own referral connection" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);

-- 6. TRANSAÇÕES DE ECONOMIA (economy_transactions)
CREATE TABLE IF NOT EXISTS public.economy_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    amount BIGINT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.economy_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas Economy Transactions (Idempotentes)
DROP POLICY IF EXISTS "Users can view own transactions" ON public.economy_transactions;
CREATE POLICY "Users can view own transactions" ON public.economy_transactions FOR SELECT USING (auth.uid() = user_id);

-- TRIGGER PARA CRIAR PROFILE AUTOMATICAMENTE NO SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, referral_code)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 
    NEW.email,
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Idempotente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FUNÇÃO RPC PARA ATUALIZAR ECONOMIA COM SEGURANÇA
CREATE OR REPLACE FUNCTION public.increment_economy(rake_inc BIGINT, jackpot_inc BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.economy_stats
  SET total_rake = total_rake + rake_inc,
      jackpot_pool = jackpot_pool + jackpot_inc,
      last_updated = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNÇÃO RPC PARA PROCESSAR RESULTADO DE PARTIDA ATOMICAMENTE
CREATE OR REPLACE FUNCTION public.process_match_result(
    p_player_id UUID,
    p_winner_id UUID,
    p_bet_amount INTEGER,
    p_rake_amount INTEGER,
    p_jackpot_amount INTEGER,
    p_player_team JSONB,
    p_opponent_team JSONB,
    p_result_logs JSONB,
    p_balance_change BIGINT,
    p_is_win BOOLEAN,
    p_is_loss BOOLEAN
)
RETURNS void AS $$
BEGIN
    -- 1. Inserir registro da partida
    INSERT INTO public.matches (
        player_id, winner_id, bet_amount, rake_amount, jackpot_contribution, 
        player_team, opponent_team, result_logs
    ) VALUES (
        p_player_id, p_winner_id, p_bet_amount, p_rake_amount, p_jackpot_amount, 
        p_player_team, p_opponent_team, p_result_logs
    );

    -- 2. Atualizar profile do jogador (saldo e stats)
    UPDATE public.profiles
    SET balance = balance + p_balance_change,
        wins = wins + (CASE WHEN p_is_win THEN 1 ELSE 0 END),
        losses = losses + (CASE WHEN p_is_loss THEN 1 ELSE 0 END),
        updated_at = NOW()
    WHERE id = p_player_id;

    -- 3. Atualizar economia global
    PERFORM public.increment_economy(p_rake_amount::BIGINT, p_jackpot_amount::BIGINT);

    -- 4. Registrar transação financeira
    INSERT INTO public.economy_transactions (user_id, amount, type, description)
    VALUES (
        p_player_id, 
        p_balance_change, 
        CASE WHEN p_is_win THEN 'match_win' WHEN p_is_loss THEN 'match_loss' ELSE 'match_draw' END,
        'Match result update'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNÇÃO RPC PARA PROCESSAR BATALHA EVOLUTION (RNG NO SERVIDOR)
-- Esta função centraliza a lógica de sorteio e cálculo para evitar fraudes.
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
    IF p_element = v_arena THEN
        v_player_score := round(v_player_score * 1.25);
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
    IF v_cpu_element = v_arena THEN
        v_cpu_score := round(v_cpu_score * 1.25);
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
