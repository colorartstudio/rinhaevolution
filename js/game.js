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
                    <span class="text-[9px] font-bold text-white uppercase">${item.name}</span>
                    <span class="text-[7px] text-slate-500 uppercase">${item.type === 'heal' ? 'Recupera HP' : 'Recupera MP'}</span>
                </div>
                <span class="bg-yellow-500 text-black text-[9px] font-black px-2 rounded-full">${item.count}</span>
            `;
            container.appendChild(btn);
        }
    });
    if (container.innerHTML === '') {
        container.innerHTML = '<div class="col-span-2 text-center text-[8px] text-slate-500 uppercase py-2">Mochila Vazia</div>';
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
        alert("Você precisa estar logado para iniciar uma batalha!");
        window.app.showLogin();
        return;
    }

    if (state.gameMode === '3v3') {
        const team = TeamService.getTeamRoosters();
        if (team.length < 3) {
            alert("Você precisa de 3 galos no seu time!");
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
        btnStart.innerText = "PROCESSANDO...";
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
        alert("Erro de conexão com o servidor. Verifique seu saldo e tente novamente.");
        if (btnStart) {
            btnStart.disabled = false;
            btnStart.innerText = i18n.t('sel-search');
        }
    }
}

export function startRouletteSequence() {
    // state.currentArena já foi definido pelo servidor na função checkBalanceAndStart
    if (!state.currentArena) {
        state.currentArena = ARENAS[Math.floor(Math.random() * ARENAS.length)];
    }

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
    const rName = document.getElementById('roulette-name');
    const rIcon = document.getElementById('roulette-icon');
    const bg = document.getElementById('arena-bg');
    
    rName.innerText = i18n.t(`arena-${state.currentArena.id}`);
    rIcon.innerText = state.currentArena.icon;
    rName.classList.add('scale-125', 'text-yellow-400');
    bg.className = `absolute inset-0 z-0 transition-colors duration-300 opacity-80 ${state.currentArena.class}`;
    document.getElementById('roulette-flash').classList.add('anim-flash');

    document.getElementById('arena-icon').innerText = state.currentArena.icon;
    document.getElementById('arena-name').innerText = i18n.t(`arena-${state.currentArena.id}`);
    const bEl = ELEMENTS[state.currentArena.bonusElement];
    document.getElementById('arena-bonus-desc').innerText = `${i18n.t('btl-bonus')}: ${i18n.t(`el-${bEl.id}`)}`;

    setTimeout(() => {
        document.getElementById('roulette-overlay').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('roulette-overlay').style.display = 'none';
        }, 500);
        startGame();
    }, 1500);
}

function startGame() {
    const pGrid = document.getElementById('player-avatars-grid');
    const cGrid = document.getElementById('cpu-avatars-grid');
    pGrid.innerHTML = '';
    cGrid.innerHTML = '';

    if (state.gameMode === '3v3') {
        const pTeam = TeamService.getTeamRoosters();
        pTeam.forEach((gal, i) => {
            const div = document.createElement('div');
            div.id = `player-avatar-${i}`;
            div.className = "w-24 h-24 transition-transform duration-300";
            pGrid.appendChild(div);
            renderAvatar(`player-avatar-${i}`, gal.element, gal.color);
        });

        if (state.cpuTeam && state.cpuTeam.length > 0) {
            state.cpuTeam.forEach((gal, i) => {
                const div = document.createElement('div');
                div.id = `cpu-avatar-${i}`;
                div.className = "w-24 h-24 scale-x-[-1] transition-transform duration-300";
                cGrid.appendChild(div);
                renderAvatar(`cpu-avatar-${i}`, gal.element, gal.color);
            });
        } else {
            // Fallback caso cpuTeam esteja vazio (não deveria acontecer com a nova RPC)
            for (let i = 0; i < 3; i++) {
                const div = document.createElement('div');
                div.id = `cpu-avatar-${i}`;
                div.className = "w-24 h-24 scale-x-[-1] transition-transform duration-300";
                cGrid.appendChild(div);
                renderAvatar(`cpu-avatar-${i}`, state.cpu.element, state.cpu.color);
            }
        }
    } else {
        const pDiv = document.createElement('div');
        pDiv.id = 'player-avatar';
        pDiv.className = "w-36 h-36 md:w-52 md:h-52 transition-transform duration-300";
        pGrid.appendChild(pDiv);
        renderAvatar('player-avatar', state.player.element, state.player.color);

        const cDiv = document.createElement('div');
        cDiv.id = 'cpu-avatar';
        cDiv.className = "w-36 h-36 md:w-52 md:h-52 scale-x-[-1] transition-transform duration-300";
        cGrid.appendChild(cDiv);
        renderAvatar('cpu-avatar', state.cpu.element, state.cpu.color);
    }

    document.getElementById('player-name-display').innerText = state.gameData.user.name;
    document.getElementById('cpu-name-display').innerText = i18n.t('res-cpu');
    document.getElementById('p-hp-bar').style.width = '100%';
    document.getElementById('c-hp-bar').style.width = '100%';
    document.getElementById('battle-stage').style.opacity = '1';
    
    setTimeout(battleSequence, 1000);
}



function showFinalResult3v3(playerWon, report) {
    const pGrid = document.getElementById('player-avatars-grid');
    const cGrid = document.getElementById('cpu-avatars-grid');
    
    if (playerWon === true) {
        pGrid.classList.add('anim-winner-l');
        cGrid.classList.add('opacity-50', 'grayscale');
        AudioEngine.playWin();
    } else if (playerWon === false) {
        cGrid.classList.add('anim-winner-r');
        pGrid.classList.add('opacity-50', 'grayscale');
        AudioEngine.playLoss();
    } else {
        // Empate
        pGrid.classList.add('opacity-80');
        cGrid.classList.add('opacity-80');
        AudioEngine.playClick();
    }
    
    showDetailedResult(playerWon, report);
}

async function showPlayerSkills(rooster) {
    const panel = document.getElementById('skill-panel');
    const container = document.getElementById('skill-buttons');
    const timerEl = document.getElementById('turn-timer');
    const skills = SkillService.getSkillsForRooster(rooster.element, rooster.level);
    
    container.innerHTML = '';
    skills.forEach(skill => {
        const canAfford = rooster.energy >= skill.cost;
        const btn = document.createElement('button');
        if (canAfford) {
            btn.onclick = () => {
                cleanupTimer();
                handleSkillClick(skill.id);
            };
            btn.className = "flex flex-col items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all active:scale-95 group";
        } else {
            btn.className = "flex flex-col items-center justify-center p-2 bg-slate-900 border border-slate-800 rounded-xl opacity-50 cursor-not-allowed";
        }
        btn.innerHTML = `
            <span class="text-[10px] font-black text-white uppercase ${canAfford ? 'group-hover:text-yellow-500' : 'text-slate-600'}">${skill.name}</span>
            <div class="flex items-center gap-1 mt-0.5">
                <span class="text-[8px] text-slate-500 uppercase">${skill.multiplier}x</span>
                <span class="text-[8px] ${canAfford ? 'text-blue-400' : 'text-red-500'} font-bold">${skill.cost} MP</span>
            </div>
        `;
        container.appendChild(btn);
    });
    
    panel.classList.remove('hidden');
    
    // Timer Logic
    let timeLeft = 15;
    if (timerEl) {
        timerEl.classList.remove('hidden');
        timerEl.innerText = `${timeLeft}s`;
    }

    const timerInterval = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.innerText = `${timeLeft}s`;
        
        if (timeLeft <= 0) {
            cleanupTimer();
            // Auto-select first affordable skill or just first skill
            const defaultSkill = skills.find(s => s.cost <= rooster.energy) || skills[0];
            if (defaultSkill) {
                handleSkillClick(defaultSkill.id);
            } else {
                handleSkillClick('f1'); // Fallback absoluto
            }
        }
    }, 1000);

    const cleanupTimer = () => {
        clearInterval(timerInterval);
        if (timerEl) timerEl.classList.add('hidden');
    };

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

    // Turn Loop (Fixed to 8 rounds or until KO)
    let round = 1;
    const MAX_ROUNDS = 8;

    // Engenharia de Animação: Se temos o resultado do servidor, calculamos o dano por turno para sincronizar
    let dmgPerRoundC = Math.round(cRooster.hp_max / MAX_ROUNDS);
    let dmgPerRoundP = Math.round(pRooster.hp_max / MAX_ROUNDS);
    
    // Ajuste fino para garantir KO no round certo se houver vencedor
    if (state.battleResult) {
        if (state.battleResult.result === 'WIN') dmgPerRoundC = Math.ceil(cRooster.hp_max / (MAX_ROUNDS - 1));
        if (state.battleResult.result === 'LOSS') dmgPerRoundP = Math.ceil(pRooster.hp_max / (MAX_ROUNDS - 1));
    }

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
                pAv.classList.add('anim-atk-l'); AudioEngine.playAttack(); await sleep(300);
                cAv.classList.add('anim-hit'); AudioEngine.playHit(); triggerHaptic('light');
                
                // Feedback visual de Crítico/Fraco
                let floatMsg = `-${dmgC}`;
                if (advDmg.type === 'critical') floatMsg = `CRÍTICO! ${floatMsg}`;
                if (advDmg.type === 'weak') floatMsg = `FRACO... ${floatMsg}`;
                
                showFloatingText(cAv, floatMsg, 'right', advDmg.type === 'critical'); 
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
                    showFloatingText(pAv, `+${heal}`, 'left', false);
                }
            } else if (action.type === 'item') {
                const item = state.gameData.inventory.items.find(i => i.id === action.id);
                item.count--;
                if (item.type === 'heal') {
                    const heal = Math.round(pRooster.hp_max * (item.value / 100));
                    pHP = Math.min(pRooster.hp_max, pHP + heal);
                    updateHealth('p-hp-bar', -(heal / pRooster.hp_max) * 100);
                    showFloatingText(pAv, `+${heal} 🧪`, 'left', false);
                } else if (item.type === 'energy') {
                    pRooster.energy = Math.min(pRooster.energy_max, pRooster.energy + item.value);
                    updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max);
                    showFloatingText(pAv, `+${item.value} ⚡`, 'left', false);
                }
                AudioEngine.playClick();
                await sleep(500);
            }

            await sleep(400); pAv.classList.remove('anim-atk-l'); cAv.classList.remove('anim-hit'); await sleep(600);
        } else {
            showFloatingText(pAv, "ATORDUADO!", 'left', false);
            pStatus.stun = false;
            await sleep(1000);
        }

        if (cHP <= 0) break;

        // Apply Burn
        if (cStatus.burn > 0) {
            const bDmg = 15;
            cHP -= bDmg;
            updateHealth('c-hp-bar', (bDmg / cRooster.hp_max) * 100);
            showFloatingText(cAv, `-${bDmg} 🔥`, 'right', false);
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

            cAv.classList.add('anim-atk-r'); AudioEngine.playAttack(); await sleep(300);
            pAv.classList.add('anim-hit'); AudioEngine.playHit(); triggerHaptic('medium');
            
            let floatMsgP = `-${dmgP}`;
            if (advDmgP.type === 'critical') floatMsgP = `CRÍTICO! ${floatMsgP}`;
            if (advDmgP.type === 'weak') floatMsgP = `FRACO... ${floatMsgP}`;

            showFloatingText(pAv, floatMsgP, 'left', advDmgP.type === 'critical'); 
            updateHealth('p-hp-bar', (dmgP / pRooster.hp_max) * 100);
            pHP -= dmgP;

            if (cSkill.effect === 'burn' && Math.random() < cSkill.chance) pStatus.burn = 3;
            if (cSkill.effect === 'stun' && Math.random() < cSkill.chance) pStatus.stun = true;
            if (cSkill.effect === 'shield') cStatus.shield = cSkill.value;
            if (cSkill.effect === 'def') cStatus.def = cSkill.value;

            await sleep(400); cAv.classList.remove('anim-atk-r'); pAv.classList.remove('anim-hit'); await sleep(600);
        } else {
            showFloatingText(cAv, "ATORDUADO!", 'right', false);
            cStatus.stun = false;
            await sleep(1000);
        }

        // Apply Burn Player
        if (pStatus.burn > 0) {
            const bDmg = 15;
            pHP -= bDmg;
            updateHealth('p-hp-bar', (bDmg / pRooster.hp_max) * 100);
            showFloatingText(pAv, `-${bDmg} 🔥`, 'left', false);
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

async function battleSequence3v3() {
    const pTeam = TeamService.getTeamRoosters();
    const cTeam = state.cpuTeam;
    const rounds = 8; // Ajustado para 8 rounds conforme solicitado
    
    let pHP = 300; 
    let cHP = 300;

    // Reset energy for all team members
    pTeam.forEach(r => r.energy = r.energy_max || 100);
    cTeam.forEach(r => r.energy = r.energy_max || 100);
    
    // Regra de Empate (Time idêntico)
    const isTieBattle = pTeam.length === cTeam.length && pTeam.every((r, i) => isIdentical(r, cTeam[i]));

    for (let i = 0; i < rounds; i++) {
        const pIdx = i % pTeam.length;
        const cIdx = i % cTeam.length;
        
        const pGal = pTeam[pIdx];
        const cGal = cTeam[cIdx];
        
        // Robustez: Garantir atributos para CPU e Player
        pGal.level = pGal.level || 1;
        pGal.atk = pGal.atk || 100;
        pGal.energy_max = pGal.energy_max || 100;
        
        cGal.level = cGal.level || 1;
        cGal.atk = cGal.atk || 100;
        cGal.energy_max = cGal.energy_max || 100;
        
        const pAv = document.getElementById(`player-avatar-${pIdx}`);
        const cAv = document.getElementById(`cpu-avatar-${cIdx}`);

        const pStatus = { element: pGal.element, color: pGal.color, shield: 1, def: 1 };
        const cStatus = { element: cGal.element, color: cGal.color, shield: 1, def: 1 };

        // Energy Regen
        pGal.energy = Math.min(pGal.energy_max || 100, pGal.energy + 20);
        cGal.energy = Math.min(cGal.energy_max || 100, cGal.energy + 20);
        updateEnergy('p-en-bar', pGal.energy, pGal.energy_max || 100);
        
        // --- PLAYER TURN ---
        const action = await showPlayerSkills(pGal);
        if (action.type === 'skill') {
            const skill = SKILLS[pGal.element]?.find(s => s.id === action.id) || SKILLS.fire[0];
            pGal.energy -= (skill.cost || 0);
            updateEnergy('p-en-bar', pGal.energy, pGal.energy_max);

            const advDmg = calculateAdvancedDamage(pGal.atk, skill.multiplier || 1, pGal.level, state.currentArena, pGal.element, pGal.color, cStatus);
            let dmgC = advDmg.value;
            
            if (isTieBattle) dmgC = Math.round(300 / rounds);
            else dmgC = Math.max(1, Math.round(dmgC * 0.25)); // Redutor 3v3 ajustado para ~15s
            
            pAv.classList.add('anim-atk-l'); AudioEngine.playAttack(); await sleep(300);
            cAv.classList.add('anim-hit'); AudioEngine.playHit(); triggerHaptic('light');
            
            if (skill.effect === 'heal') {
                const heal = Math.round(300 * (skill.value / 100));
                pHP = Math.min(300, pHP + heal);
                updateHealth('p-hp-bar', -(heal / 300) * 100);
                showFloatingText(pAv, `+${heal}`, 'left', false);
            }
            
            let floatMsg = `-${dmgC}`;
            if (advDmg.type === 'critical') floatMsg = `CRÍTICO! ${floatMsg}`;
            if (advDmg.type === 'weak') floatMsg = `FRACO... ${floatMsg}`;

            showFloatingText(cAv, floatMsg, 'right', advDmg.type === 'critical'); 
            updateHealth('c-hp-bar', (dmgC / 300) * 100);
            cHP -= dmgC;
        } else if (action.type === 'item') {
            const item = state.gameData.inventory.items.find(it => it.id === action.id);
            item.count--;
            if (item.type === 'heal') {
                const heal = 50; 
                pHP = Math.min(300, pHP + heal);
                updateHealth('p-hp-bar', -(heal / 300) * 100);
                showFloatingText(pAv, `+${heal} 🧪`, 'left', false);
            } else if (item.type === 'energy') {
                pGal.energy = Math.min(pGal.energy_max, pGal.energy + item.value);
                updateEnergy('p-en-bar', pGal.energy, pGal.energy_max);
                showFloatingText(pAv, `+${item.value} ⚡`, 'left', false);
            }
            await sleep(500);
        }

        await sleep(400); pAv.classList.remove('anim-atk-l'); cAv.classList.remove('anim-hit'); await sleep(600);

        if (cHP <= 0) break;

        // --- CPU TURN ---
        const cSkills = SkillService.getSkillsForRooster(cGal.element, cGal.level);
        const affordableSkills = cSkills.filter(s => s.cost <= cGal.energy);
        const cSkill = affordableSkills.length > 0 ? affordableSkills[Math.floor(Math.random() * affordableSkills.length)] : cSkills[0];
        
        if (!cSkill) {
            console.warn("CPU sem habilidades disponíveis para o nível", cGal.level);
            await sleep(1000);
            continue; 
        }

        cGal.energy -= cSkill.cost;
        updateEnergy('c-en-bar', cGal.energy, cGal.energy_max);

        const advDmgP = calculateAdvancedDamage(cGal.atk, cSkill.multiplier, cGal.level, state.currentArena, cGal.element, cGal.color, pStatus);
        let dmgP = advDmgP.value;
        
        if (isTieBattle) dmgP = Math.round(300 / rounds);
        else dmgP = Math.max(1, Math.round(dmgP * 0.25));

        cAv.classList.add('anim-atk-r'); AudioEngine.playAttack(); await sleep(300);
        pAv.classList.add('anim-hit'); AudioEngine.playHit(); triggerHaptic('medium');

        let floatMsgP = `-${dmgP}`;
        if (advDmgP.type === 'critical') floatMsgP = `CRÍTICO! ${floatMsgP}`;
        if (advDmgP.type === 'weak') floatMsgP = `FRACO... ${floatMsgP}`;

        showFloatingText(pAv, floatMsgP, 'left', advDmgP.type === 'critical'); 
        updateHealth('p-hp-bar', (dmgP / 300) * 100);
        pHP -= dmgP;

        await sleep(400); cAv.classList.remove('anim-atk-r'); pAv.classList.remove('anim-hit'); await sleep(600);

        if (pHP <= 0) break;
    }

    let result = 'loss';
    if (isTieBattle || (pHP <= 0 && cHP <= 0) || (pHP === cHP)) {
        result = 'tie';
    } else if (pHP > cHP) {
        result = 'win';
    }

    const playerWon = result === 'win' ? true : (result === 'loss' ? false : null);

    if (result === 'win') {
        triggerHaptic('heavy');
        pTeam.forEach((r, idx) => {
            const av = document.getElementById(`player-avatar-${idx}`);
            if (av) av.classList.add('anim-winner-l');
        });
        cTeam.forEach((r, idx) => {
            const av = document.getElementById(`cpu-avatar-${idx}`);
            if (av) {
                av.classList.add('anim-ko-r', 'grayscale', 'opacity-60');
                showDeadEyes(av);
            }
        });
    } else if (result === 'loss') {
        cTeam.forEach((r, idx) => {
            const av = document.getElementById(`cpu-avatar-${idx}`);
            if (av) av.classList.add('anim-winner-r');
        });
        pTeam.forEach((r, idx) => {
            const av = document.getElementById(`player-avatar-${idx}`);
            if (av) {
                av.classList.add('anim-ko-l', 'grayscale', 'opacity-60');
                showDeadEyes(av);
            }
        });
    } else {
        // Tie visual
        pTeam.forEach((r, idx) => {
            const av = document.getElementById(`player-avatar-${idx}`);
            if (av) av.classList.add('opacity-80');
        });
        cTeam.forEach((r, idx) => {
            const av = document.getElementById(`cpu-avatar-${idx}`);
            if (av) av.classList.add('opacity-80');
        });
    }

    saveMatchResult(playerWon, pTeam[0].element, pTeam[0].color);
    
    // Engenharia de Dados: Gerar relatório real para 3v3
    const avgPAtk = Math.round(pTeam.reduce((acc, r) => acc + (r.atk || 100), 0) / pTeam.length);
    const avgCAtk = Math.round(cTeam.reduce((acc, r) => acc + (r.atk || 100), 0) / cTeam.length);
    
    const arenaBonusP = pTeam.some(r => r.element === state.currentArena.bonusElement) ? 1.25 : 1;
    const colorBonusP = pTeam.some(r => r.color === state.currentArena.color) ? 1.30 : 1;
    
    const arenaBonusC = cTeam.some(r => r.element === state.currentArena.bonusElement) ? 1.25 : 1;
    const colorBonusC = cTeam.some(r => r.color === state.currentArena.color) ? 1.30 : 1;

    const report = {
        arena: i18n.t(`arena-${state.currentArena.id}`),
        p: { 
            base: avgPAtk, 
            final: Math.round(pHP), 
            arena: arenaBonusP > 1, 
            color: colorBonusP > 1
        },
        c: { 
            base: avgCAtk, 
            final: Math.round(cHP), 
            arena: arenaBonusC > 1, 
            color: colorBonusC > 1
        }
    };

    await sleep(3000); 
    showFinalResult3v3(playerWon, report);
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
                setTimeout(() => alert(`🏆 CAMPEÃO DO TORNEIO! Você ganhou o Jackpot de ${jackpot} RC!`), 1000);
            } else {
                setTimeout(() => alert(`☠️ ELIMINADO! Melhor sorte no próximo torneio.`), 1000);
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
            alert(`SUBIU DE NÍVEL! Seus galos ficaram mais fortes!`);
        }, 1000);
    }
}

function isIdentical(r1, r2) {
    return r1.element === r2.element && r1.color === r2.color;
}

function calculateAdvancedDamage(atk, multiplier, level, arena, element, color, targetStatus) {
    const safeAtk = atk || 100;
    const arenaBonus = arena.bonusElement === element ? 1.25 : 1;
    const colorBonus = arena.color && arena.color === color ? 1.30 : 1;
    
    let dmg = SkillService.calculateDamage(safeAtk, multiplier, level);
    dmg = dmg * arenaBonus * colorBonus;
    
    // Variance (Jitter) ±5% - Reduzido para maior determinismo
    const jitter = 0.95 + (Math.random() * 0.1);
    dmg *= jitter;
    
    // Critical / Weak
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
        alert("Saldo insuficiente para entrar no torneio!");
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
        document.getElementById('bottom-nav').classList.remove('hidden');
    }
    
    // Reset Battle Stage
    const pAv = document.getElementById('player-avatar');
    if (pAv) pAv.className = "w-32 h-32 md:w-48 md:h-48 filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]";
    
    const cAv = document.getElementById('cpu-avatar');
    if (cAv) cAv.className = "w-32 h-32 md:w-48 md:h-48 filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] transform scale-x-[-1]";
    
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
    titleEl.innerText = win ? i18n.t('res-victory') : (win === null ? i18n.t('res-draw') : i18n.t('res-defeat'));
    titleEl.className = `text-4xl font-black mb-2 uppercase italic tracking-tighter ${win ? 'text-green-400' : (win === null ? 'text-yellow-400' : 'text-red-500')}`;
    document.getElementById('result-icon').innerText = win ? "🏆" : (win === null ? "⚠️" : "☠️");
    document.getElementById('res-arena-name').innerText = report.arena;

    const finDiv = document.getElementById('financial-result');
    const finDet = document.getElementById('financial-detail');
    if (win) {
        finDiv.innerText = `+${Math.floor(state.currentBet * 1.8)} RC`;
        finDiv.className = "text-3xl font-mono font-bold text-green-400 mt-1";
        finDet.innerText = `${i18n.t('res-bet')}: ${state.currentBet} | ${i18n.t('res-prize')}: ${Math.floor(state.currentBet * 1.8)} (${i18n.t('res-profit')} +${Math.floor(state.currentBet * 0.8)})`;
    } else if (win === false) {
        finDiv.innerText = `-${state.currentBet} RC`;
        finDiv.className = "text-3xl font-mono font-bold text-red-400 mt-1";
        finDet.innerText = i18n.t('res-lost');
    } else {
        finDiv.innerText = `+${state.currentBet} RC`;
        finDiv.className = "text-3xl font-mono font-bold text-yellow-400 mt-1";
        finDet.innerText = i18n.t('res-refunded');
    }

    document.getElementById('res-p-base').innerText = report.p.base;
    document.getElementById('res-p-final').innerText = report.p.final;
    const dash = '<i class="fas fa-minus-circle text-slate-600"></i>';
    document.getElementById('res-p-bonus').innerHTML = `<span>Bonus:</span> ${report.p.arena ? '<span class="text-green-400 font-bold">+25%</span>' : dash}`;
    document.getElementById('res-p-paint').innerHTML = `<span>Pintura:</span> ${report.p.color ? '<span class="text-green-400 font-bold">+30%</span>' : dash}`;
    
    renderAvatar('res-p-icon', state.player.element, state.player.color);

    document.getElementById('res-c-base').innerText = report.c.base;
    document.getElementById('res-c-final').innerText = report.c.final;
    document.getElementById('res-c-bonus').innerHTML = `<span>Bonus:</span> ${report.c.arena ? '<span class="text-red-400 font-bold">+25%</span>' : dash}`;
    document.getElementById('res-c-paint').innerHTML = `<span>Pintura:</span> ${report.c.color ? '<span class="text-red-400 font-bold">+30%</span>' : dash}`;
    
    renderAvatar('res-c-icon', state.cpu.element, state.cpu.color);

    overlay.classList.remove('hidden');
    setTimeout(() => { card.classList.remove('scale-90', 'opacity-0'); card.classList.add('scale-100', 'opacity-100'); }, 50);
    AudioEngine.playClick();
}
