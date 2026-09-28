import { state } from './state.js';
import { describeFusion } from './fusion-abilities.js';

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
        // Campo de vantagem de cor no combate. O sprite do forjado não usa esta pintura.
        const color = Math.random() > 0.5 ? r1.color : r2.color;
        const different = r1.element !== r2.element;
        const secondaryElement = different
            ? (element === r1.element ? r2.element : r1.element)
            : null;
        const signature = describeFusion(r1.element, r2.element);

        const newRooster = state.constructor.createRooster(element, color, 1);
        newRooster.secondaryElement = secondaryElement;
        newRooster.forged = true;

        const rarityRoll = Math.random();
        let rarity = rarityRoll > 0.95 ? 'legendary' : (rarityRoll > 0.8 ? 'rare' : 'common');
        if ((secondaryElement || signature?.kind === 'evolution') && rarity === 'common') rarity = 'rare';
        // A pintura do forjado vem da paleta da fusão, não de um filtro de skin.
        const skin = 'none';

        newRooster.dna = {
            code: Math.random().toString(36).substring(2, 12).toUpperCase(),
            parents: [r1.id, r2.id],
            generation: Math.max(r1.dna?.generation || 1, r2.dna?.generation || 1) + 1,
            rarity: rarity,
            skin: skin,
            secondaryElement,
            fusionId: signature?.kind === 'hybrid' ? signature.id : null,
            evolution: signature?.kind === 'evolution' ? signature.id : null
        };

        state.gameData.inventory.roosters = state.gameData.inventory.roosters.filter(r => r.id !== r1.id && r.id !== r2.id);
        state.gameData.inventory.roosters.push(newRooster);
        state.gameData.teams.active = state.gameData.teams.active.filter(id => id !== r1.id && id !== r2.id);
        await state.save();

        return { success: true, rooster: newRooster };
    }
}
