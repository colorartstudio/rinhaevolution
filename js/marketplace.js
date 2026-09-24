import { state } from './state.js';
import { MissionService, MISSION_TYPES } from './missions.js';
import i18n from './i18n.js';

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
            { id: 'pot-hp', nameKey: 'shop-item-hp-name', type: 'heal', value: 50, price: 200, icon: '🧪' },
            { id: 'pot-mp', nameKey: 'shop-item-mp-name', type: 'energy', value: 50, price: 150, icon: '⚡' }
        ];
    }

    static async buyItem(itemId, price) {
        if (state.gameData.balance < price) return { success: false, error: i18n.t('shop-error-balance') };
        
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
        if (state.gameData.balance < price) return { success: false, error: i18n.t('shop-error-balance') };
        
        const newRooster = state.constructor.createRooster(element, color);
        state.gameData.balance -= price;
        MissionService.updateProgress(MISSION_TYPES.SPEND, price);
        state.gameData.inventory.roosters.push(newRooster);
        state.save();
        return { success: true, rooster: newRooster };
    }
}

export class AuctionEngine {
    static async getAuctionItems() {
        if (!state.gameData.user?.id) return [];
        const { LocalBackend } = await import('./backend.js');
        return LocalBackend.listAuctions(state.gameData.user.id).map(l => ({
            id: l.roosterId,
            rooster: l.rooster,
            currentPrice: l.price,
            timeLeft: '---'
        }));
    }

    static async bid(roosterId) {
        try {
            const { LocalBackend } = await import('./backend.js');
            const profile = LocalBackend.buyListing({ userId: state.gameData.user.id, roosterId });
            state.hydrate(profile);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}
