import { state } from './state.js';
import { PVP } from './backend.js';
import { REFERRAL_MODEL, calcReferralCommissions, referralUILabelPercents } from './referral-economy.js';

export const ECONOMY_CONFIG = {
    RAKE_PERCENT: PVP.RAKE,
    JACKPOT_PERCENT_OF_RAKE: PVP.JACKPOT_OF_RAKE,
    WIN_PAYOUT: PVP.WIN_PAYOUT,
    POT_SHARE: PVP.POT_SHARE,
    CONVERSION_RATE: 100, // $1 = 100 RC
    WITHDRAW_FEE: 0.05,
    SWAP_FEE: 0,
    REFERRAL: REFERRAL_MODEL
};

export { calcReferralCommissions, referralUILabelPercents };

export class EconomyService {
    static calculateRake(amount) {
        return Math.floor(amount * ECONOMY_CONFIG.RAKE_PERCENT);
    }

    static processMatchEconomy(betAmount) {
        const rake = this.calculateRake(betAmount);
        const jackpotContribution = Math.floor(rake * ECONOMY_CONFIG.JACKPOT_PERCENT_OF_RAKE);
        const netPrize = Math.floor(betAmount * ECONOMY_CONFIG.WIN_PAYOUT);

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
