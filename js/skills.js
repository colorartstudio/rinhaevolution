import { buildFusionSkill, skillMatchesArena } from './fusion-abilities.js';

/** Cura base do Dilúvio (% do HP máx.). Cada uso na luta multiplica por WATER_ARENA_HEAL_DECAY. */
export const WATER_ARENA_HEAL_BASE = 30;
/** 0.70 = −30% sobre a recuperação a cada especial de água na mesma luta (30 → 21 → 14,7 …). */
export const WATER_ARENA_HEAL_DECAY = 0.70;

/** Multiplicador inicial da Tempestade do Pico (especial de arena do Ar). */
export const AIR_ARENA_MULT_BASE = 2.0;
/** 0.80 = −20% por acerto da tempestade (2 → 1,6 → 1,28 → …). */
export const AIR_ARENA_MULT_DECAY = 0.80;
/** Piso do multiplicador por acerto da tempestade. */
export const AIR_ARENA_MULT_FLOOR = 1.0;

/** % de cura do Dilúvio para o N-ésimo uso (0 = primeiro). */
export function waterArenaHealPercent(usesSoFar = 0) {
    const n = Math.max(0, Math.floor(usesSoFar) || 0);
    return WATER_ARENA_HEAL_BASE * Math.pow(WATER_ARENA_HEAL_DECAY, n);
}

/** Multiplicador do N-ésimo acerto da Tempestade (0 = primeiro). */
export function airArenaHitMultiplier(hitIndex = 0) {
    const n = Math.max(0, Math.floor(hitIndex) || 0);
    return Math.max(
        AIR_ARENA_MULT_FLOOR,
        AIR_ARENA_MULT_BASE * Math.pow(AIR_ARENA_MULT_DECAY, n)
    );
}

/** Multiplicador efetivo de um hit (decai só no especial de arena do Ar). */
export function skillHitMultiplier(skill, hitIndex = 0) {
    if (skill?.id === 'a-arena') return airArenaHitMultiplier(hitIndex);
    return skill?.multiplier ?? 1;
}

/**
 * Cura de skill em HP. Só o especial de arena da água decai por uso na luta.
 * Incrementa rooster.waterSpecialHeals ao aplicar o Dilúvio.
 */
export function applySkillHealAmount(skill, maxHp, rooster = null) {
    let pct = skill?.value || 0;
    if (skill?.id === 'w-arena' && skill?.effect === 'heal') {
        const uses = rooster?.waterSpecialHeals || 0;
        pct = waterArenaHealPercent(uses);
        if (rooster) rooster.waterSpecialHeals = uses + 1;
    }
    return Math.max(0, Math.round((maxHp || 0) * (pct / 100)));
}

export const SKILLS = {
    fire: [
        { id: 'f1', nameKey: 'skill-f1-name', level: 1, multiplier: 1.0, cost: 0, type: 'attack', style: 'peck', tagKey: 'skill-tag-basic', descKey: 'skill-f1-desc' },
        { id: 'f5', nameKey: 'skill-f5-name', level: 5, multiplier: 1.2, cost: 30, type: 'technique', style: 'comet', effect: 'ember', tagKey: 'skill-tag-ember', descKey: 'skill-f5-desc' },
        { id: 'f10', nameKey: 'skill-f10-name', level: 10, multiplier: 2.0, cost: 60, type: 'special', style: 'phoenix', effect: 'heal', value: 20, tagKey: 'skill-tag-heal20', descKey: 'skill-f10-desc' },
        { id: 'f-arena', nameKey: 'skill-f-arena-name', level: 1, multiplier: 2.5, cost: 0, type: 'ultimate', style: 'ultimate', effect: 'burn', burnPct: [0.08, 0.03], descKey: 'skill-f-arena-desc', arenaReq: 'fire', charge: 2 }
    ],
    water: [
        { id: 'w1', nameKey: 'skill-w1-name', level: 1, multiplier: 1.0, cost: 0, type: 'attack', style: 'peck', tagKey: 'skill-tag-basic', descKey: 'skill-w1-desc' },
        { id: 'w5', nameKey: 'skill-w5-name', level: 5, multiplier: 0.55, cost: 25, type: 'technique', style: 'shell', effect: 'shield', value: 0.5, tagKey: 'skill-tag-shell', descKey: 'skill-w5-desc' },
        { id: 'w10', nameKey: 'skill-w10-name', level: 10, multiplier: 1.35, cost: 55, type: 'technique', style: 'wave', effect: 'drench', duration: 2, splash: 0.4, tagKey: 'skill-tag-wave', descKey: 'skill-w10-desc' },
        { id: 'w-arena', nameKey: 'skill-w-arena-name', level: 1, multiplier: 2.2, cost: 0, type: 'ultimate', style: 'ultimate', effect: 'heal', value: WATER_ARENA_HEAL_BASE, descKey: 'skill-w-arena-desc', arenaReq: 'water', charge: 2 }
    ],
    earth: [
        { id: 'e1', nameKey: 'skill-e1-name', level: 1, multiplier: 1.0, cost: 0, type: 'attack', style: 'peck', tagKey: 'skill-tag-basic', descKey: 'skill-e1-desc' },
        { id: 'e5', nameKey: 'skill-e5-name', level: 5, multiplier: 0.65, cost: 20, type: 'technique', style: 'brace', effect: 'def', value: 1.5, duration: 2, pierce: true, tagKey: 'skill-tag-brace', descKey: 'skill-e5-desc' },
        { id: 'e10', nameKey: 'skill-e10-name', level: 10, multiplier: 1.35, cost: 50, type: 'technique', style: 'quake', effect: 'stun', chance: 0.35, pierce: true, tagKey: 'skill-tag-quake', descKey: 'skill-e10-desc' },
        { id: 'e-arena', nameKey: 'skill-e-arena-name', level: 1, multiplier: 2.4, cost: 0, type: 'ultimate', style: 'ultimate', effect: 'def', value: 2, duration: 2, descKey: 'skill-e-arena-desc', arenaReq: 'earth', charge: 2 }
    ],
    air: [
        { id: 'a1', nameKey: 'skill-a1-name', level: 1, multiplier: 1.0, cost: 0, type: 'attack', style: 'peck', tagKey: 'skill-tag-basic', descKey: 'skill-a1-desc' },
        { id: 'a5', nameKey: 'skill-a5-name', level: 5, multiplier: 0.7, cost: 25, type: 'technique', style: 'dive', effect: 'dodge', chance: 0.45, pierce: true, tagKey: 'skill-tag-dive', descKey: 'skill-a5-desc' },
        { id: 'a10', nameKey: 'skill-a10-name', level: 10, multiplier: 0.52, cost: 50, type: 'technique', style: 'flurry', hits: 3, effect: 'gust', gust: 8, tagKey: 'skill-tag-flurry', descKey: 'skill-a10-desc' },
        { id: 'a-arena', nameKey: 'skill-a-arena-name', level: 1, multiplier: AIR_ARENA_MULT_BASE, cost: 0, type: 'ultimate', style: 'ultimate', hits: 5, descKey: 'skill-a-arena-desc', arenaReq: 'air', charge: 2 }
    ]
};

/** Básico do galo forjado: cada elemento deixa um rastro curto, diferente do básico puro e do especial. */
const FORGED_BASIC = {
    fire: { effect: 'spark', tagKey: 'skill-tag-spark', style: 'comet', forgedBasic: true },
    water: { effect: 'mist', tagKey: 'skill-tag-mist', style: 'wave', forgedBasic: true },
    earth: { effect: 'grit', tagKey: 'skill-tag-grit', style: 'brace', forgedBasic: true },
    air: { effect: 'sip', tagKey: 'skill-tag-sip', style: 'dive', forgedBasic: true }
};

function stampForgedBasic(skill, element) {
    if (skill?.type !== 'attack' || (skill.cost || 0) > 0) return skill;
    const mark = FORGED_BASIC[element];
    if (!mark) return skill;
    return {
        ...skill,
        ...mark,
        tagKey: 'skill-tag-basic',
        trailTagKey: mark.tagKey
    };
}

export class SkillService {
    static getSkillsForRooster(element, level, arenaId = null, secondaryElement = null) {
        if (!SKILLS[element]) {
            console.error(`SkillService: Elemento inválido '${element}'`);
            return [];
        }

        const safeArenaId = arenaId ? String(arenaId).toLowerCase() : null;
        const mapSkills = (list, el, dual) => list.filter(s => {
            if (dual) return s.type === 'attack';
            return s.level <= level;
        }).map(s => ({
            ...s,
            element: el,
            dual,
            arenaLocked: s.type === 'ultimate' && !skillMatchesArena(s, safeArenaId)
        }));

        const primary = mapSkills(SKILLS[element], element, false);
        if (!secondaryElement || secondaryElement === element || !SKILLS[secondaryElement]) return primary;
        const forgedPrimary = primary
            .filter(s => s.type !== 'ultimate')
            .map(s => stampForgedBasic(s, element));
        const forgedSecond = mapSkills(SKILLS[secondaryElement], secondaryElement, true)
            .map(s => stampForgedBasic(s, secondaryElement));
        const fusion = buildFusionSkill(element, secondaryElement, safeArenaId);
        return forgedPrimary.concat(forgedSecond, fusion ? [fusion] : []);
    }

    static calculateDamage(baseAtk, skillMultiplier, level) {
        // Factor level into damage for better scaling
        return Math.round((baseAtk * skillMultiplier) * (1 + (level * 0.05)));
    }
}
