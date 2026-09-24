import { state } from './state.js';
import i18n from './i18n.js';

export class BreedingService {
    static getBreedingCost(r1, r2) {
        return 1000 + (r1.level + r2.level) * 50;
    }

    static async breed(r1, r2) {
        const cost = this.getBreedingCost(r1, r2);
        if (state.gameData.balance < cost) return { success: false, error: 'insufficient-funds' };

        // 1. Cobrar custo
        state.gameData.balance -= cost;

        // 2. DNA Engineering
        const element = Math.random() > 0.5 ? r1.element : r2.element;
        const color = Math.random() > 0.5 ? r1.color : r2.color;
        
        // Atributos baseados na média + bônus de fusão
        const baseAtk = Math.floor(((r1.atk || 100) + (r2.atk || 100)) / 2) + 5;
        const baseHp = Math.floor(((r1.hp_max || 110) + (r2.hp_max || 110)) / 2) + 15;
        
        const newRooster = state.constructor.createRooster(element, color, 1);
        newRooster.atk = baseAtk;
        newRooster.hp_max = baseHp;
        newRooster.hp = baseHp;
        
        const rarityRoll = Math.random();
        const rarity = rarityRoll > 0.95 ? 'legendary' : (rarityRoll > 0.8 ? 'rare' : 'common');
        let skin = 'none';

        // Lógica de Skin Rara
        const skinChance = rarity === 'legendary' ? 0.6 : (rarity === 'rare' ? 0.3 : 0.05);
        if (Math.random() < skinChance) {
            const possibleSkins = rarity === 'legendary' ? ['gold', 'ghost', 'neon'] : ['neon', 'ruby', 'shadow'];
            skin = possibleSkins[Math.floor(Math.random() * possibleSkins.length)];
        }

        // Herança de Skin (Se um pai tem, chance aumenta)
        if (skin === 'none' && (r1.dna?.skin !== 'none' || r2.dna?.skin !== 'none')) {
            if (Math.random() < 0.4) {
                skin = r1.dna?.skin !== 'none' ? r1.dna.skin : r2.dna.skin;
            }
        }

        newRooster.dna = {
            code: Math.random().toString(36).substring(2, 12).toUpperCase(),
            parents: [r1.id, r2.id],
            generation: Math.max(r1.dna?.generation || 1, r2.dna?.generation || 1) + 1,
            rarity: rarity,
            skin: skin
        };

        state.gameData.inventory.roosters = state.gameData.inventory.roosters.filter(r => r.id !== r1.id && r.id !== r2.id);
        state.gameData.inventory.roosters.push(newRooster);
        state.gameData.teams.active = state.gameData.teams.active.filter(id => id !== r1.id && id !== r2.id);
        await state.save();

        return { success: true, rooster: newRooster };
    }
}
