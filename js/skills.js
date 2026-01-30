export const SKILLS = {
    fire: [
        { id: 'f1', name: 'Bicada Térmica', level: 1, multiplier: 1.0, cost: 0, type: 'attack', desc: 'Dano base de fogo.' },
        { id: 'f5', name: 'Explosão Solar', level: 5, multiplier: 1.4, cost: 30, type: 'attack', effect: 'burn', chance: 0.3, desc: 'Dano alto com chance de queimar.' },
        { id: 'f10', name: 'Fênix Ascendente', level: 10, multiplier: 2.0, cost: 60, type: 'special', effect: 'heal', value: 20, desc: 'Dano massivo e recupera um pouco de vida.' }
    ],
    water: [
        { id: 'w1', name: 'Jato d\'Água', level: 1, multiplier: 1.0, cost: 0, type: 'attack', desc: 'Dano base de água.' },
        { id: 'w5', name: 'Escudo de Bolhas', level: 5, multiplier: 0.8, cost: 25, type: 'buff', effect: 'shield', value: 0.5, duration: 1, desc: 'Cria um escudo que reduz o próximo dano.' },
        { id: 'w10', name: 'Tsunami', level: 10, multiplier: 1.8, cost: 55, type: 'attack', effect: 'aoe', desc: 'Onda gigante que atinge com força total.' }
    ],
    earth: [
        { id: 'e1', name: 'Pancada de Rocha', level: 1, multiplier: 1.0, cost: 0, type: 'attack', desc: 'Dano base de terra.' },
        { id: 'e5', name: 'Armadura de Ferro', level: 5, multiplier: 0.7, cost: 20, type: 'buff', effect: 'def', value: 1.5, duration: 2, desc: 'Aumenta a defesa por 2 turnos.' },
        { id: 'e10', name: 'Terremoto', level: 10, multiplier: 1.6, cost: 50, type: 'attack', effect: 'stun', chance: 0.2, desc: 'Dano alto com chance de atordoar.' }
    ],
    air: [
        { id: 'a1', name: 'Corte de Vento', level: 1, multiplier: 1.0, cost: 0, type: 'attack', desc: 'Dano base de ar.' },
        { id: 'a5', name: 'Esquiva Veloz', level: 5, multiplier: 0.5, cost: 25, type: 'buff', effect: 'dodge', chance: 0.4, duration: 1, desc: 'Aumenta muito a chance de desviar.' },
        { id: 'a10', name: 'Furacão', level: 10, multiplier: 0.6, cost: 50, hits: 3, desc: 'Ataque triplo ultra veloz.' }
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
