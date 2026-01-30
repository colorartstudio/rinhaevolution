import { state } from './state.js';
import { ECONOMY_CONFIG } from './economy.js';

export class ReferralService {
    static generateCode() {
        if (!state.gameData.user) return null;
        if (state.gameData.referral.code) return state.gameData.referral.code;
        
        const prefix = state.gameData.user.name.substring(0, 3).toUpperCase();
        const random = Math.random().toString(36).substring(2, 7).toUpperCase();
        state.gameData.referral.code = `${prefix}-${random}`;
        
        // Sincronizar código com profile no Supabase
        this.syncCodeToSupabase(state.gameData.referral.code);
        
        state.save();
        return state.gameData.referral.code;
    }

    static async syncCodeToSupabase(code) {
        try {
            const { supabase } = await import('./supabase.js');
            await supabase.from('profiles').update({ referral_code: code }).eq('id', state.gameData.user.id);
        } catch (err) {
            console.warn("Referral code sync failed:", err);
        }
    }

    static getReferralLink() {
        const code = this.generateCode();
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('ref', code);
        return url.toString();
    }

    static async applyReferrer(code) {
        if (state.gameData.referral.referrer) return false;
        
        try {
            const { supabase } = await import('./supabase.js');
            
            // 1. Validar se o código existe e pegar o dono
            const { data: referrer, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('referral_code', code)
                .single();

            if (error || !referrer) throw new Error("Referral code not found");

            // 2. Salvar referrer no profile do usuário atual
            await supabase
                .from('profiles')
                .update({ referrer_id: referrer.id })
                .eq('id', state.gameData.user.id);

            // 3. Registrar na tabela de referrals (nível 1 direto)
            await supabase.from('referrals').insert({
                referrer_id: referrer.id,
                referred_id: state.gameData.user.id,
                level: 1
            });

            state.gameData.referral.referrer = code;
            state.save();
            return true;
        } catch (err) {
            console.error("Apply referrer error:", err);
            return false;
        }
    }

    static async trackEarning(amount, level) {
        if (level < 1 || level > 5) return;
        const percent = ECONOMY_CONFIG.REFERRAL_LEVELS[level - 1];
        const earning = Math.floor(amount * percent);
        
        state.gameData.referral.totalEarnings += earning;
        state.gameData.balance += earning;

        // Registrar no Supabase
        try {
            const { supabase } = await import('./supabase.js');
            await supabase.from('economy_transactions').insert({
                user_id: state.gameData.user.id,
                amount: earning,
                type: 'referral_reward',
                description: `Reward from level ${level}`
            });
        } catch (err) {
            console.warn("Referral earning sync failed:", err);
        }

        state.save();
        return earning;
    }

    static async getStats() {
        // No mundo real, buscaríamos do Supabase
        this.fetchStatsFromSupabase();
        return state.gameData.referral;
    }

    static async fetchStatsFromSupabase() {
        try {
            const { supabase } = await import('./supabase.js');
            const { data, error } = await supabase
                .from('referrals')
                .select('level')
                .eq('referrer_id', state.gameData.user.id);
            
            if (!error && data) {
                const counts = [0, 0, 0, 0, 0];
                data.forEach(r => counts[r.level-1]++);
                state.gameData.referral.networkCount = counts;
            }
        } catch (err) {
            console.warn("Referral stats fetch failed:", err);
        }
        return state.gameData.referral;
    }
}
