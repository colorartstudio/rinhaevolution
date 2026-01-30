import { state, ELEMENTS, COLORS } from './state.js';
import { AudioEngine } from './audio.js';
import i18n from './i18n.js';

export function toggleModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    
    if (modal.classList.contains('modal-visible')) {
        modal.classList.remove('modal-visible');
        modal.classList.add('modal-hidden');
        setTimeout(() => modal.classList.add('hidden'), 300);
    } else {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('modal-hidden');
            modal.classList.add('modal-visible');
        }, 10);
    }
}

export function updateBalanceUI() {
    const headerBal = document.getElementById('header-balance');
    const walletBal = document.getElementById('wallet-balance-display');
    if (headerBal) headerBal.innerText = `${state.gameData.balance} RC`;
    if (walletBal) walletBal.innerText = `${state.gameData.balance} RC`;
}

export function updateSettingsUI() {
    const btn = document.getElementById('btn-sound-toggle');
    const knob = btn.firstElementChild;
    if (state.gameData.settings.mute) {
        btn.className = "w-12 h-6 bg-slate-600 rounded-full relative transition-colors duration-300";
        knob.className = "w-5 h-5 bg-slate-400 rounded-full absolute top-0.5 left-0.5 transition-all duration-300 shadow-md";
    } else {
        btn.className = "w-12 h-6 bg-green-500 rounded-full relative transition-colors duration-300";
        knob.className = "w-5 h-5 bg-white rounded-full absolute top-0.5 left-6 transition-all duration-300 shadow-md";
    }
    
    // Update language select if exists
    const langSelect = document.getElementById('settings-lang-select');
    if (langSelect) langSelect.value = state.gameData.settings.lang;
}

export function updateRankUI() {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    if (state.gameData.matches.length === 0) {
        listEl.innerHTML = `<p class="text-center text-slate-600 text-sm py-4" data-i18n="sys-no-history">${i18n.t('sys-no-history')}</p>`;
    }
    
    let totalProfit = 0;
    state.gameData.matches.forEach(m => {
        const isWin = m.result === 'win';
        const isDraw = m.result === 'draw';
        const elIcon = ELEMENTS[m.element].icon;
        const colHex = COLORS[m.color].hex;
        const borderClass = isWin ? 'border-green-500' : (isDraw ? 'border-yellow-500' : 'border-red-500');
        const profitText = m.financial > 0 ? `+${m.financial}` : `${m.financial}`;
        const profitClass = m.financial > 0 ? 'text-green-400' : (m.financial < 0 ? 'text-red-400' : 'text-yellow-400');
        
        const resKey = isWin ? 'res-victory' : (isDraw ? 'res-draw' : 'res-defeat');
        
        const html = `
        <div class="bg-slate-800 p-3 rounded-lg flex items-center justify-between border-l-4 ${borderClass}">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-700" style="border: 2px solid ${colHex}">${elIcon}</div>
                <div>
                    <div class="text-sm font-bold text-white">${i18n.t(resKey)}</div>
                    <div class="text-[10px] text-slate-500">${m.date}</div>
                </div>
            </div>
            <span class="text-sm font-mono font-bold ${profitClass}">${profitText} RC</span>
        </div>`;
        listEl.insertAdjacentHTML('beforeend', html);
        totalProfit += m.financial || 0;
    });
    
    document.getElementById('stat-matches').innerText = state.gameData.matches.length;
    document.getElementById('stat-wins').innerText = state.gameData.wins;
    document.getElementById('stat-rate').innerText = `${totalProfit > 0 ? '+' : ''}${totalProfit} RC`;
}

export function showFloatingText(el, text, side, isCrit) {
    const div = document.createElement('div');
    div.className = isCrit ? 'damage-number damage-crit' : 'damage-number';
    div.innerText = text + (isCrit ? '!' : '');
    if (side === 'center') {
        div.style.left = '50%'; div.style.top = '50%'; div.style.transform = 'translate(-50%, -50%)';
    } else {
        if (side === 'left') { div.style.left = '10%'; div.style.top = '10%'; } else { div.style.right = '10%'; div.style.top = '10%'; }
    }
    el.appendChild(div);
    setTimeout(() => div.remove(), 800);
}

export function updateHealth(id, dmg) {
    const bar = document.getElementById(id);
    let w = parseFloat(bar.style.width) || 100;
    w = Math.max(0, w - dmg);
    bar.style.width = w + '%';
    if (w < 30) bar.classList.add('bg-red-600');
}

export function updateEnergy(id, val, max) {
    const bar = document.getElementById(id);
    const text = document.getElementById(id.replace('bar', 'text'));
    const percent = (val / max) * 100;
    if (bar) bar.style.width = percent + '%';
    if (text) text.innerText = `${Math.round(val)}/${max} MP`;
}

export async function updateLeaderboardUI() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;

    try {
        const { LeaderboardService } = await import('./leaderboard.js');
        const topPlayers = await LeaderboardService.getTopPlayers();

        listEl.innerHTML = '';
        if (topPlayers.length === 0) {
            listEl.innerHTML = '<div class="p-10 text-center text-slate-500">Nenhum jogador encontrado.</div>';
            return;
        }

        topPlayers.forEach((player, index) => {
            const isTop3 = index < 3;
            const medalColor = index === 0 ? 'text-yellow-400' : (index === 1 ? 'text-slate-300' : (index === 2 ? 'text-orange-400' : 'text-slate-500'));
            const bgClass = index % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-800/30';
            
            const html = `
            <div class="p-4 grid grid-cols-12 items-center ${bgClass} transition-colors hover:bg-slate-800/60">
                <div class="col-span-2 text-center font-display ${medalColor} ${isTop3 ? 'text-xl' : 'text-sm'}">
                    ${isTop3 ? `<i class="fas fa-crown"></i>` : index + 1}
                </div>
                <div class="col-span-6 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white border border-slate-600 uppercase">
                        ${player.username.substring(0, 2)}
                    </div>
                    <div class="flex flex-col">
                        <span class="text-sm font-bold text-white">${player.username}</span>
                        <span class="text-[8px] text-slate-500 uppercase tracking-tighter">${player.wins} vitórias</span>
                    </div>
                </div>
                <div class="col-span-4 text-right">
                    <span class="text-sm font-mono font-bold text-yellow-400">${player.balance.toLocaleString()} RC</span>
                </div>
            </div>`;
            listEl.insertAdjacentHTML('beforeend', html);
        });
    } catch (err) {
        listEl.innerHTML = '<div class="p-10 text-center text-red-500">Erro ao carregar ranking.</div>';
    }
}
