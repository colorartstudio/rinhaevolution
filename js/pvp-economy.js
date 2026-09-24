/**
 * Preset econômico oficial da Rinha (PvP e leilão usam o mesmo rake por jogador).
 * Outros jogos: copie este arquivo e altere RAKE_PER_PLAYER; rede em referral-economy.js.
 */
export const RINHA_MATCH_ECONOMY = {
    /** Fração retida de cada aposta por jogador (15% = preset oficial). */
    RAKE_PER_PLAYER: 0.15,
    /** Do rake do jogador, quanto vai ao jackpot global. */
    JACKPOT_SHARE_OF_RAKE: 0.10
};

/** Pote = (1 - rake) de cada lado; vencedor leva os dois lados → 2 × potShare. */
export function derivedPvpFromRake(rake = RINHA_MATCH_ECONOMY.RAKE_PER_PLAYER) {
    const potShare = 1 - rake;
    return {
        RAKE: rake,
        POT_SHARE: potShare,
        WIN_PAYOUT: 2 * potShare,
        JACKPOT_OF_RAKE: RINHA_MATCH_ECONOMY.JACKPOT_SHARE_OF_RAKE
    };
}
