/**
 * Assinatura genética do laboratório.
 * Híbrido: um único especial, liberado na arena de qualquer um dos dois elementos.
 * Mesmo elemento: evolução com passiva curta, sem copiar um galo comum.
 * A recarga continua a do especial (2 rodadas) — quem usa zera a carga.
 */

const PAIR_ORDER = ['air', 'earth', 'fire', 'water'];

export function pairKey(a, b) {
    return [a, b].filter(Boolean).slice().sort((x, y) => PAIR_ORDER.indexOf(x) - PAIR_ORDER.indexOf(y)).join('_');
}

/** Multiplicadores na faixa do golpe forte, abaixo do especial puro (2–2,5x), porque abrem em duas arenas. */
export const FUSION_ABILITIES = {
    air_fire: {
        id: 'fire_hurricane',
        elements: ['fire', 'air'],
        nameKey: 'skill-fusion-hurricane-name',
        descKey: 'skill-fusion-hurricane-desc',
        tagKey: 'skill-tag-hurricane',
        multiplier: 1.65,
        sip: 4,
        veil: 'fire'
    },
    air_water: {
        id: 'storm',
        elements: ['water', 'air'],
        nameKey: 'skill-fusion-storm-name',
        descKey: 'skill-fusion-storm-desc',
        tagKey: 'skill-tag-storm',
        multiplier: 1.55,
        mist: true,
        shockPct: 0.04,
        veil: 'water'
    },
    air_earth: {
        id: 'sand_tornado',
        elements: ['earth', 'air'],
        nameKey: 'skill-fusion-sand-name',
        descKey: 'skill-fusion-sand-desc',
        tagKey: 'skill-tag-sand',
        multiplier: 1.55,
        mist: true,
        sip: 3,
        veil: 'earth'
    },
    earth_fire: {
        id: 'magma_eruption',
        elements: ['fire', 'earth'],
        nameKey: 'skill-fusion-magma-name',
        descKey: 'skill-fusion-magma-desc',
        tagKey: 'skill-tag-magma',
        multiplier: 1.7,
        burnPct: [0.04, 0.02],
        veil: 'fire'
    },
    earth_water: {
        id: 'mud_swamp',
        elements: ['water', 'earth'],
        nameKey: 'skill-fusion-mud-name',
        descKey: 'skill-fusion-mud-desc',
        tagKey: 'skill-tag-mud',
        multiplier: 1.45,
        mud: true,
        veil: 'earth'
    },
    fire_water: {
        id: 'steam_burst',
        elements: ['fire', 'water'],
        nameKey: 'skill-fusion-steam-name',
        descKey: 'skill-fusion-steam-desc',
        tagKey: 'skill-tag-steam',
        multiplier: 1.65,
        mist: true,
        veil: 'water'
    }
};

export const SAME_ELEMENT_FUSION = {
    fire: {
        id: 'primordial_fire',
        element: 'fire',
        nameKey: 'skill-evo-fire-name',
        descKey: 'skill-evo-fire-desc',
        passiveNameKey: 'skill-evo-fire-passive',
        passiveDescKey: 'skill-evo-fire-passive-desc',
        passive: 'brasa'
    },
    water: {
        id: 'abyssal_water',
        element: 'water',
        nameKey: 'skill-evo-water-name',
        descKey: 'skill-evo-water-desc',
        passiveNameKey: 'skill-evo-water-passive',
        passiveDescKey: 'skill-evo-water-passive-desc',
        passive: 'tide'
    },
    earth: {
        id: 'ancient_earth',
        element: 'earth',
        nameKey: 'skill-evo-earth-name',
        descKey: 'skill-evo-earth-desc',
        passiveNameKey: 'skill-evo-earth-passive',
        passiveDescKey: 'skill-evo-earth-passive-desc',
        passive: 'wall'
    },
    air: {
        id: 'celestial_air',
        element: 'air',
        nameKey: 'skill-evo-air-name',
        descKey: 'skill-evo-air-desc',
        passiveNameKey: 'skill-evo-air-passive',
        passiveDescKey: 'skill-evo-air-passive-desc',
        passive: 'wind'
    }
};

const FUSION_BY_ID = Object.fromEntries(Object.values(FUSION_ABILITIES).map(spec => [spec.id, spec]));

export function hybridSpec(element, secondary) {
    if (!element || !secondary || element === secondary) return null;
    return FUSION_ABILITIES[pairKey(element, secondary)] || null;
}

export function evolutionSpec(idOrElement) {
    if (!idOrElement) return null;
    if (SAME_ELEMENT_FUSION[idOrElement]) return SAME_ELEMENT_FUSION[idOrElement];
    return Object.values(SAME_ELEMENT_FUSION).find(spec => spec.id === idOrElement) || null;
}

/** Corpo e elemento herdado. Galo puro devolve só o corpo. */
export function mixParts(rooster) {
    const body = rooster?.element;
    if (!body) return [];
    const second = rooster.secondaryElement || rooster.dna?.secondaryElement;
    if (second && second !== body) return [body, second];
    if (rooster.forged || rooster.dna?.evolution) return [body, body];
    return [body];
}

export function describeFusion(elA, elB) {
    if (!elA || !elB) return null;
    if (elA === elB) {
        const spec = SAME_ELEMENT_FUSION[elA];
        return spec ? { kind: 'evolution', ...spec } : null;
    }
    const spec = hybridSpec(elA, elB);
    return spec ? { kind: 'hybrid', ...spec } : null;
}

/** Especial único do híbrido. arenaReq aceita os dois elementos; a carga é a do ultimate (2). */
export function buildFusionSkill(element, secondary, arenaId) {
    const spec = hybridSpec(element, secondary);
    if (!spec) return null;
    const arena = String(arenaId || '').toLowerCase();
    const open = spec.elements.includes(arena);
    return {
        id: spec.id,
        nameKey: spec.nameKey,
        descKey: spec.descKey,
        tagKey: spec.tagKey,
        level: 1,
        multiplier: spec.multiplier,
        cost: 0,
        type: 'ultimate',
        style: 'ultimate',
        fusionId: spec.id,
        effect: spec.burnPct ? 'burn' : 'fusion',
        burnPct: spec.burnPct,
        mist: spec.mist || false,
        mud: spec.mud || false,
        sip: spec.sip || 0,
        shockPct: spec.shockPct || 0,
        element: open ? arena : element,
        arenaReq: spec.elements.slice(),
        charge: 2,
        arenaLocked: !open,
        veil: spec.veil
    };
}

export function skillMatchesArena(skill, arenaId) {
    if (!skill?.arenaReq) return !skill?.type || skill.type !== 'ultimate';
    const reqs = Array.isArray(skill.arenaReq) ? skill.arenaReq : [skill.arenaReq];
    return reqs.map(req => String(req).toLowerCase()).includes(String(arenaId || '').toLowerCase());
}

/** Efeitos curtos depois do acerto. Quem chama aplica queimadura se effect === 'burn'. */
export function fusionFollowUp(skill, defender) {
    if (!skill?.fusionId || !defender) return;
    if (skill.mist) defender.mist = 1;
    if (skill.mud) defender.mud = 1;
}

export function fusionChip(skill, maxHp) {
    if (!skill?.shockPct || !maxHp) return 0;
    return Math.max(1, Math.round(maxHp * skill.shockPct));
}

const evoBag = new WeakMap();

function bag(rooster) {
    if (!rooster) return null;
    let state = evoBag.get(rooster);
    if (!state) {
        state = { cd: 0, heals: 0 };
        evoBag.set(rooster, state);
    }
    return state;
}

export function resetEvolution(rooster) {
    if (rooster) evoBag.delete(rooster);
}

export function tickEvolution(rooster) {
    const state = evoBag.get(rooster);
    if (state && state.cd > 0) state.cd -= 1;
}

export function tuneOutgoing(raw, attacker, strikeElement) {
    const spec = evolutionSpec(attacker?.dna?.evolution);
    if (!spec || spec.element !== strikeElement || raw <= 0) return raw;
    return Math.max(1, Math.round(raw * 1.06));
}

/** Resistência pequena e passivas que mexem neste golpe, com recarga. */
export function tuneIncoming(raw, defender, strikeElement, maxHp) {
    const spec = evolutionSpec(defender?.dna?.evolution);
    if (!spec || raw <= 0) return { damage: raw, note: null };
    let dmg = raw;
    if (spec.element === strikeElement) dmg = Math.round(dmg * 0.94);
    const state = bag(defender);
    const heavy = maxHp > 0 && dmg >= maxHp * 0.22;
    if (spec.passive === 'wall' && state.cd <= 0 && heavy) {
        dmg = Math.round(dmg * 0.88);
        state.cd = 3;
        return { damage: Math.max(1, dmg), note: spec.passiveNameKey };
    }
    if (spec.passive === 'wind' && state.cd <= 0 && Math.random() < 0.15) {
        dmg = Math.round(dmg * 0.6);
        state.cd = 2;
        return { damage: Math.max(1, dmg), note: spec.passiveNameKey };
    }
    return { damage: Math.max(1, dmg), note: null };
}

/**
 * Brasa Viva: brasas curtas no atacante depois de um golpe forte.
 * Maré Viva: no máximo 2 curas de 8% por luta.
 */
export function afterDamageTaken(defender, attackerStatus, dealt, maxHp) {
    const spec = evolutionSpec(defender?.dna?.evolution);
    if (!spec || dealt <= 0) return { heal: 0, note: null };
    const state = bag(defender);
    if (spec.passive === 'brasa' && state.cd <= 0 && maxHp > 0 && dealt >= maxHp * 0.18) {
        if (attackerStatus) {
            const ember = { flat: Math.max(1, Math.round(dealt * 0.08)) };
            attackerStatus.burnQueue = (attackerStatus.burnQueue || []).concat(ember);
        }
        state.cd = 3;
        return { heal: 0, note: spec.passiveNameKey };
    }
    if (spec.passive === 'tide' && state.heals < 2 && Math.random() < 0.2) {
        state.heals += 1;
        return { heal: Math.max(1, Math.round((maxHp || 0) * 0.08)), note: spec.passiveNameKey };
    }
    return { heal: 0, note: null };
}

export function sparkRatio(attacker) {
    return attacker?.dna?.evolution === 'primordial_fire' ? 0.26 : 0.2;
}
