import { supabase } from './supabase.js';

export class LeaderboardService {
    static async getTopPlayers(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username, balance, wins')
                .order('balance', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        } catch (err) {
            console.error("Leaderboard fetch error:", err);
            return [];
        }
    }
}
