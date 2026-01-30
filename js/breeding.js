import { state } from './state.js';
import i18n from './i18n.js';

export class BreedingService {
    static getBreedingCost(r1, r2) {
        return 1000 + (r1.level + r2.level) * 50;
    }

    static breed(r1, r2) {
        const cost = this.getBreedingCost(r1, r2);
        if (state.gameData.balance < cost) return { success: false, error: 'insufficient-funds' };

        state.gameData.balance -= cost;

        // DNA Engineering
        const element = Math.random() > 0.5 ? r1.element : r2.element;
        const color = Math.random() > 0.5 ? r1.color : r2.color;
        
        // Atributos baseados na média + bônus de fusão
        const baseAtk = Math.floor((r1.atk + r2.atk) / 2) + 2;
        const baseHp = Math.floor((r1.hp_max + r2.hp_max) / 2) + 10;
        
        const newRooster = state.constructor.createRooster(element, color, 1);
        newRooster.atk = baseAtk;
        newRooster.hp_max = baseHp;
        
        const rarity = Math.random() > 0.9 ? 'legendary' : (Math.random() > 0.7 ? 'rare' : 'common');
        let skin = 'none';

        // Lógica de Skin Rara
        const skinChance = rarity === 'legendary' ? 0.5 : (rarity === 'rare' ? 0.2 : 0.05);
        if (Math.random() < skinChance) {
            const possibleSkins = rarity === 'legendary' ? ['gold', 'ghost', 'neon'] : ['neon', 'ruby', 'shadow'];
            skin = possibleSkins[Math.floor(Math.random() * possibleSkins.length)];
        }

        // Herança de Skin (Se um pai tem, chance aumenta)
        if (skin === 'none' && (r1.dna?.skin !== 'none' || r2.dna?.skin !== 'none')) {
            if (Math.random() < 0.3) {
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

        // Remove parents if needed (optional - here we keep them but fusion usually consumes)
        // For this MVP, let's keep it simple: breeding consumes the parents.
        state.gameData.inventory.roosters = state.gameData.inventory.roosters.filter(r => r.id !== r1.id && r.id !== r2.id);
        
        state.gameData.inventory.roosters.push(newRooster);
        state.save();

        return { success: true, rooster: newRooster };
    }
}
