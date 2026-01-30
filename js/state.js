export const STORAGE_KEY = 'rinha_evo_v3_eco';

export const ELEMENTS = {
    fire: { id: 'fire', name: 'Vulcan', base: 100, icon: '🔥', tailColor1: '#ff4500', tailColor2: '#ffcc00', desc: 'Atk Max' },
    earth: { id: 'earth', name: 'Rochus', base: 95, icon: '🏔️', tailColor1: '#556b2f', tailColor2: '#8bc34a', desc: 'Defesa' },
    water: { id: 'water', name: 'Hydro', base: 90, icon: '🌊', tailColor1: '#00bfff', tailColor2: '#e0ffff', desc: 'Tático' },
    air: { id: 'air', name: 'Zephyr', base: 85, icon: '🌪️', tailColor1: '#b0bec5', tailColor2: '#ffffff', desc: 'Veloz' }
};

export const COLORS = {
    red: { id: 'red', hex: '#dc2626', dark: '#7f1d1d', name: 'Rubro' },
    blue: { id: 'blue', hex: '#2563eb', dark: '#1e3a8a', name: 'Oceânico' },
    green: { id: 'green', hex: '#16a34a', dark: '#14532d', name: 'Silvestre' },
    yellow: { id: 'yellow', hex: '#ca8a04', dark: '#713f12', name: 'Solar' }
};

export const ARENAS = [
    { id: 'earth', name: 'Caverna', class: 'arena-earth', bonusElement: 'earth', icon: '🏔️' },
    { id: 'water', name: 'Lagoa', class: 'arena-water', bonusElement: 'water', icon: '🌊' },
    { id: 'air', name: 'Pico Alto', class: 'arena-air', bonusElement: 'air', icon: '🌪️' },
    { id: 'fire', name: 'Cratera', class: 'arena-volcano', bonusElement: 'fire', icon: '🔥' }
];

class State {
    constructor() {
        this.gameData = { 
            version: '2.0.0',
            user: null, // { name, email, id }
            matches: [], 
            wins: 0, 
            losses: 0, 
            balance: 1000, 
            settings: { mute: false, lang: 'pt-BR' },
            inventory: {
                roosters: [], // { id, element, color, level, xp, dna, price }
                items: [
                    { id: 'pot-hp', name: 'Poção de HP', type: 'heal', value: 50, count: 2, price: 200 },
                    { id: 'pot-mp', name: 'Vitamina de Energia', type: 'energy', value: 50, count: 2, price: 150 }
                ]
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
        this.currentArena = null;
        this.currentBet = 100;
        this.load();
    }

    load() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Basic migration/merge
            this.gameData = { ...this.gameData, ...parsed };
            
            // Ensure nested objects exist
            if (!this.gameData.inventory) this.gameData.inventory = { roosters: [], items: [] };
            if (!this.gameData.teams) this.gameData.teams = { active: [] };
            if (!this.gameData.referral) this.gameData.referral = { code: '', referrer: null, totalEarnings: 0, networkCount: [0,0,0,0,0] };
            if (!this.gameData.economy) this.gameData.economy = { totalRake: 0, jackpotPool: 0 };
        }
    }

    async save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.gameData));
        
        // Sincronização opcional com Supabase se o usuário estiver logado
        if (this.gameData.user && this.gameData.user.id) {
            try {
                const { supabase } = await import('./supabase.js');
                await supabase.from('profiles').update({
                    balance: this.gameData.balance,
                    wins: this.gameData.wins,
                    losses: this.gameData.losses,
                    settings: this.gameData.settings
                }).eq('id', this.gameData.user.id);
            } catch (err) {
                console.warn("Cloud sync failed, will retry later:", err);
            }
        }
    }

    async syncAll() {
        if (!this.gameData.user || !this.gameData.user.id) return;
        
        try {
            const { supabase } = await import('./supabase.js');
            
            // 1. Buscar Profile
            const { data: profile, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.gameData.user.id)
                .single();
            
            if (profile) {
                this.gameData.balance = profile.balance;
                this.gameData.wins = profile.wins;
                this.gameData.losses = profile.losses;
                this.gameData.settings = profile.settings;
                if (profile.referral_code) this.gameData.referral.code = profile.referral_code;
            }

            // 2. Buscar Galos (Inventory)
            const { data: roosters, error: rError } = await supabase
                .from('roosters')
                .select('*')
                .eq('owner_id', this.gameData.user.id);
            
            if (roosters) {
                this.gameData.inventory.roosters = roosters;
                // Sincronizar time ativo baseado na coluna in_team
                this.gameData.teams.active = roosters
                    .filter(r => r.in_team)
                    .map(r => r.id);
            }

            // 3. Buscar Estatísticas Globais de Economia
            const { data: economy, error: eError } = await supabase
                .from('economy_stats')
                .select('*')
                .eq('id', 1)
                .single();
            
            if (economy) {
                this.gameData.economy.totalRake = parseInt(economy.total_rake);
                this.gameData.economy.jackpotPool = parseInt(economy.jackpot_pool);
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.gameData));
            return true;
        } catch (err) {
            console.error("Full sync failed:", err);
            return false;
        }
    }

    static createRooster(element, color, level = 1) {
        return {
            id: 'gal-' + Math.random().toString(36).substring(2, 9),
            element,
            color,
            level,
            xp: 0,
            xpNext: level * 100,
            dna: Math.random().toString(36).substring(2, 12).toUpperCase(),
            baseStats: ELEMENTS[element].base,
            hp: 100 + (level * 10),
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
        const user = this.gameData.user;
        const lang = this.gameData.settings.lang;
        this.gameData = { 
            user,
            matches: [], 
            wins: 0, 
            losses: 0, 
            balance: 1000, 
            settings: { mute: false, lang } 
        };
        this.save();
    }
}

export const state = new State();
