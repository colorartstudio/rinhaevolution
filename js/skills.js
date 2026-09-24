export const SKILLS = {
    fire: [
        { id: 'f1', nameKey: 'skill-f1-name', level: 1, multiplier: 1.0, cost: 0, type: 'attack', descKey: 'skill-f1-desc' },
        { id: 'f5', nameKey: 'skill-f5-name', level: 5, multiplier: 1.4, cost: 30, type: 'attack', effect: 'burn', chance: 0.3, descKey: 'skill-f5-desc' },
        { id: 'f10', nameKey: 'skill-f10-name', level: 10, multiplier: 2.0, cost: 60, type: 'special', effect: 'heal', value: 20, descKey: 'skill-f10-desc' },
        { id: 'f-arena', nameKey: 'skill-f-arena-name', level: 1, multiplier: 2.5, cost: 0, type: 'ultimate', effect: 'burn', burnPct: [0.08, 0.03], descKey: 'skill-f-arena-desc', arenaReq: 'fire', charge: 2 }
    ],
    water: [
        { id: 'w1', nameKey: 'skill-w1-name', level: 1, multiplier: 1.0, cost: 0, type: 'attack', descKey: 'skill-w1-desc' },
        { id: 'w5', nameKey: 'skill-w5-name', level: 5, multiplier: 0.8, cost: 25, type: 'buff', effect: 'shield', value: 0.5, duration: 1, descKey: 'skill-w5-desc' },
        { id: 'w10', nameKey: 'skill-w10-name', level: 10, multiplier: 1.8, cost: 55, type: 'attack', effect: 'aoe', descKey: 'skill-w10-desc' },
        { id: 'w-arena', nameKey: 'skill-w-arena-name', level: 1, multiplier: 2.2, cost: 0, type: 'ultimate', effect: 'heal', value: 30, descKey: 'skill-w-arena-desc', arenaReq: 'water', charge: 2 }
    ],
    earth: [
        { id: 'e1', nameKey: 'skill-e1-name', level: 1, multiplier: 1.0, cost: 0, type: 'attack', descKey: 'skill-e1-desc' },
        { id: 'e5', nameKey: 'skill-e5-name', level: 5, multiplier: 0.7, cost: 20, type: 'buff', effect: 'def', value: 1.5, duration: 2, descKey: 'skill-e5-desc' },
        { id: 'e10', nameKey: 'skill-e10-name', level: 10, multiplier: 1.6, cost: 50, type: 'attack', effect: 'stun', chance: 0.2, descKey: 'skill-e10-desc' },
        { id: 'e-arena', nameKey: 'skill-e-arena-name', level: 1, multiplier: 2.4, cost: 0, type: 'ultimate', effect: 'def', value: 2, duration: 2, descKey: 'skill-e-arena-desc', arenaReq: 'earth', charge: 2 }
    ],
    air: [
        { id: 'a1', nameKey: 'skill-a1-name', level: 1, multiplier: 1.0, cost: 0, type: 'attack', descKey: 'skill-a1-desc' },
        { id: 'a5', nameKey: 'skill-a5-name', level: 5, multiplier: 0.5, cost: 25, type: 'buff', effect: 'dodge', chance: 0.4, duration: 1, descKey: 'skill-a5-desc' },
        { id: 'a10', nameKey: 'skill-a10-name', level: 10, multiplier: 0.6, cost: 50, hits: 3, descKey: 'skill-a10-desc' },
        { id: 'a-arena', nameKey: 'skill-a-arena-name', level: 1, multiplier: 2.3, cost: 0, type: 'ultimate', hits: 5, descKey: 'skill-a-arena-desc', arenaReq: 'air', charge: 2 }
    ]
};

export class SkillService {
    static getSkillsForRooster(element, level, arenaId = null) {
        if (!SKILLS[element]) {
            console.error(`SkillService: Elemento inválido '${element}'`);
            return [];
        }
        
        // Normalização para evitar erros de case/tipo
        const safeArenaId = arenaId ? String(arenaId).toLowerCase() : null;

        return SKILLS[element].filter(s => s.level <= level).map(s => ({
            ...s,
            arenaLocked: Boolean(s.arenaReq && String(s.arenaReq).toLowerCase() !== (arenaId ? String(arenaId).toLowerCase() : ''))
        }));
    }

    static calculateDamage(baseAtk, skillMultiplier, level) {
        // Factor level into damage for better scaling
        return Math.round((baseAtk * skillMultiplier) * (1 + (level * 0.05)));
    }
}
