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

        // 3. Persistência de Dados (Engenharia de Ponta)
        if (state.gameData.user && state.gameData.user.id) {
            try {
                const { supabase } = await import('./supabase.js');
                
                // Deletar pais no Supabase
                await supabase.from('roosters').delete().in('id', [r1.id, r2.id]);
                
                // Inserir novo galo no Supabase (Incluindo ID explícito)
                const { data, error } = await supabase.from('roosters').insert({
                    id: newRooster.id,
                    owner_id: state.gameData.user.id,
                    element: newRooster.element,
                    color: newRooster.color,
                    level: newRooster.level,
                    xp: newRooster.xp,
                    dna: JSON.stringify(newRooster.dna), // Stringify para coluna TEXT
                    atk_base: newRooster.atk,
                    hp_max: newRooster.hp_max,
                    in_team: false
                }).select().single();

                if (error) throw error;
                if (data) newRooster.id = data.id; // Usar o ID real do banco
                
            } catch (err) {
                console.error("Erro na persistência da fusão:", err);
                // Fallback: Manter apenas local se o banco falhar (não ideal, mas evita travamento)
            }
        }

        // 4. Atualizar Estado Local
        state.gameData.inventory.roosters = state.gameData.inventory.roosters.filter(r => r.id !== r1.id && r.id !== r2.id);
        state.gameData.inventory.roosters.push(newRooster);
        
        await state.save();

        return { success: true, rooster: newRooster };
    }
}
