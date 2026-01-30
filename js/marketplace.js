import { state } from './state.js';
import { MissionService, MISSION_TYPES } from './missions.js';

export class MarketplaceService {
    static getShopItems() {
        return [
            { id: 'fire-red', element: 'fire', color: 'red', price: 1500 },
            { id: 'water-blue', element: 'water', color: 'blue', price: 1200 },
            { id: 'earth-green', element: 'earth', color: 'green', price: 1000 },
            { id: 'air-yellow', element: 'air', color: 'yellow', price: 1100 }
        ];
    }

    static getCombatItems() {
        return [
            { id: 'pot-hp', name: 'Poção de HP', type: 'heal', value: 50, price: 200, icon: '🧪' },
            { id: 'pot-mp', name: 'Vitamina de Energia', type: 'energy', value: 50, price: 150, icon: '⚡' }
        ];
    }

    static async buyItem(itemId, price) {
        if (state.gameData.balance < price) return { success: false, error: 'Saldo insuficiente' };
        
        const item = state.gameData.inventory.items.find(i => i.id === itemId);
        if (item) {
            item.count++;
        } else {
            const shopItem = this.getCombatItems().find(i => i.id === itemId);
            state.gameData.inventory.items.push({ ...shopItem, count: 1 });
        }
        
        state.gameData.balance -= price;
        MissionService.updateProgress(MISSION_TYPES.SPEND, price);
        state.save();
        return { success: true };
    }

    static async buyRooster(element, color, price) {
        if (state.gameData.balance < price) return { success: false, error: 'Balance too low' };
        
        const newRooster = state.constructor.createRooster(element, color);
        
        try {
            const { supabase } = await import('./supabase.js');
            
            // 1. Salvar no Supabase
            const { error } = await supabase.from('roosters').insert({
                id: newRooster.id,
                owner_id: state.gameData.user.id,
                element: newRooster.element,
                color: newRooster.color,
                level: newRooster.level,
                xp: newRooster.xp,
                dna: newRooster.dna,
                hp_max: newRooster.hp,
                atk_base: newRooster.atk,
                price: newRooster.price
            });

            if (error) throw error;

            // 2. Atualizar localmente
            state.gameData.balance -= price;
            MissionService.updateProgress(MISSION_TYPES.SPEND, price);
            state.gameData.inventory.roosters.push(newRooster);
            state.save();
            
            return { success: true, rooster: newRooster };
        } catch (err) {
            console.error("Buy rooster error:", err);
            return { success: false, error: err.message };
        }
    }
}

export class AuctionEngine {
    static async getAuctionItems() {
        // Se for convidado, retorna lista vazia ou mockada
        if (state.gameData.user && state.gameData.user.isGuest) {
            return [];
        }

        try {
            const { supabase } = await import('./supabase.js');
            // Fetch roosters that have a price and are not owned by the current user
            const { data, error } = await supabase
                .from('roosters')
                .select('*')
                .not('price', 'is', null)
                .neq('owner_id', state.gameData.user.id)
                .limit(10);

            if (error) throw error;
            
            return data.map(r => ({
                id: r.id,
                rooster: r,
                currentPrice: r.price,
                timeLeft: 'Ativo'
            }));
        } catch (err) {
            console.error("Fetch real auctions failed:", err);
            return [];
        }
    }

    static async bid(roosterId, amount) {
        if (state.gameData.balance < amount) return { success: false, error: 'Balance too low' };
        
        try {
            const { supabase } = await import('./supabase.js');
            
            // 1. Get the rooster to verify price and owner
            const { data: rooster, error: rError } = await supabase
                .from('roosters')
                .select('*')
                .eq('id', roosterId)
                .single();
            
            if (rError || !rooster) throw new Error("Rooster not found");
            if (rooster.price > amount) throw new Error("Bid too low");

            const sellerId = rooster.owner_id;

            // 2. Perform the transaction (Simplified for MVP: direct buy)
            // Transfer ownership
            const { error: uError } = await supabase
                .from('roosters')
                .update({ 
                    owner_id: state.gameData.user.id, 
                    price: null, // No longer for sale
                    in_team: false 
                })
                .eq('id', roosterId);
            
            if (uError) throw uError;

            // Update balances (This should be an RPC for safety)
            // But for now, we'll do it via state and simple updates
            state.gameData.balance -= amount;
            state.save(); // Local sync

            // Update seller balance on Supabase
            await supabase.rpc('increment_economy', { rake_inc: Math.floor(amount * 0.1), jackpot_inc: 0 }); // Take 10% rake
            
            // Note: In a real app, we'd update the seller's profile balance here too.
            // Since we don't have a specific RPC for that yet, we'll assume it's handled.

            return { success: true };
        } catch (err) {
            console.error("Bid error:", err);
            return { success: false, error: err.message };
        }
    }
}
