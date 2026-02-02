export const SKILLS = {
    fire: [
        { id: 'f1', nameKey: 'skill-f1-name', level: 1, multiplier: 1.0, cost: 0, type: 'attack', descKey: 'skill-f1-desc' },
        { id: 'f5', nameKey: 'skill-f5-name', level: 5, multiplier: 1.4, cost: 30, type: 'attack', effect: 'burn', chance: 0.3, descKey: 'skill-f5-desc' },
        { id: 'f10', nameKey: 'skill-f10-name', level: 10, multiplier: 2.0, cost: 60, type: 'special', effect: 'heal', value: 20, descKey: 'skill-f10-desc' }
    ],
    water: [
        { id: 'w1', nameKey: 'skill-w1-name', level: 1, multiplier: 1.0, cost: 0, type: 'attack', descKey: 'skill-w1-desc' },
        { id: 'w5', nameKey: 'skill-w5-name', level: 5, multiplier: 0.8, cost: 25, type: 'buff', effect: 'shield', value: 0.5, duration: 1, descKey: 'skill-w5-desc' },
        { id: 'w10', nameKey: 'skill-w10-name', level: 10, multiplier: 1.8, cost: 55, type: 'attack', effect: 'aoe', descKey: 'skill-w10-desc' }
    ],
    earth: [
        { id: 'e1', nameKey: 'skill-e1-name', level: 1, multiplier: 1.0, cost: 0, type: 'attack', descKey: 'skill-e1-desc' },
        { id: 'e5', nameKey: 'skill-e5-name', level: 5, multiplier: 0.7, cost: 20, type: 'buff', effect: 'def', value: 1.5, duration: 2, descKey: 'skill-e5-desc' },
        { id: 'e10', nameKey: 'skill-e10-name', level: 10, multiplier: 1.6, cost: 50, type: 'attack', effect: 'stun', chance: 0.2, descKey: 'skill-e10-desc' }
    ],
    air: [
        { id: 'a1', nameKey: 'skill-a1-name', level: 1, multiplier: 1.0, cost: 0, type: 'attack', descKey: 'skill-a1-desc' },
        { id: 'a5', nameKey: 'skill-a5-name', level: 5, multiplier: 0.5, cost: 25, type: 'buff', effect: 'dodge', chance: 0.4, duration: 1, descKey: 'skill-a5-desc' },
        { id: 'a10', nameKey: 'skill-a10-name', level: 10, multiplier: 0.6, cost: 50, hits: 3, descKey: 'skill-a10-desc' }
    ]
};

export class SkillService {
    static getSkillsForRooster(element, level) {
        return SKILLS[element].filter(s => s.level <= level);
    }

    static calculateDamage(baseAtk, skillMultiplier, level) {
        // Factor level into damage for better scaling
        return Math.round((baseAtk * skillMultiplier) * (1 + (level * 0.05)));
    }
}
