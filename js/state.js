import { LocalBackend, blankProfile } from './backend.js';

export const STORAGE_KEY = 'rinha_db_v1';

export const ELEMENTS = {
    fire: { id: 'fire', name: 'Vulcan', nameKey: 'el-fire', base: 100, icon: '🔥', tailColor1: '#ff4500', tailColor2: '#ffcc00', desc: 'Atk Max' },
    earth: { id: 'earth', name: 'Rochus', nameKey: 'el-earth', base: 95, icon: '🏔️', tailColor1: '#556b2f', tailColor2: '#8bc34a', desc: 'Defesa' },
    water: { id: 'water', name: 'Hydro', nameKey: 'el-water', base: 90, icon: '🌊', tailColor1: '#00bfff', tailColor2: '#e0ffff', desc: 'Tático' },
    air: { id: 'air', name: 'Zephyr', nameKey: 'el-air', base: 85, icon: '🌪️', tailColor1: '#b0bec5', tailColor2: '#ffffff', desc: 'Veloz' }
};

export const COLORS = {
    red: { id: 'red', hex: '#dc2626', dark: '#7f1d1d', name: 'Rubro', nameKey: 'col-red-name' },
    blue: { id: 'blue', hex: '#2563eb', dark: '#1e3a8a', name: 'Oceânico', nameKey: 'col-blue-name' },
    green: { id: 'green', hex: '#16a34a', dark: '#14532d', name: 'Silvestre', nameKey: 'col-green-name' },
    yellow: { id: 'yellow', hex: '#ca8a04', dark: '#713f12', name: 'Solar', nameKey: 'col-yellow-name' }
};

export const SKINS = {
    none: { id: 'none', filter: '' },
    neon: { id: 'neon', filter: 'drop-shadow(0 0 8px #00f2ff) brightness(1.2) saturate(1.5)' },
    gold: { id: 'gold', filter: 'drop-shadow(0 0 12px gold) sepia(0.3) saturate(1.8) contrast(1.1)' },
    ghost: { id: 'ghost', filter: 'opacity(0.6) hue-rotate(180deg) brightness(1.4)' },
    ruby: { id: 'ruby', filter: 'drop-shadow(0 0 8px #ff0000) hue-rotate(-10deg) brightness(1.1) saturate(1.3)' },
    shadow: { id: 'shadow', filter: 'grayscale(1) brightness(0.4) drop-shadow(0 0 5px #000)' }
};

export const ARENAS = [
    { id: 'earth', name: 'Caverna', class: 'arena-earth', bonusElement: 'earth', color: 'yellow', icon: '🏔️' },
    { id: 'water', name: 'Lagoa', class: 'arena-water', bonusElement: 'water', color: 'blue', icon: '🌊' },
    { id: 'air', name: 'Pico Alto', class: 'arena-air', bonusElement: 'air', color: 'green', icon: '🌪️' },
    { id: 'fire', name: 'Cratera', class: 'arena-volcano', bonusElement: 'fire', color: 'red', icon: '🔥' }
];

class State {
    constructor() {
        this.gameData = { 
            version: '2.0.0',
            user: null,
            matches: [], 
            wins: 0, 
            losses: 0, 
            balance: 0, 
            settings: { muteSFX: false, muteMusic: false, lang: 'pt-BR' },
            inventory: {
                roosters: [],
                items: []
            },
            teams: {
                active: [] // Array of rooster IDs
            },
            referral: {
                code: '',
                referrer: null,
                totalEarnings: 0,
                networkCount: [0, 0, 0, 0, 0] // 5 levels
            },
            economy: {
                totalRake: 0,
                jackpotPool: 0
            },
            tournament: {
                active: false,
                round: 0, // 0: QF, 1: SF, 2: Final
                participants: [], // { id, name, element, color, level, isPlayer, isEliminated }
                bracket: [] // Result of each round
            }
        };
        this.player = { element: null, color: null };
        this.cpu = { element: null, color: null };
        this.inBattle = false;
        this.cpuTeam = [];
        this.gameMode = '1v1';
        this.currentArena = null;
        this.currentBet = 100;
        this.battleResult = null;
        this.betLocked = false;
        this.load();
    }

    load() {
        const userId = LocalBackend.getSessionUserId();
        if (!userId) return;
        const profile = LocalBackend.getProfile(userId);
        if (!profile) return;
        this.hydrate(profile);
    }

    hydrate(profile) {
        this.gameData = { ...blankProfile(profile.user), ...profile };
        if (!this.gameData.inventory) this.gameData.inventory = { roosters: [], items: [] };
        if (!this.gameData.inventory.items) this.gameData.inventory.items = [];
        if (!this.gameData.teams) this.gameData.teams = { active: [] };
        if (!this.gameData.referral) this.gameData.referral = { code: '', referrer: null, totalEarnings: 0, networkCount: [0, 0, 0, 0, 0] };
        if (!this.gameData.wallet) this.gameData.wallet = { USDT_BSC: 0, USDT_ETH: 0, USDC_BSC: 0, USDC_ETH: 0 };
        (this.gameData.inventory.roosters || []).forEach(r => {
            if (r.energy === undefined) r.energy = 100;
            if (r.energy_max === undefined) r.energy_max = 100;
        });
    }

    async save() {
        if (this.gameData.user && this.gameData.user.id) {
            LocalBackend.saveProfile(this.gameData);
        }
    }

    async syncAll() {
        if (!this.gameData.user?.id) return false;
        const profile = LocalBackend.getProfile(this.gameData.user.id);
        if (profile) this.hydrate(profile);
        return true;
    }

    static createRooster(element, color, level = 1) {
        return {
            id: 'gal-' + Math.random().toString(36).substring(2, 9),
            element,
            color,
            level,
            xp: 0,
            xpNext: level * 100,
            dna: {
                code: Math.random().toString(36).substring(2, 12).toUpperCase(),
                skin: 'none',
                generation: 1,
                rarity: 'common'
            },
            baseStats: ELEMENTS[element].base,
            hp: 100 + (level * 10),
            hp_current: 100 + (level * 10),
            hp_max: 100 + (level * 10),
            energy: 100,
            energy_max: 100,
            atk: ELEMENTS[element].base + (level * 2),
            price: 500 + (level * 100) // Base price for shop/auction
        };
    }

    static addXP(rooster, amount) {
        rooster.xp += amount;
        let leveledUp = false;
        
        const xpRequired = rooster.level * 100;
        if (rooster.xp >= xpRequired) {
            rooster.level++;
            rooster.xp -= xpRequired;
            rooster.hp_max += 10;
            rooster.hp = rooster.hp_max;
            rooster.atk += 2;
            leveledUp = true;
            console.log(`Rooster ${rooster.id} leveled up to ${rooster.level}!`);
        }
        return leveledUp;
    }

    reset() {
        if (this.gameData.user?.id) {
            const fresh = LocalBackend.resetProfile(this.gameData.user.id);
            if (fresh) this.hydrate(fresh);
            return;
        }
        this.gameData = blankProfile(null);
    }
}

export const state = new State();
