import { state } from './state.js';

export const ECONOMY_CONFIG = {
    RAKE_PERCENT: 0.10, // 10%
    JACKPOT_PERCENT_OF_RAKE: 0.10, // 10% of the 10% rake goes to jackpot
    CONVERSION_RATE: 100, // $1 = 100 RC
    REFERRAL_LEVELS: [0.05, 0.02, 0.01, 0.01, 0.01] // 5%, 2%, 1%, 1%, 1%
};

export class EconomyService {
    static calculateRake(amount) {
        return Math.floor(amount * ECONOMY_CONFIG.RAKE_PERCENT);
    }

    static processMatchEconomy(betAmount, winnerId) {
        const rake = this.calculateRake(betAmount);
        const jackpotContribution = Math.floor(rake * ECONOMY_CONFIG.JACKPOT_PERCENT_OF_RAKE);
        const netPrize = Math.floor(betAmount * 1.8);

        // Atualizar estado local
        state.gameData.economy.totalRake += rake;
        state.gameData.economy.jackpotPool += jackpotContribution;
        
        state.save();
        
        return {
            rake,
            jackpotContribution,
            netPrize
        };
    }

    static usdToRC(usdAmount) {
        return Math.floor(usdAmount * ECONOMY_CONFIG.CONVERSION_RATE);
    }

    static getJackpotShare(rank) {
        if (rank > 10) return 0;
        // Simple division for top 10: 10% of economy distributed among top 10
        // In a real scenario, this would be more complex
        return Math.floor(state.gameData.economy.jackpotPool / 10);
    }

    static claimTournamentJackpot() {
        const pool = state.gameData.economy.jackpotPool;
        state.gameData.balance += pool;
        state.gameData.economy.jackpotPool = 0;
        state.save();
        return pool;
    }
}
