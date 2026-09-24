import { RINHA_MATCH_ECONOMY } from './pvp-economy.js';

/**
 * Modelo de rede reutilizável entre jogos.
 * Cada partida gera rake por jogador (definido no PvP do jogo).
 * Uma fração do rake financia a cadeia de indicação; o restante fica para casa/jackpot/etc.
 */
export const REFERRAL_MODEL = {
    /** Fração do rake do jogador que entra no pote da rede (50% = metade do rake retido). */
    POOL_SHARE_OF_RAKE: 0.5,
    /** Pesos relativos do 1º ao 5º nível acima do jogador que apostou. */
    LEVEL_WEIGHTS: [5, 2, 1, 1, 1],
    MAX_LEVELS: 5
};

export function sumReferralWeights(weights = REFERRAL_MODEL.LEVEL_WEIGHTS) {
    return weights.reduce((a, b) => a + b, 0);
}

/** Pote da rede a partir do rake já calculado na liquidação do jogador. */
export function calcReferralPoolFromRake(rake) {
    const safe = Math.max(0, Math.floor(rake));
    return Math.floor(safe * REFERRAL_MODEL.POOL_SHARE_OF_RAKE);
}

/** RC por nível (índice 0 = indicador direto). */
export function calcReferralCommissions(rake, weights = REFERRAL_MODEL.LEVEL_WEIGHTS) {
    const pool = calcReferralPoolFromRake(rake);
    if (pool <= 0) return weights.map(() => 0);
    const sum = sumReferralWeights(weights);
    return weights.map(w => Math.floor((pool * w) / sum));
}

/** % efetivo do rake do jogador (para UI), ex.: 25 → 25% do rake. */
export function referralPercentOfRakeByLevel(levelIndex, weights = REFERRAL_MODEL.LEVEL_WEIGHTS) {
    const w = weights[levelIndex] ?? 0;
    const sum = sumReferralWeights(weights);
    if (!sum || !w) return 0;
    return (REFERRAL_MODEL.POOL_SHARE_OF_RAKE * w / sum) * 100;
}

export function referralUILabelPercents() {
    return REFERRAL_MODEL.LEVEL_WEIGHTS.map((_, i) => {
        const p = referralPercentOfRakeByLevel(i);
        return Math.round(p * 10) / 10;
    });
}

/**
 * Simulação para outro jogo: altere rakePercent (ex. 0.15) mantendo POOL_SHARE e pesos.
 */
export function previewReferralForBet(bet, rakePercent = RINHA_MATCH_ECONOMY.RAKE_PER_PLAYER) {
    const rake = Math.floor(Math.max(0, bet) * rakePercent);
    return {
        rake,
        referralPool: calcReferralPoolFromRake(rake),
        commissions: calcReferralCommissions(rake),
        houseShareOfRake: rake - calcReferralPoolFromRake(rake)
    };
}

/** Estimativa mensal por nível (vitória ou derrota do membro da rede; empate não conta). */
export function monthlyReferralByLevel({ bet, matchesPerMonth, rakePercent = RINHA_MATCH_ECONOMY.RAKE_PER_PLAYER }) {
    const rake = Math.floor(Math.max(0, bet) * rakePercent);
    const perMatch = calcReferralCommissions(rake);
    const m = Math.max(0, Math.floor(matchesPerMonth));
    const byLevel = perMatch.map(c => c * m);
    return {
        rakePerMatch: rake,
        perMatchByLevel: perMatch,
        monthlyByLevel: byLevel,
        monthlyTotalNetwork: byLevel.reduce((a, b) => a + b, 0)
    };
}
