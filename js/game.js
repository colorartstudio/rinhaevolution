import { state, ELEMENTS, COLORS, ARENAS } from './state.js';
import { AudioEngine } from './audio.js';
import { renderAvatar, showDeadEyes } from './renderer.js';
import { 
    updateBalanceUI, 
    updateSettingsUI, 
    updateRankUI, 
    showFloatingText, 
    updateHealth,
    updateEnergy,
    toggleModal 
} from './ui.js';
import i18n from './i18n.js';
import { EconomyService } from './economy.js';
import { TeamService } from './team.js';
import { MissionService, MISSION_TYPES } from './missions.js';
import { TournamentService } from './tournament.js';
import { MatchLogService } from './matchLog.js';

import { SkillService, SKILLS } from './skills.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
let playerActionResolve = null;

// Helper defensivo para evitar erros de elemento nulo
const safeSetText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
};

const safeSetHTML = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
};

const safeAddClass = (id, className) => {
    const el = document.getElementById(id);
    if (el) el.classList.add(className);
};

const safeRemoveClass = (id, className) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove(className);
};

const safeSetStyle = (id, prop, value) => {
    const el = document.getElementById(id);
    if (el) el.style[prop] = value;
};

// Função para resetar o estado visual de todos os avatares (1v1 e 3v3)
function resetAllAvatarStates() {
    // Reset 1v1
    const pAv = document.getElementById('player-avatar');
    if (pAv) pAv.className = "w-36 h-36 md:w-52 md:h-52 transition-transform duration-300";
    
    const cAv = document.getElementById('cpu-avatar');
    if (cAv) cAv.className = "w-36 h-36 md:w-52 md:h-52 scale-x-[-1] transition-transform duration-300";

    // Reset 3v3
    for (let i = 0; i < 3; i++) {
        const pSlot = document.getElementById(`player-avatar-${i}`);
        if (pSlot) pSlot.className = "w-20 h-20 xs:w-24 xs:h-24 md:w-32 md:h-32 transition-all duration-300";
        
        const cSlot = document.getElementById(`cpu-avatar-${i}`);
        if (cSlot) cSlot.className = "w-20 h-20 xs:w-24 xs:h-24 md:w-32 md:h-32 scale-x-[-1] transition-all duration-300";
        
        // Limpa a seta de target se existir
        const target = document.getElementById(`cpu-target-${i}`);
        if (target) target.classList.add('hidden');
    }
}

export async function useItem(itemId, roosterIdx = null) {
    const item = state.gameData.inventory.items.find(i => i.id === itemId);
    if (!item || item.count <= 0) return;

    const activeRoosters = TeamService.getTeamRoosters();
    
    if (activeRoosters.length === 0) {
        alert(i18n.t('inv-no-rooster') || 'Você não tem galos no time para usar este item!');
        return;
    }

    let targetIdx = roosterIdx;
    
    // Se não passou o índice, tenta descobrir qual galo precisa de HP (fora de rinha)
    if (targetIdx === null) {
        if (activeRoosters.length === 1) {
            targetIdx = 0;
        } else {
            // Engenharia: Se o usuário clica direto na mochila, 
            // mostramos um pequeno menu seletor ao invés de prompt()
            if (window.app.showRoosterSelectorForItem) {
                window.app.showRoosterSelectorForItem(itemId);
                return;
            }
            // Fallback se o seletor não estiver pronto
            targetIdx = 0;
        }
    }

    const target = activeRoosters[targetIdx];
    if (!target) return;

    if (item.type === 'heal') {
        const currentHP = target.hp_current || target.hp || target.hp_max || 100;
        const maxHP = target.hp_max || 100;
        
        if (currentHP >= maxHP) {
            alert(i18n.t('inv-hp-full') || 'Este galo já está com a vida cheia!');
            return;
        }

        const healValue = Math.round(maxHP * (item.value / 100));
        target.hp_current = Math.min(maxHP, currentHP + healValue);
        target.hp = target.hp_current; 
        item.count--;
        
        if (state.gameData.user && state.gameData.user.id) {
            try {
                const { supabase } = await import('./supabase.js');
                await supabase.from('roosters')
                    .update({ hp_current: target.hp_current })
                    .eq('id', target.id);
            } catch (err) {
                console.warn("Falha ao sincronizar HP com Supabase:", err);
            }
        }
        
        AudioEngine.playClick();
        
        // Atualiza a UI se estiver na mochila
        if (window.app.updateInventoryUI) window.app.updateInventoryUI();
        
    } else if (item.type === 'energy') {
        item.count--;
        AudioEngine.playClick();
        if (window.app.updateInventoryUI) window.app.updateInventoryUI();
    }

    state.save();
}

export function handleSkillClick(skillId) {
    if (playerActionResolve) {
        playerActionResolve({ type: 'skill', id: skillId });
        playerActionResolve = null;
        document.getElementById('skill-panel').classList.add('hidden');
        document.getElementById('item-menu').classList.add('hidden');
    }
}

export function handleItemClick(itemId) {
    if (playerActionResolve) {
        playerActionResolve({ type: 'item', id: itemId });
        playerActionResolve = null;
        document.getElementById('skill-panel').classList.add('hidden');
        document.getElementById('item-menu').classList.add('hidden');
    }
}

export function toggleItemMenu() {
    const menu = document.getElementById('item-menu');
    menu.classList.toggle('hidden');
    if (!menu.classList.contains('hidden')) {
        renderItemMenu();
    }
}

function renderItemMenu() {
    const container = document.getElementById('item-menu');
    container.innerHTML = '';
    state.gameData.inventory.items.forEach(item => {
        if (item.count > 0) {
            const btn = document.createElement('button');
            btn.onclick = () => handleItemClick(item.id);
            btn.className = "flex justify-between items-center p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-all";
            btn.innerHTML = `
                <div class="flex flex-col text-left">
                    <span class="text-[9px] font-bold text-white uppercase">${i18n.t(item.nameKey) || item.name}</span>
                    <span class="text-[7px] text-slate-500 uppercase">${item.type === 'heal' ? i18n.t('shop-item-hp-desc') : i18n.t('shop-item-mp-desc')}</span>
                </div>
                <span class="bg-yellow-500 text-black text-[9px] font-black px-2 rounded-full">${item.count}</span>
            `;
            container.appendChild(btn);
        }
    });
    if (container.innerHTML === '') {
        container.innerHTML = `<div class="col-span-2 text-center text-[8px] text-slate-500 uppercase py-2">${i18n.t('inv-empty')}</div>`;
    }
}

export function selectBet(amount) {
    state.currentBet = amount;
    AudioEngine.playClick();
    [50, 100, 500].forEach(val => {
        const btn = document.getElementById(`btn-bet-${val}`);
        if (btn) {
            if (val === amount) {
                btn.classList.add('border-yellow-500', 'bg-white/10');
                btn.classList.remove('border-slate-700');
            } else {
                btn.classList.remove('border-yellow-500', 'bg-white/10');
                btn.classList.add('border-slate-700');
            }
        }
    });
}

export async function checkBalanceAndStart() {
    // Engenharia de Segurança: Login Obrigatório para Batalhas
    if (!state.gameData.user || !state.gameData.user.id) {
        alert(i18n.t('btl-error-login'));
        window.app.showLogin();
        return;
    }

    if (state.gameMode === '3v3') {
        const team = TeamService.getTeamRoosters();
        if (team.length < 3) {
            alert(i18n.t('btl-error-team'));
            return;
        }
    }

    if (state.gameData.balance < state.currentBet) {
        alert(i18n.t('sel-balance-error'));
        toggleModal('wallet-modal');
        return;
    }

    // Bloqueia o botão para evitar cliques múltiplos
    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
        btnStart.disabled = true;
        btnStart.innerText = i18n.t('btl-processing');
    }

    // Chamada antecipada para o Backend (Supabase RPC)
    try {
        const { supabase } = await import('./supabase.js');
        
        // Chamada da RPC que processa RNG e Economia no servidor
        const { data, error } = await supabase.rpc('process_evolution_battle', {
            p_player_id: state.gameData.user.id,
            p_element: state.player.element,
            p_color: state.player.color,
            p_bet_amount: state.currentBet,
            p_game_mode: state.gameMode || '1v1'
        });

        if (error) throw error;

        // Armazena o resultado oficial do servidor
        state.battleResult = data;
        console.log("Resultado oficial do servidor recebido:", data);

        // Atualiza dados locais com base no retorno do servidor
        state.gameData.balance = data.financial.newBalance;
        state.cpu.element = data.cpu.element;
        state.cpu.color = data.cpu.color;
        state.cpuTeam = data.cpuTeam || [];
        
        // Encontra a arena sorteada pelo servidor nas arenas locais
        const serverArenaId = data.arena; // 'fire', 'earth', etc.
        state.currentArena = ARENAS.find(a => a.id === serverArenaId) || ARENAS[0];

        // Inicia a sequência visual (roleta e luta)
        startRouletteSequence();

    } catch (err) {
        console.error("Erro ao processar batalha no servidor:", err);
        alert(i18n.t('btl-error-server'));
        if (btnStart) {
            btnStart.disabled = false;
            btnStart.innerText = i18n.t('sel-search');
        }
    }
}

export function startRouletteSequence() {
    AudioEngine.init();
    // state.currentArena já foi definido pelo servidor na função checkBalanceAndStart
    if (!state.currentArena) {
        state.currentArena = ARENAS[Math.floor(Math.random() * ARENAS.length)];
    }

    state.inBattle = true;

    document.getElementById('screen-selection').classList.add('hidden');
    document.getElementById('screen-battle').classList.remove('hidden');
    document.getElementById('battle-stage').style.opacity = '0';
    document.getElementById('roulette-overlay').style.display = 'flex';
    document.getElementById('roulette-overlay').style.opacity = '1';
    document.getElementById('bottom-nav').classList.add('hidden');

    const rName = document.getElementById('roulette-name');
    const rIcon = document.getElementById('roulette-icon');
    const bg = document.getElementById('arena-bg');
    let iterations = 0;
    
    const interval = setInterval(() => {
        const rnd = ARENAS[Math.floor(Math.random() * ARENAS.length)];
        rName.innerText = i18n.t(`arena-${rnd.id}`);
        rIcon.innerText = rnd.icon;
        bg.className = `absolute inset-0 z-0 transition-colors duration-100 opacity-80 ${rnd.class}`;
        iterations++;
        if (iterations % 4 === 0) AudioEngine.playTone(150, 'square', 0.05, 0.05);
        if (iterations >= 20) {
            clearInterval(interval);
            finalizeRoulette();
        }
    }, 100);
}

function finalizeRoulette() {
    AudioEngine.playTone(400, 'square', 0.2, 0.1);
    
    safeSetText('roulette-name', i18n.t(`arena-${state.currentArena.id}`));
    safeSetText('roulette-icon', state.currentArena.icon);
    safeAddClass('roulette-name', 'scale-125');
    safeAddClass('roulette-name', 'text-yellow-400');
    
    const bg = document.getElementById('arena-bg');
    if (bg) bg.className = `absolute inset-0 z-0 transition-colors duration-300 opacity-80 ${state.currentArena.class}`;
    
    safeAddClass('roulette-flash', 'anim-flash');

    safeSetText('arena-icon', state.currentArena.icon);
    safeSetText('arena-name', i18n.t(`arena-${state.currentArena.id}`));
    const bEl = ELEMENTS[state.currentArena.bonusElement];
    safeSetText('arena-bonus-desc', `${i18n.t('btl-bonus')}: ${i18n.t(`el-${bEl.id}`)}`);

    setTimeout(() => {
        safeSetStyle('roulette-overlay', 'opacity', '0');
        setTimeout(() => {
            safeSetStyle('roulette-overlay', 'display', 'none');
        }, 500);
        startGame();
    }, 1500);
}

function startGame() {
    const pGrid = document.getElementById('player-avatars-grid');
    const cGrid = document.getElementById('cpu-avatars-grid');

    if (state.gameMode === '3v3') {
        // No modo 3v3, usamos a estrutura fixa do index.html que já contém as barras de HP/Energia
        // Removemos qualquer avatar dinâmico de 1v1 que possa ter sido criado
        const oldP = document.getElementById('player-avatar');
        if (oldP) oldP.remove();
        const oldC = document.getElementById('cpu-avatar');
        if (oldC) oldC.remove();

        // Garantimos que o grid está no modo 3 colunas
        if (pGrid) pGrid.className = "grid grid-cols-3 gap-4 w-full mb-6";
        if (cGrid) cGrid.className = "grid grid-cols-3 gap-4 w-full";

        const pTeam = TeamService.getTeamRoosters();
        for (let i = 0; i < 3; i++) {
            const slotId = `player-slot-${i}`;
            if (pTeam[i]) {
                safeRemoveClass(slotId, 'hidden');
                renderAvatar(`player-avatar-${i}`, pTeam[i].element, pTeam[i].color, pTeam[i].dna?.skin || 'none');
            } else {
                safeAddClass(slotId, 'hidden');
            }
        }

        const cTeam = state.cpuTeam || [];
        for (let i = 0; i < 3; i++) {
            const slotId = `cpu-slot-${i}`;
            if (cTeam[i]) {
                safeRemoveClass(slotId, 'hidden');
                renderAvatar(`cpu-avatar-${i}`, cTeam[i].element, cTeam[i].color, 'none');
            } else if (i === 0 && cTeam.length === 0) {
                // Fallback para CPU única se cpuTeam estiver vazio
                safeRemoveClass(slotId, 'hidden');
                renderAvatar(`cpu-avatar-${i}`, state.cpu.element, state.cpu.color);
            } else {
                safeAddClass(slotId, 'hidden');
            }
        }
    } else {
        // No modo 1v1, ocultamos os slots de time e criamos os avatares centrais amplos
        for (let i = 0; i < 3; i++) {
            const pSlot = document.getElementById(`player-slot-${i}`);
            const cSlot = document.getElementById(`cpu-slot-${i}`);
            if (pSlot) pSlot.classList.add('hidden');
            if (cSlot) cSlot.classList.add('hidden');
        }

        // Alteramos o grid para centralizar o avatar único
        if (pGrid) pGrid.className = "flex justify-center w-full mb-6";
        if (cGrid) cGrid.className = "flex justify-center w-full";

        // Removemos avatares antigos se existirem
        const oldP = document.getElementById('player-avatar');
        if (oldP) oldP.remove();
        const oldC = document.getElementById('cpu-avatar');
        if (oldC) oldC.remove();

        const pDiv = document.createElement('div');
        pDiv.id = 'player-avatar';
        pDiv.className = "w-36 h-36 md:w-52 md:h-52 transition-transform duration-300";
        if (pGrid) pGrid.appendChild(pDiv);
        renderAvatar('player-avatar', state.player.element, state.player.color);

        const cDiv = document.createElement('div');
        cDiv.id = 'cpu-avatar';
        cDiv.className = "w-36 h-36 md:w-52 md:h-52 scale-x-[-1] transition-transform duration-300";
        if (cGrid) cGrid.appendChild(cDiv);
        renderAvatar('cpu-avatar', state.cpu.element, state.cpu.color);
    }

    safeSetText('player-name-display', state.gameData.user.name);
    safeSetText('cpu-name-display', i18n.t('res-cpu'));

    safeSetStyle('p-hp-bar', 'width', '100%');
    safeSetStyle('c-hp-bar', 'width', '100%');
    safeSetStyle('battle-stage', 'opacity', '1');
    
    setTimeout(battleSequence, 1000);
}



function showFinalResult3v3(playerWon, report) {
    const pGrid = document.getElementById('player-avatars-grid');
    const cGrid = document.getElementById('cpu-avatars-grid');
    
    if (playerWon === true) {
        if (pGrid) pGrid.classList.add('anim-winner-l');
        if (cGrid) cGrid.classList.add('opacity-50', 'grayscale');
        AudioEngine.playWin();
    } else if (playerWon === false) {
        if (cGrid) cGrid.classList.add('anim-winner-r');
        if (pGrid) pGrid.classList.add('opacity-50', 'grayscale');
        AudioEngine.playLoss();
    } else {
        // Empate
        if (pGrid) pGrid.classList.add('opacity-80');
        if (cGrid) cGrid.classList.add('opacity-80');
        AudioEngine.playClick();
    }
    
    showDetailedResult(playerWon, report);
}

async function showPlayerSkills(rooster) {
    const panel = document.getElementById('skill-panel');
    const container = document.getElementById('skill-buttons');
    const timerEl = document.getElementById('turn-timer');
    const skills = SkillService.getSkillsForRooster(rooster.element, rooster.level);
    
    let timerInterval = null;

    const cleanupTimer = () => {
        if (timerInterval) clearInterval(timerInterval);
        if (timerEl) timerEl.classList.add('hidden');
    };

    container.innerHTML = '';
    skills.forEach(skill => {
        const canAfford = (rooster.energy || 0) >= skill.cost;
        const btn = document.createElement('button');
        if (canAfford) {
            btn.onclick = () => {
                cleanupTimer();
                handleSkillClick(skill.id);
            };
            btn.className = "flex flex-col items-center justify-center p-3 bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border-2 border-slate-700 hover:border-yellow-500/50 rounded-2xl transition-all active:scale-95 group shadow-lg ring-1 ring-yellow-500/20";
        } else {
            btn.className = "flex flex-col items-center justify-center p-3 bg-slate-900 border-2 border-slate-800 rounded-2xl opacity-40 cursor-not-allowed shadow-inner";
        }
        btn.innerHTML = `
            <span class="text-[11px] font-black text-white uppercase tracking-wider ${canAfford ? 'group-hover:text-yellow-400' : 'text-slate-600'}">${i18n.t(skill.nameKey)}</span>
            <div class="flex items-center gap-2 mt-1">
                <div class="flex items-center bg-black/40 px-1.5 py-0.5 rounded-md border border-white/5">
                    <span class="text-[9px] text-yellow-500/80 font-bold">${skill.multiplier}x</span>
                </div>
                <div class="flex items-center bg-blue-900/30 px-1.5 py-0.5 rounded-md border border-blue-500/20">
                    <span class="text-[9px] ${canAfford ? 'text-blue-300' : 'text-red-400'} font-black">${skill.cost} MP</span>
                </div>
            </div>
        `;
        container.appendChild(btn);
    });
    
    panel.classList.remove('hidden');
    
    // Timer Logic: Ativado para 15 segundos (Padrão Competitivo)
    let timeLeft = 15;
    if (timerEl) {
        timerEl.classList.remove('hidden');
        timerEl.innerText = `${timeLeft}s`;
    }

    timerInterval = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.innerText = `${timeLeft}s`;
        
        if (timeLeft <= 0) {
            cleanupTimer();
            // Auto-select first affordable skill or just first skill
            const defaultSkill = skills.find(s => s.cost <= (rooster.energy || 0)) || skills[0];
            if (defaultSkill) {
                handleSkillClick(defaultSkill.id);
            } else {
                handleSkillClick('f1'); // Fallback absoluto
            }
        }
    }, 1000);

    // Override toggleItemMenu to also cleanup timer if an item is selected
    const originalHandleItemClick = window.app.handleItemClick;
    window.app.handleItemClick = (itemId) => {
        cleanupTimer();
        originalHandleItemClick(itemId);
    };
    
    return new Promise(resolve => {
        playerActionResolve = resolve;
    });
}

function triggerHaptic(type = 'light') {
    if (!window.navigator.vibrate) return;
    if (type === 'light') window.navigator.vibrate(20);
    else if (type === 'medium') window.navigator.vibrate(50);
    else if (type === 'heavy') window.navigator.vibrate([100, 50, 100]);
}

async function battleSequence() {
    if (state.gameMode === '3v3') {
        await battleSequence3v3();
        return;
    }

    const pRooster = TeamService.getTeamRoosters()[0] || state.constructor.createRooster(state.player.element, state.player.color);
    const cRooster = state.constructor.createRooster(state.cpu.element, state.cpu.color, pRooster.level);
    
    const isTieBattle = isIdentical(pRooster, cRooster);

    // Initial UI Setup
    pRooster.energy = pRooster.energy_max || 100;
    cRooster.energy = cRooster.energy_max || 100;
    updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max || 100);
    updateEnergy('c-en-bar', cRooster.energy, cRooster.energy_max || 100);

    let pHP = pRooster.hp_max;
    let cHP = cRooster.hp_max;
    
    const pAv = document.getElementById('player-avatar');
    const cAv = document.getElementById('cpu-avatar');

    let pStatus = { shield: 1, def: 1, burn: 0, stun: false, element: pRooster.element, color: pRooster.color };
    let cStatus = { shield: 1, def: 1, burn: 0, stun: false, element: cRooster.element, color: cRooster.color };

    // Turn Loop (Até a morte ou limite de segurança)
    let round = 1;
    const MAX_ROUNDS = 100; // Aumentado para permitir batalhas longas com cura

    // Engenharia de Animação: Sincronização de Dano
    let dmgPerRoundC = Math.round(cRooster.hp_max / 8);
    let dmgPerRoundP = Math.round(pRooster.hp_max / 8);
    
    while (pHP > 0 && cHP > 0 && round <= MAX_ROUNDS) {
        // Energy Regen per turn
        pRooster.energy = Math.min(pRooster.energy_max || 100, pRooster.energy + 20);
        cRooster.energy = Math.min(cRooster.energy_max || 100, cRooster.energy + 20);
        updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max || 100);
        updateEnergy('c-en-bar', cRooster.energy, cRooster.energy_max || 100);

        // --- PLAYER TURN ---
        if (!pStatus.stun) {
            const action = await showPlayerSkills(pRooster);
            
            if (action.type === 'skill') {
                const skill = SKILLS[pRooster.element].find(s => s.id === action.id);
                pRooster.energy -= skill.cost;
                updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max);

                const advDmg = calculateAdvancedDamage(pRooster.atk, skill.multiplier, pRooster.level, state.currentArena, pRooster.element, pRooster.color, cStatus);
                let dmgC = 0;
                
                if (state.battleResult) {
                    dmgC = dmgPerRoundC;
                } else if (isTieBattle) {
                    dmgC = Math.round(cRooster.hp_max / MAX_ROUNDS);
                } else {
                    dmgC = Math.max(1, Math.round(advDmg.value * cStatus.shield * (1 / cStatus.def) * 0.12));
                }

                cStatus.shield = 1;

                // Frenesi: Animações mais rápidas
                if (pAv) pAv.classList.add('anim-lunge-up', 'anim-wing-flap'); AudioEngine.playAttack(); await sleep(300);
                if (cAv) cAv.classList.add('anim-hit'); AudioEngine.playHit(); triggerHaptic('light');
                
                // Feedback visual de Crítico/Fraco
                let floatMsg = `-${dmgC}`;
                if (advDmg.type === 'critical') floatMsg = `${i18n.t('btl-critical')} ${floatMsg}`;
                if (advDmg.type === 'weak') floatMsg = `${i18n.t('btl-weak')} ${floatMsg}`;
                
                if (cAv) showFloatingText(cAv, floatMsg, 'right', advDmg.type === 'critical'); 
                updateHealth('c-hp-bar', (dmgC / cRooster.hp_max) * 100);
                cHP -= dmgC;

                if (skill.effect === 'burn' && Math.random() < skill.chance) cStatus.burn = 3;
                if (skill.effect === 'stun' && Math.random() < skill.chance) cStatus.stun = true;
                if (skill.effect === 'shield') pStatus.shield = skill.value;
                if (skill.effect === 'def') pStatus.def = skill.value;
                if (skill.effect === 'heal') {
                    const heal = Math.round(pRooster.hp_max * (skill.value / 100));
                    pHP = Math.min(pRooster.hp_max, pHP + heal);
                    updateHealth('p-hp-bar', -(heal / pRooster.hp_max) * 100);
                    if (pAv) showFloatingText(pAv, `+${heal}`, 'left', false);
                    // Atualiza estado global
                    pRooster.hp_current = pHP;
                }
            } else if (action.type === 'item') {
                const item = state.gameData.inventory.items.find(i => i.id === action.id);
                item.count--;
                if (item.type === 'heal') {
                    const heal = Math.round(pRooster.hp_max * (item.value / 100));
                    pHP = Math.min(pRooster.hp_max, pHP + heal);
                    updateHealth('p-hp-bar', -(heal / pRooster.hp_max) * 100);
                    if (pAv) showFloatingText(pAv, `+${heal} 🧪`, 'left', false);
                    pRooster.hp_current = pHP;
                } else if (item.type === 'energy') {
                    pRooster.energy = Math.min(pRooster.energy_max || 100, pRooster.energy + item.value);
                    updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max || 100);
                    if (pAv) showFloatingText(pAv, `+${item.value} ⚡`, 'left', false);
                }
                AudioEngine.playClick();
                state.save(); // Salva consumo de item e HP atual
                await sleep(500);
            }

            await sleep(400); 
            if (pAv) pAv.classList.remove('anim-lunge-up', 'anim-wing-flap'); 
            if (cAv) cAv.classList.remove('anim-hit'); 
            await sleep(600);
        } else {
            if (pAv) showFloatingText(pAv, i18n.t('btl-stunned'), 'left', false);
            pStatus.stun = false;
            await sleep(1000);
        }

        if (cHP <= 0) break;

        // Apply Burn
        if (cStatus.burn > 0) {
            const bDmg = 15;
            cHP -= bDmg;
            updateHealth('c-hp-bar', (bDmg / cRooster.hp_max) * 100);
            showFloatingText(cAv, `-${bDmg} ${i18n.t('btl-float-burn')}`, 'right', false);
            cStatus.burn--;
            await sleep(800);
        }

        if (cHP <= 0) break;

        // --- CPU TURN ---
        if (!cStatus.stun) {
            const cSkills = SkillService.getSkillsForRooster(cRooster.element, cRooster.level);
            const affordableSkills = cSkills.filter(s => s.cost <= cRooster.energy);
            const cSkill = affordableSkills.length > 0 ? affordableSkills[Math.floor(Math.random() * affordableSkills.length)] : cSkills[0];
            
            cRooster.energy -= cSkill.cost;
            updateEnergy('c-en-bar', cRooster.energy, cRooster.energy_max);

            const advDmgP = calculateAdvancedDamage(cRooster.atk, cSkill.multiplier, cRooster.level, state.currentArena, cRooster.element, cRooster.color, pStatus);
            let dmgP = 0;
            
            if (state.battleResult) {
                dmgP = dmgPerRoundP;
            } else if (isTieBattle) {
                dmgP = Math.round(pRooster.hp_max / MAX_ROUNDS);
            } else {
                dmgP = Math.max(1, Math.round(advDmgP.value * pStatus.shield * (1 / pStatus.def) * 0.12));
            }

            pStatus.shield = 1;

            if (cAv) cAv.classList.add('anim-lunge-down', 'anim-wing-flap'); AudioEngine.playAttack(); await sleep(300);
            if (pAv) pAv.classList.add('anim-hit'); AudioEngine.playHit(); triggerHaptic('medium');
            
            let floatMsgP = `-${dmgP}`;
            if (advDmgP.type === 'critical') floatMsgP = `${i18n.t('btl-critical')} ${floatMsgP}`;
            if (advDmgP.type === 'weak') floatMsgP = `${i18n.t('btl-weak')} ${floatMsgP}`;

            if (pAv) showFloatingText(pAv, floatMsgP, 'left', advDmgP.type === 'critical'); 
            updateHealth('p-hp-bar', (dmgP / pRooster.hp_max) * 100);
            pHP -= dmgP;

            if (cSkill.effect === 'burn' && Math.random() < cSkill.chance) pStatus.burn = 3;
            if (cSkill.effect === 'stun' && Math.random() < cSkill.chance) pStatus.stun = true;
            if (cSkill.effect === 'shield') cStatus.shield = cSkill.value;
            if (cSkill.effect === 'def') cStatus.def = cSkill.value;

            await sleep(400); 
            if (cAv) cAv.classList.remove('anim-lunge-down', 'anim-wing-flap'); 
            if (pAv) pAv.classList.remove('anim-hit'); 
            await sleep(600);
        } else {
            if (cAv) showFloatingText(cAv, i18n.t('btl-stunned'), 'right', false);
            cStatus.stun = false;
            await sleep(1000);
        }

        // Apply Burn Player
        if (pStatus.burn > 0) {
            const bDmg = 15;
            pHP -= bDmg;
            updateHealth('p-hp-bar', (bDmg / pRooster.hp_max) * 100);
            showFloatingText(pAv, `-${bDmg} ${i18n.t('btl-float-burn')}`, 'left', false);
            pStatus.burn--;
            await sleep(800);
        }
        
        round++;
    }

    let result = 'loss';
    if (state.battleResult) {
        result = state.battleResult.result.toLowerCase();
    } else if (isTieBattle || (pHP <= 0 && cHP <= 0) || (round > MAX_ROUNDS && pHP === cHP)) {
        result = 'tie';
    } else if (pHP > cHP) {
        result = 'win';
    }

    if (result === 'win') {
        pAv.classList.add('anim-winner-l'); 
        cAv.classList.add('anim-ko-r', 'grayscale', 'opacity-60'); 
        showDeadEyes(cAv); 
        AudioEngine.playWin(); 
        triggerHaptic('heavy');
    } else if (result === 'loss') {
        cAv.classList.add('anim-winner-r'); 
        pAv.classList.add('anim-ko-l', 'grayscale', 'opacity-60'); 
        showDeadEyes(pAv); 
        AudioEngine.playLoss(); 
        triggerHaptic('heavy');
    } else {
        // Tie visual: Both looking a bit tired but no KO
        pAv.classList.add('opacity-80');
        cAv.classList.add('opacity-80');
        AudioEngine.playClick();
    }

    const winValue = result === 'win' ? true : (result === 'loss' ? false : null);
    saveMatchResult(winValue, pRooster.element, pRooster.color);
    await sleep(2500); 
    
    // Recalcular bônus para o relatório (Regra Geral: Elemento, Cor e Arena)
    let pTotal = 0;
    let cTotal = 0;
    let report = {};

    if (state.battleResult) {
        pTotal = state.battleResult.scores.player;
        cTotal = state.battleResult.scores.cpu;
        report = { 
            arena: i18n.t(`arena-${state.battleResult.arena}`), 
            p: { base: ELEMENTS[pRooster.element].base, final: pTotal, arena: pRooster.element === state.battleResult.arena, color: false /* Cor counter é complexo no report, deixamos simplificado */ }, 
            c: { base: ELEMENTS[state.cpu.element].base, final: cTotal, arena: state.cpu.element === state.battleResult.arena, color: false } 
        };
    } else {
        const arenaBonus = state.currentArena.bonusElement === pRooster.element ? 1.25 : 1;
        const colorBonus = state.currentArena.color === pRooster.color ? 1.30 : 1;
        pTotal = Math.floor((pRooster.atk || 100) * arenaBonus * colorBonus);
        
        const cArenaBonus = state.currentArena.bonusElement === cRooster.element ? 1.25 : 1;
        const cColorBonus = state.currentArena.color === cRooster.color ? 1.30 : 1;
        cTotal = Math.floor((cRooster.atk || 100) * cArenaBonus * cColorBonus);

        report = { 
            arena: i18n.t(`arena-${state.currentArena.id}`), 
            p: { base: pRooster.atk || 100, final: pTotal, arena: arenaBonus > 1, color: colorBonus > 1 }, 
            c: { base: cRooster.atk || 100, final: cTotal, arena: cArenaBonus > 1, color: cColorBonus > 1 } 
        };
    }
    
    showDetailedResult(winValue, report);
}

let currentTargetIdx = 0;
let targetResolve = null;

export function setTarget(idx, side) {
    if (side === 'cpu') {
        currentTargetIdx = idx;
        // Visual feedback
        for (let i = 0; i < 3; i++) {
            const targetEl = document.getElementById(`cpu-target-${i}`);
            if (targetEl) {
                if (i === idx) targetEl.classList.remove('hidden');
                else targetEl.classList.add('hidden');
            }
        }
        if (targetResolve) {
            const resolve = targetResolve;
            targetResolve = null;
            resolve(idx);
        }
    }
}

export function selectActiveRooster(idx) {
    // Para uso futuro em estratégias mais complexas
    console.log("Selected active rooster:", idx);
}

// Engenharia Avançada: Sistema de Resistência (Damage Gating)
// Garante que um galo não morra em uma única rodada de ataques sequenciais (3 ataques)
const RESISTANCE_THRESHOLD = 0.45; // Máximo de 45% de HP perdido por rodada de equipe

function applyDamageWithResistance(currentHP, maxHP, damage, roundDamageTaken) {
    const maxDamageThisRound = maxHP * RESISTANCE_THRESHOLD;
    const remainingAllowedDamage = Math.max(0, maxDamageThisRound - roundDamageTaken);
    
    let finalDamage = Math.min(damage, remainingAllowedDamage);
    
    // Se o dano for bloqueado pela resistência, ainda aplicamos um dano mínimo de "impacto"
    if (damage > remainingAllowedDamage && remainingAllowedDamage > 0) {
        finalDamage = remainingAllowedDamage;
    } else if (remainingAllowedDamage <= 0) {
        finalDamage = Math.max(1, Math.round(damage * 0.05)); // 5% de dano residual após atingir o limite
    }

    const newHP = Math.max(currentHP - finalDamage, currentHP > 1 ? 1 : 0); // Mantém 1 HP se ainda tiver resistência
    return {
        newHP,
        actualDamage: Math.round(currentHP - newHP)
    };
}

async function battleSequence3v3() {
    const pTeam = TeamService.getTeamRoosters();
    const cTeam = state.cpuTeam;
    const MAX_ROUNDS = 100;
    
    // Reset visual absoluto antes de iniciar
    resetAllAvatarStates();
    
    // Inicialização de HP e Energia Individuais
    let pHP = pTeam.map(r => r.hp_max || 100);
    let cHP = cTeam.map(r => 100); // CPU base 100
    const pMaxHP = [...pHP];
    const cMaxHP = [...cHP];
    
    let pEnergy = pTeam.map(r => r.energy_max || 100);
    let cEnergy = cTeam.map(() => 100);

    const isTieBattle = pTeam.length === cTeam.length && pTeam.every((r, i) => isIdentical(r, cTeam[i]));

    // Renderizar Avatares Iniciais
    pTeam.forEach((r, idx) => renderAvatar(`player-avatar-${idx}`, r.element, r.color, r.dna?.skin || 'none'));
    cTeam.forEach((r, idx) => renderAvatar(`cpu-avatar-${idx}`, r.element, r.color, 'none'));

    // Reset UI
    updateTotalHP(pHP, cHP);
    pTeam.forEach((_, idx) => {
        updateSlotHP('p', idx, 100);
        updateSlotEnergy('p', idx, 100);
    });
    cTeam.forEach((_, idx) => {
        updateSlotHP('c', idx, 100);
    });

    // Definir primeiro alvo automático
    setTarget(0, 'cpu');

    let round = 0;
    while (pHP.some(h => h > 0) && cHP.some(h => h > 0) && round < MAX_ROUNDS) {
        
        // --- TURNO DA EQUIPE JOGADOR ---
        let pRoundDamageTakenByCPU = cHP.map(() => 0); 
        
        let autoAction = null; // Armazena a ação escolhida pelo primeiro galo para guiar os outros

        for (let pIdx = 0; pIdx < pTeam.length; pIdx++) {
            if (pHP[pIdx] <= 0) continue; 
            
            // Verificação de Alvo Dinâmica: Se o alvo atual morreu, busca o próximo automaticamente
            if (cHP[currentTargetIdx] <= 0) {
                const nextAlive = cHP.findIndex(h => h > 0);
                if (nextAlive === -1) break; // Todos os inimigos derrotados
                setTarget(nextAlive, 'cpu');
            }
            
            const playerTargetIdx = currentTargetIdx;
            const pGal = pTeam[pIdx];
            const pAv = document.getElementById(`player-avatar-${pIdx}`);
            const cAv = document.getElementById(`cpu-avatar-${playerTargetIdx}`);
            
            // Aplica Efeitos Visuais de Foco (Game Design)
            pTeam.forEach((_, i) => {
                const el = document.getElementById(`player-avatar-${i}`);
                if (el) {
                    el.classList.remove('active-rooster', 'inactive-rooster');
                    el.classList.add(i === pIdx ? 'active-rooster' : 'inactive-rooster');
                }
            });
            if (cAv) cAv.classList.add('target-rooster');

            pEnergy[pIdx] = Math.min(100, pEnergy[pIdx] + 15);
            updateSlotEnergy('p', pIdx, pEnergy[pIdx]);
            pGal.energy = pEnergy[pIdx]; // Sincroniza energia para a interface de habilidades

            // AUTOMAÇÃO: Se for o primeiro galo vivo, pede comando. Se não, segue automaticamente.
            let action;
            if (!autoAction) {
                action = await showPlayerSkills(pGal);
                autoAction = action; // Define o padrão para o restante da equipe nesta rodada
            } else {
                // Seleção Automática para os galos seguintes
                if (autoAction.type === 'skill') {
                    const skills = SkillService.getSkillsForRooster(pGal.element, pGal.level);
                    const bestSkill = skills.find(s => s.cost <= pEnergy[pIdx]) || skills[0];
                    action = { type: 'skill', id: bestSkill.id };
                } else {
                    // Se o primeiro usou item, os outros usam sua melhor skill (não gastamos 3 itens de uma vez)
                    const skills = SkillService.getSkillsForRooster(pGal.element, pGal.level);
                    action = { type: 'skill', id: skills[0].id };
                }
                await sleep(600); // Delay dramático para ver a sequência
            }

            if (action.type === 'skill') {
                const skill = SKILLS[pGal.element]?.find(s => s.id === action.id) || SKILLS.fire[0];
                pEnergy[pIdx] -= (skill.cost || 0);
                updateSlotEnergy('p', pIdx, pEnergy[pIdx]);

                const cGal = cTeam[playerTargetIdx];
                const cStatus = { element: cGal.element, color: cGal.color, shield: 1, def: 1 };

                const advDmg = calculateAdvancedDamage(pGal.atk, skill.multiplier || 1, pGal.level, state.currentArena, pGal.element, pGal.color, cStatus);
                
                const resResult = applyDamageWithResistance(cHP[playerTargetIdx], cMaxHP[playerTargetIdx], advDmg.value, pRoundDamageTakenByCPU[playerTargetIdx]);
                const dmg = resResult.actualDamage;
                cHP[playerTargetIdx] = resResult.newHP;
                pRoundDamageTakenByCPU[playerTargetIdx] += dmg;

                if (pAv) pAv.classList.add('anim-lunge-up', 'anim-wing-flap'); AudioEngine.playAttack(); await sleep(300);
                if (cAv) cAv.classList.add('anim-hit'); AudioEngine.playHit(); triggerHaptic('light');

                if (skill.effect === 'heal') {
                    const heal = Math.round(pGal.hp_max * (skill.value / 100));
                    pHP[pIdx] = Math.min(pGal.hp_max, pHP[pIdx] + heal);
                    updateSlotHP('p', pIdx, (pHP[pIdx] / pGal.hp_max) * 100);
                    if (pAv) showFloatingText(pAv, `+${heal}`, 'left', false);
                    pGal.hp_current = pHP[pIdx];
                } else {
                    updateSlotHP('c', playerTargetIdx, (cHP[playerTargetIdx] / cMaxHP[playerTargetIdx]) * 100);
                    
                    let floatMsg = `-${dmg}`;
                    if (advDmg.type === 'critical') floatMsg = `${i18n.t('btl-critical')} ${floatMsg}`;
                    if (advDmg.type === 'weak') floatMsg = `${i18n.t('btl-weak')} ${floatMsg}`;
                    if (cAv) showFloatingText(cAv, floatMsg, 'right', advDmg.type === 'critical');

                    if (cHP[playerTargetIdx] <= 0) {
                        AudioEngine.playDefeat();
                        renderAvatar(`cpu-avatar-${playerTargetIdx}`, cGal.element, cGal.color, 'none', true);
                    }
                }
            } else if (action.type === 'item') {
                const item = state.gameData.inventory.items.find(it => it.id === action.id);
                if (item) {
                    item.count--;
                    if (item.type === 'heal') {
                        const heal = Math.round(pGal.hp_max * (item.value / 100));
                        pHP[pIdx] = Math.min(pGal.hp_max, pHP[pIdx] + heal);
                        updateSlotHP('p', pIdx, (pHP[pIdx] / pGal.hp_max) * 100);
                        if (pAv) showFloatingText(pAv, `+${heal} 🧪`, 'left', false);
                        pGal.hp_current = pHP[pIdx];
                    } else if (item.type === 'energy') {
                        pEnergy[pIdx] = Math.min(100, pEnergy[pIdx] + item.value);
                        updateSlotEnergy('p', pIdx, pEnergy[pIdx]);
                        if (pAv) showFloatingText(pAv, `+${item.value} ⚡`, 'left', false);
                    }
                    state.save();
                }
            }

            updateTotalHP(pHP, cHP);
            await sleep(400); 
            if (pAv) pAv.classList.remove('anim-lunge-up', 'anim-wing-flap'); 
            // Limpeza de efeitos visuais por galo
            if (cAv) cAv.classList.remove('target-rooster');
        }

        // Limpeza final de efeitos visuais da rodada do jogador
        pTeam.forEach((_, i) => {
            const el = document.getElementById(`player-avatar-${i}`);
            if (el) el.classList.remove('active-rooster', 'inactive-rooster');
        });

        if (!cHP.some(h => h > 0)) break;

        await sleep(800); // Delay estratégico entre turnos para fluidez

        // --- TURNO DA EQUIPE CPU ---
        let cRoundDamageTakenByPlayer = pHP.map(() => 0);
        
        for (let cIdx = 0; cIdx < cTeam.length; cIdx++) {
            if (cHP[cIdx] <= 0) continue;
            
            // Verificação de Alvo Dinâmica para CPU
            const alivePlayers = pHP.map((h, idx) => h > 0 ? idx : -1).filter(idx => idx !== -1);
            if (alivePlayers.length === 0) break;
            
            // CPU tenta manter o foco no alvo atual se ele estiver vivo, senão escolhe outro
            let cpuTargetIdx = alivePlayers.includes(currentTargetIdx) ? currentTargetIdx : alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
            
            const cGal = cTeam[cIdx];
            const cAv = document.getElementById(`cpu-avatar-${cIdx}`);
            const pAv = document.getElementById(`player-avatar-${cpuTargetIdx}`);
            
            // Efeitos Visuais CPU
            cTeam.forEach((_, i) => {
                const el = document.getElementById(`cpu-avatar-${i}`);
                if (el) {
                    el.classList.remove('active-rooster', 'inactive-rooster');
                    el.classList.add(i === cIdx ? 'active-rooster' : 'inactive-rooster');
                }
            });
            if (pAv) pAv.classList.add('target-rooster');

            const pGal = pTeam[cpuTargetIdx];
            const pStatus = { element: pGal.element, color: pGal.color, shield: 1, def: 1 };

            cEnergy[cIdx] = Math.min(100, cEnergy[cIdx] + 15);

            const cSkills = SkillService.getSkillsForRooster(cGal.element, 1);
            const cSkill = cSkills[Math.floor(Math.random() * cSkills.length)];

            const advDmgP = calculateAdvancedDamage(cGal.atk, cSkill.multiplier, 1, state.currentArena, cGal.element, cGal.color, pStatus);
            
            const resResultP = applyDamageWithResistance(pHP[cpuTargetIdx], pMaxHP[cpuTargetIdx], advDmgP.value, cRoundDamageTakenByPlayer[cpuTargetIdx]);
            const dmgP = resResultP.actualDamage;
            pHP[cpuTargetIdx] = resResultP.newHP;
            cRoundDamageTakenByPlayer[cpuTargetIdx] += dmgP;

            if (cAv) cAv.classList.add('anim-lunge-down', 'anim-wing-flap'); AudioEngine.playAttack(); await sleep(300);
            if (pAv) pAv.classList.add('anim-hit'); AudioEngine.playHit(); triggerHaptic('medium');

            updateSlotHP('p', cpuTargetIdx, (pHP[cpuTargetIdx] / pMaxHP[cpuTargetIdx]) * 100);
            
            let floatMsgP = `-${dmgP}`;
            if (advDmgP.type === 'critical') floatMsgP = `${i18n.t('btl-critical')} ${floatMsgP}`;
            if (pAv) showFloatingText(pAv, floatMsgP, 'left', advDmgP.type === 'critical');

            if (pHP[cpuTargetIdx] <= 0) {
                AudioEngine.playDefeat();
                renderAvatar(`player-avatar-${cpuTargetIdx}`, pGal.element, pGal.color, pGal.dna?.skin || 'none', true);
            }

            updateTotalHP(pHP, cHP);
            await sleep(400); 
            if (cAv) cAv.classList.remove('anim-lunge-down', 'anim-wing-flap'); 
            if (pAv) pAv.classList.remove('target-rooster');
            await sleep(400); 
        }

        // Limpeza final de efeitos visuais da rodada CPU
        cTeam.forEach((_, i) => {
            const el = document.getElementById(`cpu-avatar-${i}`);
            if (el) el.classList.remove('active-rooster', 'inactive-rooster');
        });
        
        round++;
    }

    // Determinar Resultado Final
    let result = 'loss';
    const pAlive = pHP.some(h => h > 0);
    const cAlive = cHP.some(h => h > 0);

    if (!pAlive && !cAlive) result = 'tie';
    else if (pAlive) result = 'win';

    const playerWon = result === 'win' ? true : (result === 'loss' ? false : null);
    
    // Animações Finais
    if (result === 'win') {
        AudioEngine.playWin();
        pHP.forEach((h, idx) => { if (h > 0) document.getElementById(`player-avatar-${idx}`).classList.add('anim-winner-l'); });
    } else if (result === 'loss') {
        AudioEngine.playLoss();
        cHP.forEach((h, idx) => { if (h > 0) document.getElementById(`cpu-avatar-${idx}`).classList.add('anim-winner-r'); });
    }

    saveMatchResult(playerWon, pTeam[0].element, pTeam[0].color);
    
    // Relatório
    const report = {
        arena: i18n.t(`arena-${state.currentArena.id}`),
        p: { base: ELEMENT_BASE_STRENGTH[pTeam[0].element], final: Math.round(pHP.reduce((a, b) => a + b, 0)), arena: pTeam.some(r => r.element === state.currentArena.id), color: true },
        c: { base: ELEMENT_BASE_STRENGTH[cTeam[0].element], final: Math.round(cHP.reduce((a, b) => a + b, 0)), arena: cTeam.some(r => r.element === state.currentArena.id), color: true }
    };

    await sleep(3000); 
    showFinalResult3v3(playerWon, report);
}

function updateSlotHP(side, idx, percent) {
    const bar = document.getElementById(`${side}-hp-bar-${idx}`);
    if (bar) bar.style.width = `${percent}%`;
}

function updateSlotEnergy(side, idx, energy) {
    const bar = document.getElementById(`${side}-en-bar-${idx}`);
    if (bar) bar.style.width = `${energy}%`;
}

function updateTotalHP(pHPArray, cHPArray) {
    const pTotal = pHPArray.reduce((a, b) => a + b, 0);
    const cTotal = cHPArray.reduce((a, b) => a + b, 0);
    const pMax = 300; // Ajustado para MVP
    const cMax = 300;

    updateHealth('p-hp-bar', 100 - (pTotal / pMax * 100));
    updateHealth('c-hp-bar', 100 - (cTotal / cMax * 100));
    
    const pTotalText = document.getElementById('p-hp-total-text');
    const cTotalText = document.getElementById('c-hp-total-text');
    if (pTotalText) pTotalText.innerText = `${Math.round(pTotal)}/${pMax} HP`;
    if (cTotalText) cTotalText.innerText = `${Math.round(cTotal)}/${cMax} HP`;
}

async function saveMatchResult(win, pEl, pCol) {
    let resString = 'draw';
    let financial = 0;
    let balanceChange = 0;
    let xpGained = win === true ? 50 : (win === null ? 20 : 10);

    const econ = EconomyService.processMatchEconomy(state.currentBet, win === true ? state.gameData.user.id : 'cpu');

    // Add XP to active roosters
    const activeRoosters = TeamService.getTeamRoosters();
    let levelUps = [];

    if (state.gameMode === '3v3') {
        activeRoosters.forEach(r => {
            if (state.constructor.addXP(r, xpGained)) {
                levelUps.push(r);
            }
        });
    } else {
        // In 1v1, if we have a team, the first one gets XP. 
        // If no team (nomadic mode), we might need to find the rooster in inventory.
        const currentRooster = activeRoosters[0] || state.gameData.inventory.roosters.find(r => r.element === pEl && r.color === pCol);
        if (currentRooster) {
            if (state.constructor.addXP(currentRooster, xpGained)) {
                levelUps.push(currentRooster);
            }
        }
    }

    if (win === true) {
        resString = 'win';
        state.gameData.wins++;
        state.gameData.balance += econ.netPrize;
        financial = econ.netPrize - state.currentBet;
        balanceChange = econ.netPrize;
    } else if (win === false) {
        resString = 'loss';
        state.gameData.losses++;
        financial = -state.currentBet;
        balanceChange = 0; // The bet was already deducted
    } else {
        state.gameData.balance += state.currentBet;
        financial = 0;
        balanceChange = state.currentBet;
    }

    state.gameData.matches.unshift({
        result: resString,
        element: pEl,
        color: pCol,
        financial: financial,
        bet: state.currentBet,
        date: new Date().toLocaleTimeString(state.gameData.settings.lang, { hour: '2-digit', minute: '2-digit' })
    });
    if (state.gameData.matches.length > 20) state.gameData.matches.pop();

    // Engenharia Avançada: Sistema de Log Detalhado
    MatchLogService.addLog({
        result: resString,
        bet: state.currentBet,
        financial: financial,
        playerRoosters: activeRoosters.map(r => ({ element: r.element, color: r.color, level: r.level })),
        opponentRoosters: state.gameMode === '3v3' ? state.cpuTeam.map(r => ({ element: r.element, color: r.color, level: r.level })) : [{ element: state.cpu.element, color: state.cpu.color, level: activeRoosters[0]?.level || 1 }]
    });
    
    // Track Missions
    MissionService.updateProgress(MISSION_TYPES.MATCHES, 1);
    if (win === true) {
        MissionService.updateProgress(MISSION_TYPES.WINS, 1);
    }

    // Tournament Progression
    if (state.gameMode === 'tournament') {
        const result = TournamentService.advanceRound(win === true ? 'player' : 'cpu');
        if (result.finished) {
            if (result.won) {
                const jackpot = EconomyService.claimTournamentJackpot();
                setTimeout(() => alert(i18n.t('tour-win-msg', { jackpot })), 1000);
            } else {
                setTimeout(() => alert(i18n.t('tour-loss-msg')), 1000);
            }
        }
    }
    
    // Sync with Supabase RPC
    if (state.gameData.user && state.gameData.user.id && !state.battleResult) {
        try {
            const { supabase } = await import('./supabase.js');
            
            // 1. Process match result
            await supabase.rpc('process_match_result', {
                p_player_id: state.gameData.user.id,
                p_winner_id: win === true ? state.gameData.user.id : null,
                p_bet_amount: state.currentBet,
                p_rake_amount: econ.rake,
                p_jackpot_amount: econ.jackpotContribution,
                p_player_team: JSON.stringify(state.gameMode === '3v3' ? activeRoosters : [{element: pEl, color: pCol}]),
                p_opponent_team: JSON.stringify(state.gameMode === '3v3' ? state.cpuTeam : [{element: state.cpu.element, color: state.cpu.color}]),
                p_result_logs: JSON.stringify({ result: resString, financial: financial, xpGained }),
                p_balance_change: balanceChange,
                p_is_win: win === true,
                p_is_loss: win === false
            });

            // 2. Sync rooster XP/Level
            const roostersToSync = state.gameMode === '3v3' ? activeRoosters : (activeRoosters[0] ? [activeRoosters[0]] : []);
            for (const r of roostersToSync) {
                await supabase.from('roosters').update({
                    level: r.level,
                    xp: r.xp,
                    hp_max: r.hp_max,
                    atk_base: r.atk
                }).eq('id', r.id);
            }
        } catch (err) {
            console.error("Supabase match sync error:", err);
        }
    }

    state.save();
    updateBalanceUI();
    updateRankUI();

    if (levelUps.length > 0) {
        setTimeout(() => {
            alert(i18n.t('sys-level-up'));
        }, 1000);
    }
}

function isIdentical(r1, r2) {
    return r1.element === r2.element && r1.color === r2.color;
}

const ELEMENT_BASE_STRENGTH = {
    fire: 100,
    earth: 95,
    water: 90,
    air: 85
};

const COLOR_COUNTERS = {
    red: 'blue',
    blue: 'green',
    green: 'yellow',
    yellow: 'red'
};

function calculateAdvancedDamage(atk, multiplier, level, arena, element, color, targetStatus) {
    // Evolução 3V3: Uso de Força Base conforme elemento
    const baseStrength = ELEMENT_BASE_STRENGTH[element] || 100;
    
    // Buff de Arena: 1.25x (+25%)
    const arenaBonus = arena.bonusElement === element ? 1.25 : 1;
    
    // Buff de Cor (Counter): 1.30x (+30%)
    // Lógica: Se a cor do atacante vence a cor do defensor no ciclo
    const colorBonus = COLOR_COUNTERS[color] === targetStatus.color ? 1.30 : 1;
    
    // Cálculo do Score Baseado em Engenharia de Game
    let score = baseStrength * arenaBonus * colorBonus;
    
    // Para o motor de dano, multiplicamos pelo multiplicador da habilidade e nível
    let dmg = SkillService.calculateDamage(score, multiplier, level);
    
    // Variance (Jitter) ±5% - Reduzido para maior determinismo como solicitado
    const jitter = 0.98 + (Math.random() * 0.04);
    dmg *= jitter;
    
    // Critical / Weak (Mantendo a emoção da batalha)
    let type = 'normal';
    const rand = Math.random();
    if (rand < 0.10) {
        dmg *= 1.5;
        type = 'critical';
    } else if (rand > 0.90) {
        dmg *= 0.7;
        type = 'weak';
    }
    
    return { 
        value: Math.max(1, Math.round(dmg)), 
        type 
    };
}

export function startTournament() {
    const fee = 500;
    if (state.gameData.balance < fee) {
        alert(i18n.t('tour-error-balance'));
        return;
    }

    const res = TournamentService.startNew();
    if (res.success) {
        state.gameData.balance -= fee;
        state.save();
        updateBalanceUI();
        window.app.showScreen('tournament');
    } else {
        alert(res.error);
    }
}

export function startTournamentMatch() {
    const t = state.gameData.tournament;
    const matchups = TournamentService.getMatchups();
    const playerMatch = matchups.find(m => m.p1.id === 'player' || m.p2.id === 'player');
    
    if (!playerMatch) return;

    const opponent = playerMatch.p1.id === 'player' ? playerMatch.p2 : playerMatch.p1;
    
    // Set CPU for battle
    state.cpu.element = opponent.element;
    state.cpu.color = opponent.color;
    state.cpu.name = opponent.name;
    state.cpu.level = opponent.level;
    
    state.gameMode = 'tournament';
    
    document.getElementById('screen-selection').classList.add('hidden');
    document.getElementById('screen-tournament').classList.add('hidden');
    document.getElementById('screen-battle').classList.remove('hidden');
    document.getElementById('battle-stage').style.opacity = '0';
    
    startRouletteSequence();
}

export function resetGame() {
    AudioEngine.playClick();
    
    state.inBattle = false;
    
    // Hide Results
    document.getElementById('result-overlay').classList.add('hidden');
    document.getElementById('result-card').classList.add('scale-90', 'opacity-0');
    document.getElementById('result-card').classList.remove('scale-100', 'opacity-100');
    
    // Hide Battle Screen
    document.getElementById('screen-battle').classList.add('hidden');
    document.getElementById('skill-panel').classList.add('hidden');
    
    // If in tournament, go back to bracket
    if (state.gameMode === 'tournament' && state.gameData.tournament.active) {
        window.app.showScreen('tournament');
    } else {
        // Show Selection Screen
        document.getElementById('screen-selection').classList.remove('hidden');
    }
    document.getElementById('bottom-nav').classList.remove('hidden');
    
    // Reset Battle Stage (Unificado para 1v1 e 3v3)
    resetAllAvatarStates();

    const pHp = document.getElementById('p-hp-bar');
    if (pHp) pHp.style.width = '100%';
    
    const cHp = document.getElementById('c-hp-bar');
    if (cHp) cHp.style.width = '100%';
    
    // Reset Selection UI (Keep selected element/color but re-enable button)
    const btn = document.getElementById('btn-start');
    btn.disabled = false;
    btn.innerText = i18n.t('sel-search');
    
    // Check balance for next game
    updateBalanceUI();
}

// --- CHALLENGE SYSTEM ---
export function generateChallengeLink() {
    if (!state.player.element || !state.player.color) return null;
    
    const challengeData = {
        n: state.gameData.user.name,
        e: state.player.element,
        c: state.player.color,
        b: ELEMENTS[state.player.element].base,
        t: Date.now()
    };
    
    // Simple Base64 serialization for the challenge
    const encoded = btoa(JSON.stringify(challengeData));
    const url = new URL(window.location.href);
    url.searchParams.set('challenge', encoded);
    return url.toString();
}

export function parseChallenge(encoded) {
    try {
        const decoded = JSON.parse(atob(encoded));
        // Validate basic fields
        if (decoded.n && decoded.e && decoded.c) {
            return decoded;
        }
    } catch (e) {
        console.error("Invalid challenge link", e);
    }
    return null;
}

export async function startChallengeBattle(challengerData) {
    // Override CPU with Challenger Data
    state.cpu.element = challengerData.e;
    state.cpu.color = challengerData.c;
    state.cpu.name = challengerData.n;
    
    // Choose a random arena or maybe use one from challenge? 
    // Let's stick to random arena for variety
    state.currentArena = ARENAS[Math.floor(Math.random() * ARENAS.length)];

    document.getElementById('screen-selection').classList.add('hidden');
    document.getElementById('screen-battle').classList.remove('hidden');
    document.getElementById('battle-stage').style.opacity = '0';
    
    // Skip roulette for challenge for immediate action? 
    // No, keep roulette for flavor but show the challenger name
    startRouletteSequence();
}

function showDetailedResult(win, report) {
    const overlay = document.getElementById('result-overlay');
    const card = document.getElementById('result-card');

    const titleEl = document.getElementById('result-title');
    if (titleEl) {
        titleEl.innerText = win ? i18n.t('res-victory') : (win === null ? i18n.t('res-draw') : i18n.t('res-defeat'));
        titleEl.className = `text-4xl font-black mb-2 uppercase italic tracking-tighter ${win ? 'text-green-400' : (win === null ? 'text-yellow-400' : 'text-red-500')}`;
    }

    const iconEl = document.getElementById('result-icon');
    if (iconEl) iconEl.innerText = win ? "🏆" : (win === null ? "⚠️" : "☠️");

    const arenaNameEl = document.getElementById('res-arena-name');
    if (arenaNameEl) arenaNameEl.innerText = report.arena;

    const finDiv = document.getElementById('financial-result');
    const finDet = document.getElementById('financial-detail');
    if (finDiv) {
        if (win) {
            finDiv.innerText = `+${Math.floor(state.currentBet * 1.8)} RC`;
            finDiv.className = "text-3xl font-mono font-bold text-green-400 mt-1";
            if (finDet) finDet.innerText = `${i18n.t('res-bet')}: ${state.currentBet} | ${i18n.t('res-prize')}: ${Math.floor(state.currentBet * 1.8)} (${i18n.t('res-profit')} +${Math.floor(state.currentBet * 0.8)})`;
        } else if (win === false) {
            finDiv.innerText = `-${state.currentBet} RC`;
            finDiv.className = "text-3xl font-mono font-bold text-red-400 mt-1";
            if (finDet) finDet.innerText = i18n.t('res-lost');
        } else {
            finDiv.innerText = `+${state.currentBet} RC`;
            finDiv.className = "text-3xl font-mono font-bold text-yellow-400 mt-1";
            if (finDet) finDet.innerText = i18n.t('res-refunded');
        }
    }

    const pBase = document.getElementById('res-p-base');
    if (pBase) pBase.innerText = report.p.base;
    const pFinal = document.getElementById('res-p-final');
    if (pFinal) pFinal.innerText = report.p.final;
    
    const dash = '<i class="fas fa-minus-circle text-slate-600"></i>';
    const pBonus = document.getElementById('res-p-bonus');
    if (pBonus) pBonus.innerHTML = `<span>Bonus:</span> ${report.p.arena ? '<span class="text-green-400 font-bold">+25%</span>' : dash}`;
    const pPaint = document.getElementById('res-p-paint');
    if (pPaint) pPaint.innerHTML = `<span>Pintura:</span> ${report.p.color ? '<span class="text-green-400 font-bold">+30%</span>' : dash}`;
    
    renderAvatar('res-p-icon', state.player.element, state.player.color);

    const cBase = document.getElementById('res-c-base');
    if (cBase) cBase.innerText = report.c.base;
    const cFinal = document.getElementById('res-c-final');
    if (cFinal) cFinal.innerText = report.c.final;
    const cBonus = document.getElementById('res-c-bonus');
    if (cBonus) cBonus.innerHTML = `<span>Bonus:</span> ${report.c.arena ? '<span class="text-red-400 font-bold">+25%</span>' : dash}`;
    const cPaint = document.getElementById('res-c-paint');
    if (cPaint) cPaint.innerHTML = `<span>Pintura:</span> ${report.c.color ? '<span class="text-red-400 font-bold">+30%</span>' : dash}`;
    
    renderAvatar('res-c-icon', state.cpu.element, state.cpu.color);

    if (overlay) {
        overlay.classList.remove('hidden');
        if (card) {
            setTimeout(() => { card.classList.remove('scale-90', 'opacity-0'); card.classList.add('scale-100', 'opacity-100'); }, 50);
        }
    }
    AudioEngine.playClick();
}
