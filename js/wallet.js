import { state } from './state.js';
import { ECONOMY_CONFIG } from './economy.js';

export const WALLET_ASSETS = ['USDT', 'USDC'];
export const WALLET_NETWORKS = ['BSC', 'ETH'];

const EMPTY = { USDT_BSC: 0, USDT_ETH: 0, USDC_BSC: 0, USDC_ETH: 0 };

export function walletKey(asset, network) {
    return `${asset}_${network}`;
}

export function ensureWallet(data = state.gameData) {
    if (!data.wallet) data.wallet = { ...EMPTY };
    Object.keys(EMPTY).forEach(k => {
        if (typeof data.wallet[k] !== 'number') data.wallet[k] = 0;
    });
    return data.wallet;
}

export function depositAddress(userId, asset, network) {
    const raw = `${userId || 'guest'}:${asset}:${network}`;
    let hex = '';
    let n = 2166136261;
    for (const ch of raw) {
        n = Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0;
        hex += n.toString(16).padStart(8, '0');
    }
    return '0x' + hex.slice(0, 40);
}

function pushTx(type, amount, description) {
    if (!state.gameData.transactions) state.gameData.transactions = [];
    state.gameData.transactions.unshift({
        id: 'tx-' + Date.now(),
        type,
        amount,
        description,
        at: Date.now()
    });
}

export function simulateDeposit(asset, network, amount) {
    const value = Number(amount);
    if (!WALLET_ASSETS.includes(asset) || !WALLET_NETWORKS.includes(network)) {
        return { ok: false, error: 'asset' };
    }
    if (!Number.isFinite(value) || value <= 0) return { ok: false, error: 'amount' };
    const wallet = ensureWallet();
    const key = walletKey(asset, network);
    wallet[key] = Math.round((wallet[key] + value) * 100) / 100;
    pushTx('deposit', value, `Depósito simulado ${value} ${asset} (${network})`);
    state.save();
    return { ok: true, balance: wallet[key] };
}

export function simulateWithdraw(asset, network, amount, toAddress) {
    const value = Number(amount);
    if (!WALLET_ASSETS.includes(asset) || !WALLET_NETWORKS.includes(network)) {
        return { ok: false, error: 'asset' };
    }
    if (!Number.isFinite(value) || value <= 0) return { ok: false, error: 'amount' };
    if (!toAddress || String(toAddress).trim().length < 6) return { ok: false, error: 'address' };
    const wallet = ensureWallet();
    const key = walletKey(asset, network);
    if (wallet[key] < value) return { ok: false, error: 'balance' };
    const fee = Math.round(value * ECONOMY_CONFIG.WITHDRAW_FEE * 100) / 100;
    const net = Math.round((value - fee) * 100) / 100;
    wallet[key] = Math.round((wallet[key] - value) * 100) / 100;
    pushTx('withdraw', -value, `Saque ${net} ${asset} (${network}) após taxa ${fee}`);
    state.save();
    return { ok: true, fee, net, balance: wallet[key] };
}

function balanceOf(code) {
    if (code === 'RC') return state.gameData.balance;
    return ensureWallet()[code] || 0;
}

function quote(from, to, amount) {
    if (from === to) return null;
    if (from === 'RC' && to !== 'RC') return amount / ECONOMY_CONFIG.CONVERSION_RATE;
    if (to === 'RC' && from !== 'RC') return amount * ECONOMY_CONFIG.CONVERSION_RATE;
    return amount;
}

export function simulateSwap(from, to, amount) {
    const value = Number(amount);
    if (!from || !to || from === to) return { ok: false, error: 'pair' };
    if (!Number.isFinite(value) || value <= 0) return { ok: false, error: 'amount' };
    const received = quote(from, to, value);
    if (received == null) return { ok: false, error: 'pair' };
    if (balanceOf(from) < value) return { ok: false, error: 'balance' };
    if (from === 'RC') state.gameData.balance = Math.round((state.gameData.balance - value) * 100) / 100;
    else ensureWallet()[from] = Math.round((ensureWallet()[from] - value) * 100) / 100;
    const net = Math.round(received * 100) / 100;
    if (to === 'RC') state.gameData.balance = Math.round((state.gameData.balance + net) * 100) / 100;
    else ensureWallet()[to] = Math.round((ensureWallet()[to] + net) * 100) / 100;
    pushTx('swap', net, `Swap ${value} ${label(from)} → ${net} ${label(to)} (taxa 0%)`);
    state.save();
    return { ok: true, received: net };
}

export function label(code) {
    if (code === 'RC') return 'RC';
    return code.replace('_', ' ');
}

export function swapQuote(from, to, amount) {
    const value = Number(amount);
    if (!from || !to || from === to || !Number.isFinite(value) || value <= 0) return 0;
    return Math.round(quote(from, to, value) * 100) / 100;
}
