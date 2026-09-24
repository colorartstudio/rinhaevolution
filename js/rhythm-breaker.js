/**
 * Barra de Ritmo — desempate em força espelhada (1v1).
 * Ativa só quando: mesmo elemento, cor sem vantagem de nenhum lado, cores diferentes.
 * Não altera o empate forçado (elemento + cor idênticos).
 */

export const RHYTHM_BREAKER_ID = 'rhythm-break';

export const RHYTHM = {
    MAX: 100,
    /** Ganho por ação ofensiva concluída (~4 turnos para encher). */
    ACTION_GAIN: 26,
    /** Bônus extra ao acertar com ultimate de arena. */
    ULT_BONUS: 10,
    /** Usar poção de cura: perde ritmo e cede vantagem ao rival. */
    HEAL_ITEM_PENALTY: 38,
    HEAL_ITEM_FOE_GAIN: 14
};

/** Golpe único de desempate — mais forte que o especial de arena. */
export const RHYTHM_BREAKER_SKILL = {
    id: RHYTHM_BREAKER_ID,
    nameKey: 'skill-rhythm-break-name',
    descKey: 'skill-rhythm-break-desc',
    level: 1,
    multiplier: 2.8,
    cost: 0,
    type: 'rhythm',
    hits: 1
};

const COLOR_BEATS = {
    red: 'blue',
    blue: 'green',
    green: 'yellow',
    yellow: 'red'
};

function colorAdvantage(attackerColor, defenderColor) {
    return COLOR_BEATS[attackerColor] === defenderColor;
}

/**
 * Força espelhada: mesmo elemento, nenhuma cor anula a outra, não é clone total.
 * Clone total (isIdentical) continua no empate forçado — fora deste sistema.
 */
export function isMirroredForceMatch(player, cpu) {
    if (!player || !cpu) return false;
    if (player.element !== cpu.element) return false;
    if (player.color === cpu.color) return false;
    if (colorAdvantage(player.color, cpu.color)) return false;
    if (colorAdvantage(cpu.color, player.color)) return false;
    // Mesmo elemento: atk oficial = base do elemento + 2×nível (REGRA).
    const pLvl = Math.max(1, player.level || 1);
    const cLvl = Math.max(1, cpu.level || 1);
    if (pLvl !== cLvl) return false;
    return true;
}

export function createRhythmState() {
    return {
        active: true,
        player: 0,
        cpu: 0,
        playerReady: false,
        cpuReady: false
    };
}

function clamp(n, max = RHYTHM.MAX) {
    return Math.max(0, Math.min(max, Math.round(n)));
}

function syncReady(state, side) {
    if (side === 'player') {
        state.playerReady = state.player >= RHYTHM.MAX;
        if (state.playerReady) state.player = RHYTHM.MAX;
    } else {
        state.cpuReady = state.cpu >= RHYTHM.MAX;
        if (state.cpuReady) state.cpu = RHYTHM.MAX;
    }
}

/** Após golpe ofensivo (skill). Não chama para item. */
export function applyRhythmAfterAction(state, side, { usedUlt = false, usedBreaker = false } = {}) {
    if (!state?.active || usedBreaker) return state;
    if (side === 'player' && state.playerReady) return state;
    if (side === 'cpu' && state.cpuReady) return state;

    const gain = RHYTHM.ACTION_GAIN + (usedUlt ? RHYTHM.ULT_BONUS : 0);
    if (side === 'player') {
        state.player = clamp(state.player + gain);
        syncReady(state, 'player');
    } else {
        state.cpu = clamp(state.cpu + gain);
        syncReady(state, 'cpu');
    }
    return state;
}

/** Poção de cura = atalho arriscado: perde ritmo e alimenta o rival. */
export function applyRhythmHealItemPenalty(state, side) {
    if (!state?.active) return state;
    if (side === 'player') {
        state.player = clamp(state.player - RHYTHM.HEAL_ITEM_PENALTY);
        state.cpu = clamp(state.cpu + RHYTHM.HEAL_ITEM_FOE_GAIN);
        syncReady(state, 'player');
        syncReady(state, 'cpu');
    } else {
        state.cpu = clamp(state.cpu - RHYTHM.HEAL_ITEM_PENALTY);
        state.player = clamp(state.player + RHYTHM.HEAL_ITEM_FOE_GAIN);
        syncReady(state, 'player');
        syncReady(state, 'cpu');
    }
    return state;
}

export function isRhythmBreakerReady(state, side) {
    if (!state?.active) return false;
    return side === 'player' ? !!state.playerReady : !!state.cpuReady;
}

export function consumeRhythmBreaker(state, side) {
    if (!state?.active) return false;
    if (!isRhythmBreakerReady(state, side)) return false;
    if (side === 'player') {
        state.player = 0;
        state.playerReady = false;
    } else {
        state.cpu = 0;
        state.cpuReady = false;
    }
    return true;
}

export function getRhythmBreakerSkill() {
    return { ...RHYTHM_BREAKER_SKILL };
}

export function renderRhythmUI(state) {
    const wrap = document.getElementById('rhythm-bar-wrap');
    if (!wrap) return;
    if (!state?.active) {
        wrap.classList.add('hidden');
        return;
    }
    wrap.classList.remove('hidden');
    const pFill = document.getElementById('rhythm-p-fill');
    const cFill = document.getElementById('rhythm-c-fill');
    const pPct = document.getElementById('rhythm-p-pct');
    const cPct = document.getElementById('rhythm-c-pct');
    const label = document.getElementById('rhythm-label');
    if (pFill) {
        pFill.style.width = `${state.player}%`;
        pFill.classList.toggle('rhythm-ready', state.playerReady);
    }
    if (cFill) {
        cFill.style.width = `${state.cpu}%`;
        cFill.classList.toggle('rhythm-ready', state.cpuReady);
    }
    if (pPct) pPct.textContent = state.playerReady ? 'PRONTO' : `${state.player}%`;
    if (cPct) cPct.textContent = state.cpuReady ? 'PRONTO' : `${state.cpu}%`;
    if (label) {
        label.textContent = state.playerReady || state.cpuReady
            ? 'RITMO CHEIO — Golpe de Desempate liberado'
            : 'RITMO — força espelhada: encha a barra para desempatar';
    }
}

export function hideRhythmUI() {
    const wrap = document.getElementById('rhythm-bar-wrap');
    if (wrap) wrap.classList.add('hidden');
}
