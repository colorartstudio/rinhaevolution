/**
 * Backend acoplado: todas as tabelas vivem no LocalStorage deste navegador.
 * Conta nova começa em zero. Oponentes e depósitos são simulados na hora.
 */
import { calcReferralCommissions, REFERRAL_MODEL } from './referral-economy.js';
import { derivedPvpFromRake } from './pvp-economy.js';

const DB_KEY = 'rinha_db_v1';
const SESSION_KEY = 'rinha_session_v1';

const ELEMENTS = ['fire', 'earth', 'water', 'air'];
const COLORS = ['red', 'blue', 'green', 'yellow'];
const BASE = { fire: 100, earth: 95, water: 90, air: 85 };

const _pvpCore = derivedPvpFromRake();

export const PVP = {
    /** Cada lado: 15% rake, 85% no pote; vencedor leva o pote (1,7× a aposta). Ver pvp-economy.js */
    ..._pvpCore,
    XP_WIN: 50,
    XP_DRAW: 20,
    XP_LOSS: 10,
    TOURNAMENT_FEE: 500,
    BETS: [50, 100, 500]
};

/** Liquidação PvP 1v1/3v3: mesma aposta, pote = POT_SHARE de cada lado. */
export function calcMatchSettlement(bet, result) {
    const safeBet = Math.max(0, Math.floor(bet));
    if (result === 'win') {
        const rake = Math.floor(safeBet * PVP.RAKE);
        const credit = Math.floor(safeBet * PVP.WIN_PAYOUT);
        const jackpotContribution = Math.floor(rake * PVP.JACKPOT_OF_RAKE);
        return { credit, rake, jackpotContribution, financial: credit - safeBet };
    }
    if (result === 'loss') {
        const rake = Math.floor(safeBet * PVP.RAKE);
        const jackpotContribution = Math.floor(rake * PVP.JACKPOT_OF_RAKE);
        return { credit: 0, rake, jackpotContribution, financial: -safeBet };
    }
    return { credit: safeBet, rake: 0, jackpotContribution: 0, financial: 0 };
}

function getReferralUpline(db, playerUserId) {
    const chain = [];
    let currentId = playerUserId;
    for (let i = 0; i < REFERRAL_MODEL.MAX_LEVELS; i++) {
        const link = db.referrals.find(r => r.referredId === currentId);
        if (!link) break;
        const referrer = db.profiles[link.referrerId];
        if (!referrer) break;
        chain.push({ referrerId: link.referrerId, profile: referrer, link });
        currentId = link.referrerId;
    }
    return chain;
}

function bumpNetworkCountsForNewMember(db, directReferrerId) {
    let currentId = directReferrerId;
    for (let level = 0; level < REFERRAL_MODEL.MAX_LEVELS; level++) {
        const profile = db.profiles[currentId];
        if (!profile?.referral) break;
        if (!profile.referral.networkCount) profile.referral.networkCount = [0, 0, 0, 0, 0];
        profile.referral.networkCount[level] = (profile.referral.networkCount[level] || 0) + 1;
        db.profiles[currentId] = profile;
        const uplink = db.referrals.find(r => r.referredId === currentId);
        if (!uplink) break;
        currentId = uplink.referrerId;
    }
}

function payReferralCommissions(db, playerUserId, rake) {
    if (rake <= 0) return;
    const amounts = calcReferralCommissions(rake);
    const upline = getReferralUpline(db, playerUserId);
    amounts.forEach((earning, index) => {
        if (earning <= 0 || index >= upline.length) return;
        const { profile: referrer, link } = upline[index];
        referrer.balance += earning;
        referrer.referral.totalEarnings = (referrer.referral.totalEarnings || 0) + earning;
        referrer.transactions.unshift({
            id: uid('tx'),
            amount: earning,
            type: 'referral_reward',
            description: `Comissão de rede (${index + 1}º nível)`,
            at: Date.now()
        });
        link.totalCommission = (link.totalCommission || 0) + (index === 0 ? earning : 0);
        db.profiles[referrer.user.id] = referrer;
    });
}

function emptyDb() {
    return {
        users: [],
        profiles: {},
        listings: [],
        referrals: [],
        economy: { totalRake: 0, jackpotPool: 0 },
        pendingReset: null
    };
}

function readDb() {
    try {
        const raw = localStorage.getItem(DB_KEY);
        if (!raw) return emptyDb();
        const parsed = JSON.parse(raw);
        return { ...emptyDb(), ...parsed, economy: { ...emptyDb().economy, ...(parsed.economy || {}) } };
    } catch {
        return emptyDb();
    }
}

function writeDb(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function uid(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 10);
}

async function hashPassword(password, salt) {
    const data = new TextEncoder().encode(`${salt}:${password}`);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function blankProfile(user) {
    return {
        version: '3.0.0',
        user,
        matches: [],
        wins: 0,
        losses: 0,
        balance: 0,
        settings: { muteSFX: false, muteMusic: false, lang: 'pt-BR' },
        inventory: { roosters: [], items: [] },
        teams: { active: [] },
        referral: { code: '', referrer: null, totalEarnings: 0, networkCount: [0, 0, 0, 0, 0] },
        economy: { totalRake: 0, jackpotPool: 0 },
        tournament: { active: false, round: 0, participants: [], bracket: [] },
        missions: null,
        battleLogs: [],
        transactions: [],
        pendingBet: null,
        wallet: {
            USDT_BSC: 0,
            USDT_ETH: 0,
            USDC_BSC: 0,
            USDC_ETH: 0
        }
    };
}

function rollRooster(level = 1) {
    const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const hp = 100 + (level * 10);
    return {
        id: uid('cpu'),
        element,
        color,
        level,
        atk: BASE[element] + (level * 2),
        hp_max: hp,
        hp: hp,
        energy_max: 100,
        energy: 100
    };
}

export const LocalBackend = {
    getSessionUserId() {
        return localStorage.getItem(SESSION_KEY);
    },

    setSession(userId) {
        if (userId) localStorage.setItem(SESSION_KEY, userId);
        else localStorage.removeItem(SESSION_KEY);
    },

    getProfile(userId) {
        const db = readDb();
        return db.profiles[userId] || null;
    },

    saveProfile(profile) {
        if (!profile?.user?.id) return;
        const db = readDb();
        const prev = db.profiles[profile.user.id];
        profile.economy = { ...db.economy };
        // Durante a luta o cliente salva inventário/HP sem pendingBet; não apagar a aposta travada.
        if (prev?.pendingBet && !profile.pendingBet) {
            profile.pendingBet = prev.pendingBet;
        }
        db.profiles[profile.user.id] = profile;
        const user = db.users.find(u => u.id === profile.user.id);
        if (user) user.username = profile.user.name;
        writeDb(db);
    },

    async register({ username, email, password, lang }) {
        const db = readDb();
        const normalized = email.trim().toLowerCase();
        if (db.users.some(u => u.email === normalized)) {
            throw new Error('E-mail já cadastrado neste dispositivo.');
        }
        const salt = uid('salt');
        const passwordHash = await hashPassword(password, salt);
        const user = { id: uid('usr'), email: normalized, username, passwordHash, salt, isGuest: false };
        db.users.push(user);
        const profile = blankProfile({ id: user.id, name: username, email: normalized, isGuest: false });
        profile.settings.lang = lang || 'pt-BR';
        profile.referral.code = `${username.slice(0, 3).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        db.profiles[user.id] = profile;
        writeDb(db);
        this.setSession(user.id);
        return profile;
    },

    async login(email, password) {
        const db = readDb();
        const user = db.users.find(u => u.email === email.trim().toLowerCase() && !u.isGuest);
        if (!user) throw new Error('Invalid login credentials');
        const passwordHash = await hashPassword(password, user.salt);
        if (passwordHash !== user.passwordHash) throw new Error('Invalid login credentials');
        this.setSession(user.id);
        return db.profiles[user.id];
    },

    loginAsGuest() {
        const db = readDb();
        const id = uid('guest');
        const user = { id, email: `${id}@local`, username: 'Visitante', passwordHash: '', salt: '', isGuest: true };
        db.users.push(user);
        const profile = blankProfile({ id, name: 'Visitante', email: user.email, isGuest: true });
        db.profiles[id] = profile;
        writeDb(db);
        this.setSession(id);
        return profile;
    },

    logout() {
        this.setSession(null);
    },

    requestPasswordReset(email) {
        const db = readDb();
        const user = db.users.find(u => u.email === email.trim().toLowerCase() && !u.isGuest);
        if (!user) return false;
        db.pendingReset = { userId: user.id, email: user.email };
        writeDb(db);
        return true;
    },

    async updatePassword(newPassword) {
        const db = readDb();
        if (!db.pendingReset) return false;
        const user = db.users.find(u => u.id === db.pendingReset.userId);
        if (!user) return false;
        user.salt = uid('salt');
        user.passwordHash = await hashPassword(newPassword, user.salt);
        db.pendingReset = null;
        writeDb(db);
        return true;
    },

    prepareMatch({ userId, bet, mode, level = 1 }) {
        const db = readDb();
        const profile = db.profiles[userId];
        if (!profile) throw new Error('Sessão inválida');
        if (profile.balance < bet) throw new Error('Saldo insuficiente');
        profile.balance -= bet;
        const arena = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
        const count = mode === '3v3' ? 3 : 1;
        const cpuTeam = Array.from({ length: count }, () => rollRooster(level));
        profile.pendingBet = { amount: bet, mode, at: Date.now() };
        profile.economy = { ...db.economy };
        db.profiles[userId] = profile;
        writeDb(db);
        return {
            arena,
            cpu: { element: cpuTeam[0].element, color: cpuTeam[0].color },
            cpuTeam,
            newBalance: profile.balance
        };
    },

    settleMatch({ userId, result, playerTeam, opponentTeam, xpGained }) {
        const db = readDb();
        const profile = db.profiles[userId];
        if (!profile?.pendingBet) {
            return { balance: profile?.balance ?? 0, financial: 0, rake: 0, jackpotContribution: 0, credit: 0 };
        }
        const bet = profile.pendingBet.amount;
        const settlement = calcMatchSettlement(bet, result);
        const { credit, rake, jackpotContribution, financial } = settlement;
        if (result === 'win') profile.wins += 1;
        else if (result === 'loss') profile.losses += 1;
        profile.balance += credit;
        db.economy.totalRake += rake;
        db.economy.jackpotPool += jackpotContribution;
        profile.economy = { ...db.economy };
        profile.matches.unshift({
            result,
            financial,
            bet,
            date: new Date().toISOString()
        });
        if (profile.matches.length > 20) profile.matches.pop();
        profile.transactions.unshift({
            id: uid('tx'),
            amount: financial,
            type: result === 'win' ? 'match_win' : (result === 'loss' ? 'match_loss' : 'match_draw'),
            description: 'Resultado da rinha',
            at: Date.now()
        });
        payReferralCommissions(db, userId, rake);
        profile.pendingBet = null;
        db.profiles[userId] = profile;
        writeDb(db);
        return {
            balance: profile.balance,
            wins: profile.wins,
            losses: profile.losses,
            economy: profile.economy,
            financial,
            rake,
            jackpotContribution,
            credit,
            bet,
            xpGained,
            playerTeam,
            opponentTeam
        };
    },

    listAuctions(userId) {
        return readDb().listings.filter(l => l.sellerId !== userId);
    },

    listOwnListings(userId) {
        return readDb().listings.filter(l => l.sellerId === userId);
    },

    listRooster({ userId, rooster, price }) {
        const db = readDb();
        const profile = db.profiles[userId];
        const owned = profile.inventory.roosters.find(r => r.id === rooster.id);
        if (!owned) throw new Error('Galo não encontrado');
        owned.price = price;
        owned.in_team = false;
        profile.teams.active = profile.teams.active.filter(id => id !== rooster.id);
        db.listings = db.listings.filter(l => l.roosterId !== rooster.id);
        db.listings.push({
            roosterId: rooster.id,
            sellerId: userId,
            price,
            rooster: { ...owned, price }
        });
        db.profiles[userId] = profile;
        writeDb(db);
        return profile;
    },

    buyListing({ userId, roosterId }) {
        const db = readDb();
        const listing = db.listings.find(l => l.roosterId === roosterId);
        if (!listing) throw new Error('Anúncio não encontrado');
        const buyer = db.profiles[userId];
        if (buyer.balance < listing.price) throw new Error('Saldo insuficiente');
        const seller = db.profiles[listing.sellerId];
        const rake = Math.floor(listing.price * PVP.RAKE);
        const sellerNet = listing.price - rake;
        buyer.balance -= listing.price;
        if (seller) {
            seller.balance += sellerNet;
            seller.inventory.roosters = seller.inventory.roosters.filter(r => r.id !== roosterId);
        }
        const rooster = { ...listing.rooster, price: null, in_team: false };
        buyer.inventory.roosters.push(rooster);
        db.listings = db.listings.filter(l => l.roosterId !== roosterId);
        db.economy.totalRake += rake;
        buyer.economy = { ...db.economy };
        if (seller) seller.economy = { ...db.economy };
        db.profiles[userId] = buyer;
        writeDb(db);
        return buyer;
    },

    leaderboard(limit = 10) {
        const db = readDb();
        return Object.values(db.profiles)
            .filter(p => p.user && !p.user.isGuest)
            .map(p => ({ username: p.user.name, balance: p.balance, wins: p.wins }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, limit);
    },

    applyReferrer(userId, code) {
        const db = readDb();
        const profile = db.profiles[userId];
        if (!profile || profile.referral.referrer) return false;
        const referrer = Object.values(db.profiles).find(p => p.referral?.code === code && p.user.id !== userId);
        if (!referrer) return false;
        profile.referral.referrer = code;
        db.referrals.push({ referrerId: referrer.user.id, referredId: userId, level: 1, totalCommission: 0 });
        bumpNetworkCountsForNewMember(db, referrer.user.id);
        db.profiles[userId] = profile;
        writeDb(db);
        return true;
    },

    claimJackpot(userId) {
        const db = readDb();
        const profile = db.profiles[userId];
        const pool = db.economy.jackpotPool;
        profile.balance += pool;
        db.economy.jackpotPool = 0;
        profile.economy = { ...db.economy };
        db.profiles[userId] = profile;
        writeDb(db);
        return pool;
    },

    resetProfile(userId) {
        const db = readDb();
        const current = db.profiles[userId];
        if (!current) return null;
        const fresh = blankProfile(current.user);
        fresh.settings = current.settings;
        fresh.referral.code = current.referral.code;
        db.listings = db.listings.filter(l => l.sellerId !== userId);
        db.profiles[userId] = fresh;
        writeDb(db);
        return fresh;
    }
};
