import { state, ELEMENTS, COLORS } from './state.js';
import { AudioEngine } from './audio.js';
import i18n from './i18n.js';
import { renderAvatar } from './renderer.js';
import { MarketplaceService, AuctionEngine } from './marketplace.js';
import { TeamService } from './team.js';
import { ReferralService } from './referral.js';
import { MissionService } from './missions.js';
import { MatchLogService } from './matchLog.js';
import { BreedingService } from './breeding.js';

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
    
    const matchesEl = document.getElementById('stat-matches');
    const winsEl = document.getElementById('stat-wins');
    const rateEl = document.getElementById('stat-rate');
    if (matchesEl) matchesEl.innerText = state.gameData.matches.length;
    if (winsEl) winsEl.innerText = state.gameData.wins;
    if (rateEl) rateEl.innerText = `${totalProfit > 0 ? '+' : ''}${totalProfit} RC`;
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
    if (!bar) return;
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
            listEl.innerHTML = `<div class="p-10 text-center text-slate-500">${i18n.t('lead-no-players')}</div>`;
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
                        <span class="text-[8px] text-slate-500 uppercase tracking-tighter">${player.wins} ${i18n.t('lead-wins-suffix')}</span>
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

export function updatePreview() {
    if (state.player.element) {
        renderAvatar('selection-preview-avatar', state.player.element, state.player.color, state.player.dna?.skin || 'none');
        const elData = ELEMENTS[state.player.element];
        const nameEl = document.getElementById('preview-name');
        const statBaseEl = document.getElementById('preview-stat-base');
        const statTypeEl = document.getElementById('preview-stat-type');
        if (nameEl) nameEl.innerText = i18n.t(`el-${elData.id}`);
        if (statBaseEl) statBaseEl.innerText = `${i18n.t('sel-preview-strength')}: ${elData.base}`;
        if (statTypeEl) statTypeEl.innerText = `${i18n.t('sel-preview-type')}: ${i18n.t(`el-${elData.id}`).toUpperCase()}`;
    }
    if (state.player.element && state.player.color) {
        const btn = document.getElementById('btn-start');
        if (btn) {
            btn.disabled = false;
            btn.innerText = i18n.t('sel-search');
            btn.classList.remove('bg-slate-800', 'text-slate-500', 'cursor-not-allowed', 'border-slate-950');
            btn.classList.add('bg-gradient-to-r', 'from-yellow-500', 'to-orange-600', 'text-white', 'border-yellow-700', 'animate-pulse');
        }
    }
}

export async function updateShopUI() {
    const combatList = document.getElementById('combat-items-list');
    if (combatList) {
        combatList.innerHTML = '';
        MarketplaceService.getCombatItems().forEach(item => {
            const div = document.createElement('div');
            div.className = 'bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-2 shadow-xl hover:border-yellow-500/50 transition-all';
            div.innerHTML = `
                <div class="text-2xl mb-1">${item.icon}</div>
                <div class="text-[8px] xs:text-[9px] font-black text-white uppercase text-center leading-tight h-6 flex items-center">${i18n.t(item.nameKey)}</div>
                <div class="text-xs font-mono font-bold text-yellow-400">${item.price} RC</div>
                <button onclick="window.app.buyItem('${item.id}', ${item.price})" class="w-full py-2 bg-slate-800 text-yellow-500 text-[9px] font-black uppercase rounded-lg border border-yellow-500/30 active:scale-95 transition-all">${i18n.t('shop-buy-btn')}</button>
            `;
            combatList.appendChild(div);
        });
    }

    const shopList = document.getElementById('shop-list');
    if (shopList) {
        shopList.innerHTML = '';
        MarketplaceService.getShopItems().forEach(item => {
            const div = document.createElement('div');
            div.className = 'bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-2 shadow-xl hover:border-yellow-500/50 transition-all';
            div.innerHTML = `
                <div class="w-16 h-16 xs:w-20 xs:h-20" id="shop-item-${item.id}"></div>
                <div class="text-[10px] font-black text-white uppercase">${i18n.t(`el-${item.element}`)}</div>
                <div class="text-base font-mono font-bold text-yellow-400">${item.price} RC</div>
                <button onclick="window.app.buyRooster('${item.element}', '${item.color}', ${item.price})" class="w-full py-2 bg-yellow-500 text-black text-[9px] font-black uppercase rounded-lg active:scale-95 transition-all">${i18n.t('shop-buy-btn')}</button>
            `;
            shopList.appendChild(div);
            renderAvatar(`shop-item-${item.id}`, item.element, item.color);
        });
    }

    const auctionList = document.getElementById('auction-list');
    if (auctionList) {
        auctionList.innerHTML = `<div class="p-10 text-center text-slate-500 animate-pulse uppercase font-black text-[10px] tracking-widest">${i18n.t('shop-auction-loading')}</div>`;
        
        const items = await AuctionEngine.getAuctionItems();
        auctionList.innerHTML = '';
        
        if (items.length === 0) {
            auctionList.innerHTML = `<div class="p-10 text-center text-slate-600 font-black uppercase tracking-widest border-2 border-dashed border-slate-800 rounded-2xl text-[10px]">${i18n.t('shop-auction-empty')}</div>`;
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'bg-slate-900/50 backdrop-blur-md border border-yellow-500/20 rounded-2xl p-3 flex items-center gap-3 shadow-xl';
            div.innerHTML = `
                <div class="w-14 h-14 flex-shrink-0" id="auc-item-${item.id}"></div>
                <div class="flex-1 min-w-0">
                    <div class="text-[10px] font-black text-white uppercase truncate">Nível ${item.rooster.level}</div>
                    <div class="text-[8px] text-slate-500 truncate">${item.rooster.dna?.code || item.rooster.dna}</div>
                    <div class="text-xs font-mono font-bold text-yellow-400 mt-0.5">${item.currentPrice} RC</div>
                </div>
                <div class="flex flex-col items-end gap-1">
                    <div class="text-[7px] text-green-500 font-black uppercase">${i18n.t('shop-auction-status')}</div>
                    <div class="text-[9px] font-mono text-white bg-black/40 px-1.5 py-0.5 rounded">${item.timeLeft === '---' ? i18n.t('shop-auction-active') : item.timeLeft}</div>
                    <button onclick="window.app.bid('${item.id}', ${item.currentPrice})" class="px-3 py-1 bg-slate-800 text-yellow-500 text-[8px] font-black uppercase rounded-lg border border-yellow-500/50 active:scale-95">${i18n.t('shop-buy-btn')}</button>
                </div>
            `;
            auctionList.appendChild(div);
            renderAvatar(`auc-item-${item.id}`, item.rooster.element, item.rooster.color, item.rooster.dna?.skin || 'none');
        });
    }
}

export function updateInventoryUI() {
    const invList = document.getElementById('inventory-list');
    if (!invList) return;
    invList.innerHTML = '';
    if (state.gameData.inventory.roosters.length === 0) {
        invList.innerHTML = `<div class="col-span-full text-center py-10 text-slate-600 font-black uppercase tracking-widest text-xs">${i18n.t('inv-empty')}</div>`;
        return;
    }
    state.gameData.inventory.roosters.forEach(gal => {
        const inTeam = state.gameData.teams.active.includes(gal.id);
        const hasSkin = gal.dna?.skin && gal.dna.skin !== 'none';
        const div = document.createElement('div');
        div.className = `bg-slate-900/50 backdrop-blur-md border ${inTeam ? 'border-yellow-500/50 shadow-yellow-500/10' : 'border-slate-800'} rounded-2xl p-3 flex items-center gap-3 shadow-xl transition-all`;
        div.innerHTML = `
            <div class="relative flex-shrink-0">
                <div class="w-14 h-14 xs:w-16 xs:h-16" id="inv-item-${gal.id}"></div>
                ${hasSkin ? `<div class="absolute -top-1 -left-1 bg-yellow-500 text-black text-[6px] font-black px-1.5 py-0.5 rounded-full shadow-lg border border-black animate-pulse z-10">${i18n.t('skin-' + gal.dna.skin)}</div>` : ''}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <div class="text-[10px] font-black text-white uppercase truncate">${i18n.t(`el-${gal.element}`)}</div>
                    ${gal.dna?.rarity === 'legendary' ? '<span class="text-[6px] bg-orange-500/20 text-orange-400 px-1 rounded font-black">LEGENDARY</span>' : ''}
                </div>
                <div class="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Nível ${gal.level} • XP ${gal.xp}</div>
                <div class="flex gap-2 mt-2">
                    <button onclick="window.app.toggleTeamMember('${gal.id}')" class="px-2.5 py-1 ${inTeam ? 'bg-red-900/40 text-red-400 border-red-500/30' : 'bg-yellow-500 text-black'} text-[8px] font-black uppercase rounded-lg transition-all border border-transparent active:scale-95">
                        ${inTeam ? i18n.t('inv-remove-btn') : i18n.t('inv-equip-btn')}
                    </button>
                    <button onclick="window.app.sellRooster('${gal.id}')" class="px-2.5 py-1 bg-slate-800 text-slate-400 text-[8px] font-black uppercase rounded-lg border border-slate-700 active:scale-95">
                        ${i18n.t('inv-sell-btn')}
                    </button>
                </div>
            </div>
        `;
        invList.appendChild(div);
        renderAvatar(`inv-item-${gal.id}`, gal.element, gal.color, gal.dna?.skin || 'none');
    });
}

export function updateReferralUI() {
    const stats = ReferralService.getStats();
    const linkInput = document.getElementById('ref-link-input');
    const totalEarnEl = document.getElementById('ref-total-earnings');
    const myCodeEl = document.getElementById('ref-my-code');
    if (linkInput) linkInput.value = ReferralService.getReferralLink();
    if (totalEarnEl) totalEarnEl.innerText = `${stats.totalEarnings} RC`;
    if (myCodeEl) myCodeEl.innerText = stats.code || ReferralService.generateCode();
    
    const levelsList = document.getElementById('ref-levels-list');
    if (levelsList) {
        levelsList.innerHTML = '';
        const labels = ['1º Nível (5%)', '2º Nível (2%)', '3º Nível (1%)', '4º Nível (1%)', '5º Nível (1%)'];
        stats.networkCount.forEach((count, i) => {
            const div = document.createElement('div');
            div.className = 'bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex justify-between items-center';
            div.innerHTML = `
                <span class="text-[10px] text-slate-400 font-bold uppercase">${i18n.t('ref-level-label', {n: i+1, p: [5, 2, 1, 1, 1][i]})}</span>
                <span class="text-sm font-mono font-bold text-white">${count} ${i18n.t('ref-users-suffix')}</span>
            `;
            levelsList.appendChild(div);
        });
    }
}

export function updateMissionsUI() {
    const list = document.getElementById('missions-list');
    if (!list) return;
    list.innerHTML = '';
    
    const missions = MissionService.getDailyMissions();
    const todayMissions = state.gameData.missions || { progress: {}, completed: [] };
    const progress = todayMissions.progress || {};
    const completed = todayMissions.completed || [];

    missions.forEach(m => {
        const isDone = completed.includes(m.id);
        const current = progress[m.type] || 0;
        const percent = Math.min(100, (current / m.target) * 100);
        
        const div = document.createElement('div');
        div.className = `bg-slate-900 border ${isDone ? 'border-green-500/50 bg-green-500/5' : 'border-slate-800'} rounded-3xl p-5 shadow-xl transition-all`;
        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex flex-col">
                    <span class="text-xs font-black text-white uppercase tracking-tighter">${i18n.t(m.descKey)}</span>
                    <span class="text-[10px] text-slate-500 font-bold uppercase mt-1">${i18n.t('miss-reward-label')} <span class="text-yellow-500">${m.reward} RC</span> + <span class="text-blue-400">${m.xp} XP</span></span>
                </div>
                ${isDone ? '<i class="fas fa-check-circle text-green-500 text-xl"></i>' : `<span class="text-[10px] font-mono font-bold text-slate-400">${current}/${m.target}</span>`}
            </div>
            <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r ${isDone ? 'from-green-500 to-emerald-400' : 'from-yellow-500 to-orange-400'} transition-all duration-500" style="width: ${percent}%"></div>
            </div>
        `;
        list.appendChild(div);
    });
}

export function updateTournamentUI() {
    const bracket = document.getElementById('tournament-bracket');
    if (!bracket) return;
    const t = state.gameData.tournament;
    
    if (!t || !t.active) {
        bracket.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-slate-600 uppercase font-black tracking-widest text-center">
                <i class="fas fa-trophy text-4xl mb-4 opacity-20"></i>
                <span data-i18n="tour-no-active">${i18n.t('tour-no-active')}</span>
            </div>
        `;
        const startBtn = document.getElementById('btn-start-tournament');
        if (startBtn) startBtn.classList.remove('hidden');
        return;
    }

    const startBtn = document.getElementById('btn-start-tournament');
    if (startBtn) startBtn.classList.add('hidden');
    bracket.innerHTML = '';
    
    const rounds = [i18n.t('tour-round-qf'), i18n.t('tour-round-sf'), i18n.t('tour-round-final')];
    const container = document.createElement('div');
    container.className = "flex gap-8 min-w-max h-full items-center py-4";

    t.bracket.forEach((participants, rIdx) => {
        const roundCol = document.createElement('div');
        roundCol.className = "flex flex-col gap-4 justify-around h-full";
        roundCol.innerHTML = `<div class="text-[8px] font-black text-slate-500 text-center mb-2">${rounds[rIdx]}</div>`;

        for (let i = 0; i < participants.length; i += 2) {
            const match = document.createElement('div');
            match.className = "flex flex-col gap-1 bg-slate-800/50 p-2 rounded-xl border border-slate-700 min-w-[120px]";
            
            [participants[i], participants[i+1]].forEach(p => {
                const pDiv = document.createElement('div');
                if (!p) {
                    pDiv.className = "text-[10px] text-slate-600 italic";
                    pDiv.innerText = i18n.t('tour-waiting');
                } else {
                    const isNextMatch = t.round === rIdx && (p.id === 'player' || (participants[i]?.id === 'player' || participants[i+1]?.id === 'player'));
                    pDiv.className = `flex justify-between items-center px-2 py-1 rounded ${p.isEliminated ? 'opacity-30 grayscale' : (p.isPlayer ? 'bg-yellow-500/20 text-yellow-500 font-bold' : 'text-white')}`;
                    const elIcon = ELEMENTS[p.element].icon;
                    pDiv.innerHTML = `
                        <div class="flex items-center gap-1">
                            <span class="text-[8px]">${elIcon}</span>
                            <span class="text-[9px] uppercase truncate max-w-[70px]">${p.name}</span>
                        </div>
                        <span class="text-[8px] font-mono opacity-50">Lvl ${p.level}</span>
                    `;
                    if (isNextMatch && !p.isEliminated && p.id === 'player') {
                        pDiv.classList.add('ring-1', 'ring-yellow-500', 'animate-pulse');
                        pDiv.onclick = () => window.app.startTournamentMatch();
                    }
                }
                match.appendChild(pDiv);
            });
            roundCol.appendChild(match);
        }
        container.appendChild(roundCol);
    });

    bracket.appendChild(container);
}

export function updateLogsUI() {
    const list = document.getElementById('logs-list');
    if (!list) return;
    const logs = MatchLogService.getLogs();
    
    if (logs.length === 0) {
        list.innerHTML = `<div class="p-10 text-center text-slate-600 uppercase font-black tracking-widest opacity-50">${i18n.t('logs-empty')}</div>`;
        return;
    }

    list.innerHTML = logs.map(log => `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div class="flex justify-between items-start">
                <div>
                    <div class="text-[8px] text-slate-500 font-black uppercase mb-1">${new Date(log.date).toLocaleString()}</div>
                    <div class="text-xs font-bold text-white uppercase">${log.mode === '3v3' ? i18n.t('logs-mode-3v3') : i18n.t('logs-mode-1v1')}</div>
                </div>
                <div class="px-2 py-1 rounded text-[8px] font-black uppercase ${log.result === 'win' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">${log.result === 'win' ? i18n.t('res-victory') : i18n.t('res-defeat')}</div>
            </div>
            <div class="flex items-center justify-between bg-black/30 p-2 rounded-xl border border-white/5">
                <div class="flex -space-x-2">
                    ${log.playerRoosters.map(r => `<div class="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-[10px]">${ELEMENTS[r.element].icon}</div>`).join('')}
                </div>
                <div class="text-[10px] font-black text-slate-600">VS</div>
                <div class="flex -space-x-2 flex-row-reverse">
                    ${log.opponentRoosters.map(r => `<div class="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-[10px]">${ELEMENTS[r.element].icon}</div>`).join('')}
                </div>
            </div>
            <div class="flex justify-between items-center text-[10px] font-mono">
                <span class="text-slate-500">${i18n.t('res-bet')}: ${log.bet} RC</span>
                <span class="${log.financial >= 0 ? 'text-green-400' : 'text-red-400'}">${log.financial >= 0 ? '+' : ''}${log.financial} RC</span>
            </div>
        </div>
    `).join('');
}

export function updateBreedingUI() {
    const [p1, p2] = window.app.selectedBreedingParents || [null, null];
    const btn = document.getElementById('btn-breed-action');
    const costEl = document.getElementById('breeding-cost');
    if (!btn || !costEl) return;
    
    if (p1 && p2) {
        const cost = BreedingService.getBreedingCost(p1, p2);
        costEl.innerText = `${cost} RC`;
        btn.disabled = state.gameData.balance < cost;
        if (btn.disabled) {
            btn.classList.add('bg-slate-800', 'text-slate-500');
            btn.classList.remove('bg-gradient-to-r', 'from-yellow-500', 'to-orange-600', 'text-white', 'animate-pulse');
        } else {
            btn.classList.remove('bg-slate-800', 'text-slate-500');
            btn.classList.add('bg-gradient-to-r', 'from-yellow-500', 'to-orange-600', 'text-white', 'animate-pulse');
        }
    } else {
        costEl.innerText = `0 RC`;
        btn.disabled = true;
        btn.classList.add('bg-slate-800', 'text-slate-500');
        btn.classList.remove('bg-gradient-to-r', 'from-yellow-500', 'to-orange-600', 'text-white', 'animate-pulse');
    }
}

