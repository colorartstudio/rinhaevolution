import { state, ELEMENTS, COLORS, ARENAS } from './state.js';
import { AudioEngine } from './audio.js';
import { VFX } from './vfx.js';
import { renderAvatar, applyKnockout } from './renderer.js';
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
import { TeamService } from './team.js';
import { MissionService, MISSION_TYPES } from './missions.js';
import { TournamentService } from './tournament.js';
import { MatchLogService } from './matchLog.js';

import { SkillService, SKILLS, skillHitMultiplier, applySkillHealAmount } from './skills.js';
import {
    fusionFollowUp,
    fusionChip,
    resetEvolution,
    tickEvolution,
    tuneOutgoing,
    tuneIncoming,
    afterDamageTaken,
    sparkRatio
} from './fusion-abilities.js';
import { PVP } from './backend.js';
import {
    isMirroredForceMatch,
    createRhythmState,
    applyRhythmAfterAction,
    applyRhythmHealItemPenalty,
    isRhythmBreakerReady,
    consumeRhythmBreaker,
    getRhythmBreakerSkill,
    isBasicRhythmAttack,
    renderRhythmUI,
    hideRhythmUI,
    RHYTHM_BREAKER_ID
} from './rhythm-breaker.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
let playerActionResolve = null;
/** Escudo de loja no turno atual (1v1 ou slot 3v3) — menu de itens e UI de combate. */
let currentBattleItemGuardTurns = 0;
/** Um único cronômetro de turno. Itens chamam handleItemClick direto e precisam zerá-lo. */
let turnTimerId = null;
let turnEpoch = 0;

function clearTurnTimer() {
    if (turnTimerId) {
        clearInterval(turnTimerId);
        turnTimerId = null;
    }
}

function closePlayerAction(payload) {
    turnEpoch += 1;
    clearTurnTimer();
    const timerEl = document.getElementById('turn-timer');
    if (timerEl) timerEl.classList.add('hidden');
    if (!playerActionResolve) return;
    const resolve = playerActionResolve;
    playerActionResolve = null;
    document.getElementById('skill-panel')?.classList.add('hidden');
    document.getElementById('item-menu')?.classList.add('hidden');
    resolve(payload);
}

function isBasicStrike(skill) {
    return skill?.type === 'attack';
}

/** Golpe básico: o galo sai do lugar e espora o alvo. Especiais ficam no slot. */
async function playBasicCharge(attacker, target, skill, blocked = false, style = 'peck') {
    if (!attacker?.isConnected || !target?.isConnected) return false;
    AudioEngine.playAttack();
    await VFX.chargeStrike(attacker, target, style, {
        trail: skill?.element || 'fire',
        onImpact: () => {
            if (blocked) {
                VFX.pulseItemGuard(target);
                return;
            }
            target.classList.add('anim-hit');
            AudioEngine.playHit();
            triggerHaptic('light');
        }
    });
    return true;
}

function syncDuelKnockout(pHP, cHP, pAv, cAv, pRooster, cRooster) {
    if (cHP <= 0) applyKnockout(cAv, 'r', cRooster, false);
    if (pHP <= 0) applyKnockout(pAv, 'l', pRooster, true);
}

function syncTeamKnockouts(pHP, cHP, pTeam, cTeam) {
    for (let i = 0; i < 3; i++) {
        if (pHP[i] <= 0 && pTeam[i]) applyKnockout(`player-avatar-${i}`, 'l', pTeam[i], true);
        if (cHP[i] <= 0 && cTeam[i]) applyKnockout(`cpu-avatar-${i}`, 'r', cTeam[i], false);
    }
}

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

function safeSetStyle(id, prop, value) {
    const el = document.getElementById(id);
    if (el) el.style[prop] = value;
}

function rosterSecondary(rooster) {
    if (state.gameMode !== '3v3') return null;
    const second = rooster?.secondaryElement;
    if (!second || second === rooster.element) return null;
    return second;
}

function skillsFor(rooster, arenaId = state.currentArena?.id) {
    return SkillService.getSkillsForRooster(rooster.element, rooster.level, arenaId, rosterSecondary(rooster));
}

function strikeElement(rooster, skill) {
    return skill?.element || rooster?.element;
}

function softenOutgoing(raw, attacker) {
    let value = raw;
    if (attacker?.frail) {
        attacker.frail = 0;
        value = Math.round(value * 0.75);
    }
    if (attacker?.soak > 0) {
        attacker.soak -= 1;
        value = Math.round(value * 0.88);
    }
    if (attacker?.mud) {
        attacker.mud = 0;
        if (attacker.mist) attacker.mist = 0;
        return Math.max(1, Math.round(value * 0.82));
    }
    if (attacker?.mist) {
        attacker.mist = 0;
        value = Math.round(value * 0.88);
    }
    return Math.max(1, value);
}

function gritIncoming(raw, defender) {
    if (!defender?.grit) return raw;
    defender.grit = 0;
    return Math.max(1, Math.round(raw * 0.85));
}

/** Colapso da Terra: cada especial soma +10% de resistência até o fim da luta, no máximo 3 vezes (30%). */
const EARTH_FORT_STEP = 0.10;
const EARTH_FORT_CAP = 3;

function gainEarthFort(status, skill) {
    if (skill?.id !== 'e-arena' || !status) return 0;
    status.earthFort = Math.min(EARTH_FORT_CAP, (status.earthFort || 0) + 1);
    return status.earthFort;
}

function earthFortIncoming(raw, defender) {
    const stacks = defender?.earthFort || 0;
    if (stacks <= 0 || raw <= 0) return raw;
    return Math.max(1, Math.round(raw * (1 - stacks * EARTH_FORT_STEP)));
}

/** Esquiva vale no próximo golpe. Pierce (Terra nv.5/10 e Ar nv.5) atravessa e não gasta o desvio. */
function rollDodge(defender, skill) {
    if (!defender?.dodge || skill?.pierce) return false;
    const chance = defender.dodge;
    defender.dodge = 0;
    return Math.random() < chance;
}

/**
 * Efeitos escritos nas técnicas e nos especiais.
 * Encharcado: 2 ataques seguintes saem 12% mais fracos (a mesma conta da névoa).
 * Brasa: 45% do dano deste golpe, depois 20%.
 * Terremoto sem atordoar: o próximo ataque do alvo sai 25% mais fraco.
 */
function applyListedEffects(skill, dealt, attackerStatus, defenderStatus, drain, connectedHits = 1) {
    if (!skill || !attackerStatus) return 0;
    if (defenderStatus && dealt > 0) {
        if (skill.effect === 'burn') armBurn(defenderStatus, skill);
        if (skill.effect === 'ember') {
            defenderStatus.burnQueue = [
                { flat: Math.max(1, Math.round(dealt * 0.45)) },
                { flat: Math.max(1, Math.round(dealt * 0.20)) }
            ];
        }
        if (skill.effect === 'stun') {
            if (Math.random() < (skill.chance ?? 0)) defenderStatus.stun = true;
            else defenderStatus.frail = 1;
        }
        if (skill.effect === 'drench') defenderStatus.soak = skill.duration || 2;
        if (skill.effect === 'gust' && connectedHits > 0) drain?.((skill.gust || 8) * connectedHits);
    }
    if (skill.effect === 'shield') attackerStatus.shield = skill.value || 0.5;
    if (skill.effect === 'def') {
        attackerStatus.def = skill.value;
        attackerStatus.defTurns = skill.duration || 1;
    }
    if (skill.effect === 'dodge') attackerStatus.dodge = skill.chance || 0.45;
    return gainEarthFort(attackerStatus, skill);
}

function splashLivingFoes(skill, hitValue, hpList, maxList, takenList, primaryIdx, side) {
    const ratio = skill?.splash || (skill?.effect === 'aoe' ? 0.5 : 0);
    if (!ratio || hitValue <= 0) return;
    hpList.forEach((hp, idx) => {
        if (idx === primaryIdx || hp <= 0) return;
        const splash = applyDamageWithResistance(hp, maxList[idx], Math.round(hitValue * ratio), takenList[idx]);
        hpList[idx] = splash.newHP;
        takenList[idx] += splash.actualDamage;
        updateSlotHP(side, idx, (hpList[idx] / maxList[idx]) * 100);
    });
}

/** Escudo de loja: anula acerto, queimadura e rastros enquanto itemGuardTurns > 0. */
function tryActivateItemGuard(currentTurns, item, avatarEl) {
    if (currentTurns > 0) {
        return { turns: currentTurns, consumed: false, msgKey: 'btl-guard-locked' };
    }
    const turns = item.value || 2;
    VFX.setItemGuard(avatarEl, true);
    return { turns, consumed: true, msgKey: 'btl-float-guard' };
}

function tickItemGuardTurns(turns, avatarEl) {
    if (turns <= 0) return 0;
    const next = turns - 1;
    if (next <= 0) VFX.setItemGuard(avatarEl, false);
    return next;
}

function applyForgedMark(skill, dealt, attacker, defender, drain, attackerRooster) {
    if (!skill?.forgedBasic || dealt <= 0) return;
    if (skill.effect === 'spark') defender.burnQueue = [{ flat: Math.max(1, Math.round(dealt * sparkRatio(attackerRooster))) }];
    if (skill.effect === 'mist') defender.mist = 1;
    if (skill.effect === 'grit') attacker.grit = 1;
    if (skill.effect === 'sip') drain?.(6);
}

function ultimateIsLive(skill) {
    return skill?.type === 'ultimate' && !skill.arenaLocked;
}

function shapeTeamHit(raw, attacker, defender, strikeEl, maxHp) {
    let value = tuneOutgoing(raw, attacker, strikeEl);
    const shaped = tuneIncoming(value, defender, strikeEl, maxHp);
    return shaped;
}

function finishTaken(defender, attackerStatus, dealt, maxHp, hpList, idx) {
    const echo = afterDamageTaken(defender, attackerStatus, dealt, maxHp);
    if (echo.heal > 0 && hpList) {
        hpList[idx] = Math.min(maxHp, hpList[idx] + echo.heal);
    }
    return echo;
}

// Função para resetar o estado visual de todos os avatares (1v1 e 3v3)
function resetAllAvatarStates() {
    // Reset 1v1
    const pAv = document.getElementById('player-avatar');
    if (pAv) {
        pAv.className = "w-36 h-36 md:w-52 md:h-52 transition-transform duration-300";
        delete pAv.dataset.knockedOut;
        delete pAv.dataset.deadEyes;
    }
    
    const cAv = document.getElementById('cpu-avatar');
    if (cAv) {
        cAv.className = "w-36 h-36 md:w-52 md:h-52 scale-x-[-1] transition-transform duration-300";
        delete cAv.dataset.knockedOut;
        delete cAv.dataset.deadEyes;
    }

    // Reset 3v3
    for (let i = 0; i < 3; i++) {
        const pSlot = document.getElementById(`player-avatar-${i}`);
        if (pSlot) {
            pSlot.className = "w-20 h-20 xs:w-24 xs:h-24 md:w-32 md:h-32 transition-all duration-300";
            delete pSlot.dataset.knockedOut;
            delete pSlot.dataset.deadEyes;
        }
        
        const cSlot = document.getElementById(`cpu-avatar-${i}`);
        if (cSlot) {
            cSlot.className = "w-20 h-20 xs:w-24 xs:h-24 md:w-32 md:h-32 scale-x-[-1] transition-all duration-300";
            delete cSlot.dataset.knockedOut;
            delete cSlot.dataset.deadEyes;
        }
        
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
        
        AudioEngine.playClick();
        
        // Atualiza a UI se estiver na mochila
        if (window.app.updateInventoryUI) window.app.updateInventoryUI();
        
    } else if (item.type === 'energy') {
        const max = target.energy_max || 100;
        const cur = target.energy ?? max;
        target.energy = Math.min(max, cur + item.value);
        item.count--;
        AudioEngine.playClick();
        if (window.app.updateInventoryUI) window.app.updateInventoryUI();
    }

    state.save();
}

export function handleSkillClick(skillId) {
    closePlayerAction({ type: 'skill', id: skillId });
}

export function handleItemClick(itemId) {
    closePlayerAction({ type: 'item', id: itemId });
}

export function handlePassTurn() {
    closePlayerAction({ type: 'pass' });
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
            const guardItemBlocked = item.type === 'guard' && currentBattleItemGuardTurns > 0;
            if (!guardItemBlocked) {
                btn.onclick = () => handleItemClick(item.id);
            }
            btn.className = `flex justify-between items-center p-2 bg-slate-800 border border-slate-700 rounded-lg transition-all ${guardItemBlocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-700'}`;
            btn.disabled = guardItemBlocked;
            btn.innerHTML = `
                <div class="flex flex-col text-left">
                    <span class="text-[9px] font-bold text-white uppercase">${i18n.t(item.nameKey) || item.name}</span>
                    <span class="text-[7px] text-slate-500 uppercase">${guardItemBlocked ? i18n.t('btl-guard-locked') : (item.type === 'heal' ? i18n.t('shop-item-hp-desc') : item.type === 'guard' ? i18n.t('shop-item-shield-desc') : i18n.t('shop-item-mp-desc'))}</span>
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

    try {
        const { LocalBackend } = await import('./backend.js');
        const active = TeamService.getTeamRoosters();
        const level = active[0]?.level || 1;
        const data = LocalBackend.prepareMatch({
            userId: state.gameData.user.id,
            bet: state.currentBet,
            mode: state.gameMode || '1v1',
            level
        });

        state.battleResult = null;
        state.betLocked = true;
        state.gameData.balance = data.newBalance;
        state.gameData.pendingBet = {
            amount: state.currentBet,
            mode: state.gameMode || '1v1',
            at: Date.now()
        };
        state.cpu.element = data.cpu.element;
        state.cpu.color = data.cpu.color;
        state.cpuTeam = data.cpuTeam || [];
        state.currentArena = ARENAS.find(a => a.id === data.arena) || ARENAS[0];
        state.save();
        updateBalanceUI();
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
    AudioEngine.startMusic();
    
    // A arena já sorteada no início da partida é a que a roleta precisa mostrar.
    if (!state.currentArena) {
        state.currentArena = ARENAS[Math.floor(Math.random() * ARENAS.length)];
    }
    
    console.log(`Batalha Iniciada. Arena: ${state.currentArena.id} (${state.currentArena.name}). Modo: ${state.battleResult ? 'Ranked' : 'Local'}`);

    state.inBattle = true;

    document.getElementById('screen-selection').classList.add('hidden');
    document.getElementById('screen-battle').classList.remove('hidden');
    document.getElementById('battle-stage').style.opacity = '0';
    document.getElementById('roulette-overlay').style.display = 'flex';
    document.getElementById('roulette-overlay').style.opacity = '1';
    document.getElementById('bottom-nav').classList.add('hidden');

    playArenaRoulette(state.currentArena, () => startGame());
}

function drawDifferentArena(currentId) {
    const pool = ARENAS.filter(a => a.id !== currentId);
    return pool[Math.floor(Math.random() * pool.length)] || ARENAS[0];
}

function playArenaRoulette(nextArena, onDone) {
    const overlay = document.getElementById('roulette-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
    }
    const rName = document.getElementById('roulette-name');
    const rIcon = document.getElementById('roulette-icon');
    const bg = document.getElementById('arena-bg');
    if (rName) rName.classList.remove('scale-125', 'text-yellow-400');
    let iterations = 0;

    const interval = setInterval(() => {
        const rnd = ARENAS[Math.floor(Math.random() * ARENAS.length)];
        if (rName) rName.innerText = i18n.t(`arena-${rnd.id}`);
        if (rIcon) rIcon.innerText = rnd.icon;
        if (bg) bg.className = `absolute inset-0 z-0 transition-colors duration-100 opacity-80 ${rnd.class}`;
        iterations++;
        if (iterations % 4 === 0) AudioEngine.playTone(150, 'square', 0.05, 0.05);
        if (iterations >= 16) {
            clearInterval(interval);
            state.currentArena = nextArena;
            landArenaRoulette(onDone);
        }
    }, 100);
}

function landArenaRoulette(onDone) {
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
            if (onDone) onDone();
        }, 500);
    }, 1200);
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

async function showPlayerSkills(rooster, itemGuardTurns = 0, rhythm = null) {
    currentBattleItemGuardTurns = itemGuardTurns;
    const guardLock = itemGuardTurns > 0;
    const panel = document.getElementById('skill-panel');
    const container = document.getElementById('skill-buttons');
    const timerEl = document.getElementById('turn-timer');
    
    // Debug Log para rastrear problemas de skill
    console.log(`[Skills] Galo: ${rooster.element} (Lvl ${rooster.level}) | Arena: ${state.currentArena?.id}`);
    
    // Passamos a arena atual para desbloquear skills especiais
    const skills = skillsFor(rooster);
    
    let timerInterval = null;

    const cleanupTimer = () => {
        clearTurnTimer();
        timerInterval = null;
        if (timerEl) timerEl.classList.add('hidden');
    };

    container.innerHTML = '';
    if (guardLock) {
        const hint = document.createElement('p');
        hint.className = 'col-span-2 text-center text-[8px] font-black uppercase tracking-widest text-cyan-300/90 mb-1';
        hint.innerText = i18n.t('btl-guard-hint');
        container.appendChild(hint);
        const passBtn = document.createElement('button');
        passBtn.type = 'button';
        passBtn.onclick = () => {
            cleanupTimer();
            handlePassTurn();
        };
        passBtn.className = 'col-span-2 flex flex-col items-center justify-center p-3 mb-2 bg-cyan-950/80 hover:bg-cyan-900/90 border-2 border-cyan-500/60 rounded-2xl transition-all active:scale-95 shadow-lg';
        passBtn.innerHTML = `
            <span class="text-[11px] font-black text-cyan-100 uppercase tracking-wider">${i18n.t('btl-guard-pass')}</span>
            <span class="text-[8px] font-bold text-cyan-400/80 uppercase mt-0.5">${i18n.t('btl-guard-locked')}</span>
        `;
        container.appendChild(passBtn);
    }
    if (isRhythmBreakerReady(rhythm, 'player') && !guardLock) {
        const breaker = getRhythmBreakerSkill();
        const breakBtn = document.createElement('button');
        breakBtn.type = 'button';
        breakBtn.onclick = () => {
            cleanupTimer();
            handleSkillClick(breaker.id);
        };
        breakBtn.className = 'col-span-2 flex flex-col items-center justify-center p-3 mb-2 bg-gradient-to-b from-amber-600 to-amber-800 border-2 border-yellow-300 rounded-2xl transition-all active:scale-95 shadow-lg';
        breakBtn.innerHTML = `
            <span class="text-[11px] font-black text-white uppercase tracking-wider">${i18n.t(breaker.nameKey)}</span>
            <span class="text-[8px] font-black uppercase tracking-widest text-amber-100">${breaker.multiplier}x</span>
        `;
        container.appendChild(breakBtn);
    }
    const CHARGE_NEED = 2;
    skills.forEach(skill => {
        const charge = rooster.specialCharge || 0;
        const charging = skill.type === 'ultimate' && charge < CHARGE_NEED;
        const chargeLeft = Math.max(0, CHARGE_NEED - charge);
        const arenaLocked = skill.type === 'ultimate' && skill.arenaLocked;
        const canAfford = (rooster.energy || 0) >= skill.cost && !charging && !arenaLocked;
        const isOnCooldown = rooster.cooldowns && rooster.cooldowns[skill.id] > 0;
        const cooldownTurns = isOnCooldown ? rooster.cooldowns[skill.id] : 0;
        const canUseSkill = canAfford && !isOnCooldown && !guardLock;
        
        const btn = document.createElement('button');
        
        if (canUseSkill) {
            btn.onclick = () => {
                cleanupTimer();
                handleSkillClick(skill.id);
            };
            // Destaque para Ultimate
            const isUlt = skill.type === 'ultimate';
            const borderClass = isUlt ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-slate-700 hover:border-yellow-500/50';
            const bgClass = isUlt ? 'bg-gradient-to-b from-slate-800 to-slate-900' : 'bg-gradient-to-b from-slate-800 to-slate-900';
            
            btn.className = `flex flex-col items-center justify-center p-3 ${bgClass} hover:from-slate-700 hover:to-slate-800 border-2 ${borderClass} rounded-2xl transition-all active:scale-95 group shadow-lg ring-1 ring-yellow-500/20`;
        } else {
            btn.className = "flex flex-col items-center justify-center p-3 bg-slate-900 border-2 border-slate-800 rounded-2xl opacity-40 cursor-not-allowed shadow-inner relative overflow-hidden";
            btn.disabled = true;
        }
        
        let cooldownOverlay = '';
        if (guardLock) {
            cooldownOverlay = `
                <div class="absolute inset-0 bg-cyan-950/70 flex flex-col items-center justify-center z-10 px-1">
                    <span class="text-[8px] font-black text-cyan-200 uppercase text-center leading-tight">${i18n.t('btl-guard-no-attack')}</span>
                </div>
            `;
        } else if (arenaLocked) {
            cooldownOverlay = `
                <div class="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
                    <span class="text-[9px] font-black text-slate-300 uppercase">Fora da arena</span>
                </div>
            `;
        } else if (charging) {
            cooldownOverlay = `
                <div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                    <span class="text-xl font-black text-yellow-300">${chargeLeft}</span>
                    <span class="text-[8px] font-black text-white uppercase">rodadas</span>
                </div>
            `;
        } else if (isOnCooldown) {
            cooldownOverlay = `
                <div class="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                    <span class="text-xl font-black text-white drop-shadow-md">${cooldownTurns}</span>
                </div>
            `;
        }

        const skillTag = skill.trailTagKey
            ? `${i18n.t('skill-tag-basic')} · ${i18n.t(skill.trailTagKey)}`
            : (skill.tagKey ? i18n.t(skill.tagKey) : '');
        btn.innerHTML = `
            ${cooldownOverlay}
            <span class="text-[11px] font-black text-white uppercase tracking-wider ${canUseSkill ? 'group-hover:text-yellow-400' : 'text-slate-600'}">${i18n.t(skill.nameKey)}</span>
            ${skillTag ? `<span class="text-[8px] font-black uppercase tracking-widest text-amber-200/80">${skillTag}</span>` : ''}
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
    
    clearTurnTimer();
    const epoch = ++turnEpoch;
    const timeBudget = guardLock ? 20 : 15;
    let timeLeft = timeBudget;
    if (timerEl) {
        timerEl.classList.remove('hidden');
        timerEl.innerText = `${timeLeft}s`;
    }

    timerInterval = setInterval(() => {
        if (epoch !== turnEpoch) {
            clearTurnTimer();
            return;
        }
        timeLeft--;
        if (timerEl) timerEl.innerText = `${timeLeft}s`;
        
        if (timeLeft <= 0) {
            if (epoch !== turnEpoch) return;
            if (guardLock) {
                handlePassTurn();
            } else {
                const defaultSkill = skills.find(s => s.cost <= (rooster.energy || 0)) || skills[0];
                handleSkillClick(defaultSkill ? defaultSkill.id : 'f1');
            }
        }
    }, 1000);
    turnTimerId = timerInterval;

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

const SPECIAL_CHARGE_READY = 2;

function getCpuAffordableSkills(rooster, arenaId) {
    const skills = skillsFor(rooster, arenaId);
    return skills.filter(s => {
        if (s.cost > (rooster.energy || 0)) return false;
        if (rooster.cooldowns && rooster.cooldowns[s.id] > 0) return false;
        if (s.type === 'ultimate') {
            if ((rooster.specialCharge || 0) < SPECIAL_CHARGE_READY || s.arenaLocked) return false;
        }
        return true;
    });
}

/** Escolha de skill da CPU: prioriza especial na arena certa; golpes fortes quando não usa ultimate. */
function pickCpuBattleSkill(rooster, arenaId, { hpRatio = 1, opponentHpRatio = 1 } = {}) {
    const affordable = getCpuAffordableSkills(rooster, arenaId);
    const fallback = skillsFor(rooster, arenaId)[0];
    if (!affordable.length) return fallback;

    const ultimate = affordable.find(s => s.type === 'ultimate' && !s.arenaLocked);
    if (ultimate && (rooster.specialCharge || 0) >= SPECIAL_CHARGE_READY) {
        const el = rooster.element;
        let useUlt = false;

        if (el === 'fire' || el === 'air') {
            useUlt = Math.random() < 0.9;
        } else if (el === 'water') {
            if (hpRatio < 0.55) useUlt = true;
            else if (hpRatio < 0.8) useUlt = Math.random() < 0.7;
            else useUlt = Math.random() < 0.4;
        } else if (el === 'earth') {
            if (hpRatio < 0.55 || opponentHpRatio > hpRatio + 0.12) useUlt = true;
            else useUlt = Math.random() < 0.82;
        } else {
            useUlt = Math.random() < 0.85;
        }

        if (useUlt) return ultimate;
    }

    const basics = affordable.filter(s => s.type !== 'ultimate');
    if (basics.length) {
        basics.sort((a, b) => b.multiplier - a.multiplier);
        const best = basics[0].multiplier;
        const tier = basics.filter(s => s.multiplier >= best - 0.15);
        return tier[Math.floor(Math.random() * tier.length)];
    }

    return affordable[Math.floor(Math.random() * affordable.length)];
}

async function battleSequence() {
    if (state.gameMode === '3v3') {
        await battleSequence3v3();
        return;
    }

    const pure = (state.gameData.inventory.roosters || []).find(r => r.element === state.player.element && r.color === state.player.color && !r.secondaryElement && !r.forged && !r.dna?.evolution);
    const pRooster = pure || state.constructor.createRooster(state.player.element, state.player.color);
    const cRooster = state.constructor.createRooster(state.cpu.element, state.cpu.color, pRooster.level);
    
    const isTieBattle = isIdentical(pRooster, cRooster);

    // Initial UI Setup
    pRooster.energy = pRooster.energy_max || 100;
    cRooster.energy = cRooster.energy_max || 100;
    
    // Cooldown Management
    pRooster.cooldowns = {};
    cRooster.cooldowns = {};
    pRooster.specialCharge = 2;
    cRooster.specialCharge = 2;
    renderMatchup(pRooster, cRooster);

    updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max || 100);
    updateEnergy('c-en-bar', cRooster.energy, cRooster.energy_max || 100);

    const DUEL_HP = 400;
    let pHP = DUEL_HP;
    let cHP = DUEL_HP;
    const syncDuelHp = () => {
        const pTxt = document.getElementById('p-hp-total-text');
        const cTxt = document.getElementById('c-hp-total-text');
        if (pTxt) pTxt.innerText = `${Math.max(0, Math.round(pHP))}/${DUEL_HP} HP`;
        if (cTxt) cTxt.innerText = `${Math.max(0, Math.round(cHP))}/${DUEL_HP} HP`;
    };
    syncDuelHp();
    
    const pAv = document.getElementById('player-avatar');
    const cAv = document.getElementById('cpu-avatar');

    let pStatus = { shield: 1, def: 1, defTurns: 0, dodge: 0, burn: 0, stun: false, soak: 0, frail: 0, element: pRooster.element, color: pRooster.color };
    let cStatus = { shield: 1, def: 1, defTurns: 0, dodge: 0, burn: 0, stun: false, soak: 0, frail: 0, element: cRooster.element, color: cRooster.color };
    let pItemGuardTurns = 0;
    const rhythm = !isTieBattle && isMirroredForceMatch(pRooster, cRooster) ? createRhythmState() : null;
    if (rhythm) renderRhythmUI(rhythm);
    else hideRhythmUI();

    // Turn Loop (Até a morte ou limite de segurança)
    let round = 1;
    const MAX_ROUNDS = 100;

    while (pHP > 0 && cHP > 0 && round <= MAX_ROUNDS) {
        pRooster.energy = Math.min(pRooster.energy_max || 100, pRooster.energy + 20);
        cRooster.energy = Math.min(cRooster.energy_max || 100, cRooster.energy + 20);
        
        // Decrement Cooldowns
        for (let skId in pRooster.cooldowns) {
            if (pRooster.cooldowns[skId] > 0) pRooster.cooldowns[skId]--;
            if (pRooster.cooldowns[skId] <= 0) delete pRooster.cooldowns[skId];
        }
        for (let skId in cRooster.cooldowns) {
            if (cRooster.cooldowns[skId] > 0) cRooster.cooldowns[skId]--;
            if (cRooster.cooldowns[skId] <= 0) delete cRooster.cooldowns[skId];
        }

        updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max || 100);
        updateEnergy('c-en-bar', cRooster.energy, cRooster.energy_max || 100);
        let pUsedUlt = false;
        let cUsedUlt = false;

        // --- PLAYER TURN ---
        if (!pStatus.stun) {
            const action = await showPlayerSkills(pRooster, pItemGuardTurns, rhythm);
            
            if (action.type === 'skill') {
                if (pItemGuardTurns > 0) {
                    if (pAv) showFloatingText(pAv, i18n.t('btl-guard-no-attack'), 'left', false);
                    await sleep(400);
                } else {
                const skill = action.id === RHYTHM_BREAKER_ID
                    ? getRhythmBreakerSkill()
                    : (skillsFor(pRooster).find(s => s.id === action.id) || skillsFor(pRooster)[0]);
                if (skill?.id === RHYTHM_BREAKER_ID) consumeRhythmBreaker(rhythm, 'player');
                if (!skill) {
                    await sleep(200);
                } else {
                pRooster.energy -= skill.cost;
                
                // Set Cooldown
                if (skill.cooldown) {
                    pRooster.cooldowns[skill.id] = skill.cooldown;
                }
                if (skill.type === 'ultimate') { pRooster.specialCharge = 0; pUsedUlt = true; }

                updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max);

                const hits = skill.hits || 1;
                let dmgC = 0;
                let advDmg = { type: 'normal', value: 0 };
                let connected = 0;
                for (let hit = 0; hit < hits; hit++) {
                    if (rollDodge(cStatus, skill)) continue;
                    const mult = skillHitMultiplier(skill, hit);
                    advDmg = calculateAdvancedDamage(pRooster.atk, mult, pRooster.level, state.currentArena, strikeElement(pRooster, skill), pRooster.color, cStatus);
                    if (isTieBattle) {
                        dmgC += tieDuelHitDamage(DUEL_HP, mult);
                    } else {
                        let hitDmg = applyProportionalHit(advDmg.value, cStatus.shield, cStatus.def, DUEL_HP);
                        hitDmg = softenOutgoing(hitDmg, pStatus);
                        hitDmg = gritIncoming(hitDmg, cStatus);
                        hitDmg = earthFortIncoming(hitDmg, cStatus);
                        dmgC += hitDmg;
                    }
                    connected++;
                }
                cStatus.shield = 1;

                const isUltimateArenaSkill = ultimateIsLive(skill);
                const charged = (isBasicStrike(skill) || skill.type === 'rhythm') && await playBasicCharge(pAv, cAv, skill, false, skill.type === 'rhythm' ? 'breaker' : 'peck');
                if (!charged) {
                    if (pAv && isUltimateArenaSkill) {
                        const elClass = `arena-magic-${pRooster.element}`;
                        pAv.classList.add('arena-magic-cast', elClass);
                        AudioEngine.playElementUltimate(skill.veil || skill.element || pRooster.element);
                        if (skill.fusionId) VFX.playFusion(skill.fusionId, cAv, pAv);
                        else VFX.play(pRooster.element, cAv, pAv);
                    } else if (pAv) {
                        pAv.classList.add('anim-lunge-up', 'anim-wing-flap');
                        AudioEngine.playAttack();
                    } else {
                        AudioEngine.playAttack();
                    }
                    await sleep(300);
                    if (cAv) cAv.classList.add('anim-hit'); AudioEngine.playHit(); triggerHaptic('light');
                }
                
                // Feedback visual de Crítico/Fraco
                let floatMsg = `-${dmgC}`;
                if (advDmg.type === 'critical') floatMsg = `${i18n.t('btl-critical')} ${floatMsg}`;
                if (advDmg.type === 'weak') floatMsg = `${i18n.t('btl-weak')} ${floatMsg}`;
                
                if (cAv) showFloatingText(cAv, floatMsg, 'right', advDmg.type === 'critical'); 
                updateHealth('c-hp-bar', (dmgC / DUEL_HP) * 100);
                cHP = Math.max(0, cHP - dmgC);
                syncDuelHp();
                syncDuelKnockout(pHP, cHP, pAv, cAv, pRooster, cRooster);

                const pFort = applyListedEffects(skill, dmgC, pStatus, cStatus, (amount) => {
                    cRooster.energy = Math.max(0, (cRooster.energy || 0) - amount);
                    updateEnergy('c-en-bar', cRooster.energy, cRooster.energy_max || 100);
                }, connected);
                if (pFort && pAv) showFloatingText(pAv, i18n.t('btl-earth-fort', { n: pFort * 10 }), 'left', false);
                if (skill.effect === 'heal') {
                    const heal = applySkillHealAmount(skill, DUEL_HP, pRooster);
                    pHP = Math.min(DUEL_HP, pHP + heal);
                    updateHealth('p-hp-bar', -(heal / DUEL_HP) * 100);
                    syncDuelHp();
                    if (pAv) showFloatingText(pAv, `+${heal}`, 'left', false);
                    pRooster.hp_current = pHP;
                }
                applyForgedMark(skill, dmgC, pStatus, cStatus, (amount) => {
                    cRooster.energy = Math.max(0, (cRooster.energy || 0) - amount);
                    updateEnergy('c-en-bar', cRooster.energy, cRooster.energy_max || 100);
                });
                }
                }
            } else if (action.type === 'pass') {
                if (pAv) showFloatingText(pAv, i18n.t('btl-guard-pass'), 'left', false);
                AudioEngine.playClick();
                await sleep(500);
            } else if (action.type === 'item') {
                const item = state.gameData.inventory.items.find(i => i.id === action.id);
                if (!item || item.count <= 0) {
                    await sleep(200);
                } else if (item.type === 'guard') {
                    const guard = tryActivateItemGuard(pItemGuardTurns, item, pAv);
                    pItemGuardTurns = guard.turns;
                    if (guard.consumed) item.count--;
                    if (pAv) showFloatingText(pAv, i18n.t(guard.msgKey), 'left', false);
                } else {
                    item.count--;
                    if (item.type === 'heal') {
                        const heal = Math.round(DUEL_HP * (item.value / 100));
                        pHP = Math.min(DUEL_HP, pHP + heal);
                        updateHealth('p-hp-bar', -(heal / DUEL_HP) * 100);
                        syncDuelHp();
                        if (pAv) showFloatingText(pAv, `+${heal} 🧪`, 'left', false);
                        pRooster.hp_current = pHP;
                        if (rhythm) {
                            applyRhythmHealItemPenalty(rhythm, 'player');
                            renderRhythmUI(rhythm);
                        }
                    } else if (item.type === 'energy') {
                        pRooster.energy = Math.min(pRooster.energy_max || 100, pRooster.energy + item.value);
                        updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max || 100);
                        if (pAv) showFloatingText(pAv, `+${item.value} ⚡`, 'left', false);
                    }
                }
                AudioEngine.playClick();
                state.save();
                await sleep(500);
            }

            if (rhythm && action.type === 'skill' && pItemGuardTurns === 0) {
                const acted = action.id === RHYTHM_BREAKER_ID
                    ? getRhythmBreakerSkill()
                    : skillsFor(pRooster).find(s => s.id === action.id);
                applyRhythmAfterAction(rhythm, 'player', {
                    usedBreaker: acted?.id === RHYTHM_BREAKER_ID,
                    usedUlt: acted?.type === 'ultimate',
                    usedBasic: isBasicRhythmAttack(acted)
                });
                renderRhythmUI(rhythm);
            }

            await sleep(400); 
            if (pAv) pAv.classList.remove('anim-lunge-up', 'anim-wing-flap', 'arena-magic-cast', 'arena-magic-fire', 'arena-magic-water', 'arena-magic-earth', 'arena-magic-air'); 
            if (cAv) cAv.classList.remove('anim-hit'); 
            await sleep(600);
        } else {
            if (pAv) showFloatingText(pAv, i18n.t('btl-stunned'), 'left', false);
            pStatus.stun = false;
            await sleep(1000);
        }

        if (cHP <= 0) break;

        // Apply Burn
        const cBurn = takeBurn(cStatus, DUEL_HP);
        if (cBurn > 0) {
            cHP = Math.max(0, cHP - cBurn);
            updateHealth('c-hp-bar', (cBurn / DUEL_HP) * 100);
            syncDuelHp();
            showFloatingText(cAv, `-${cBurn} ${i18n.t('btl-float-burn')}`, 'right', false);
            syncDuelKnockout(pHP, cHP, pAv, cAv, pRooster, cRooster);
            await sleep(800);
        }

        if (cHP <= 0) break;

        // --- CPU TURN ---
        if (!cStatus.stun) {
            const cpuBroke = isRhythmBreakerReady(rhythm, 'cpu');
            const cSkill = cpuBroke
                ? getRhythmBreakerSkill()
                : pickCpuBattleSkill(cRooster, state.currentArena?.id, {
                    hpRatio: cHP / DUEL_HP,
                    opponentHpRatio: pHP / DUEL_HP
                });
            if (cpuBroke) consumeRhythmBreaker(rhythm, 'cpu');
            
            cRooster.energy -= cSkill.cost;
            if (cSkill.cooldown) {
                cRooster.cooldowns[cSkill.id] = cSkill.cooldown;
            }
            if (cSkill.type === 'ultimate') { cRooster.specialCharge = 0; cUsedUlt = true; }

            updateEnergy('c-en-bar', cRooster.energy, cRooster.energy_max);

            const cHits = cSkill.hits || 1;
            let dmgP = 0;
            let advDmgP = { type: 'normal', value: 0 };
            let dodged = false;
            let cpuConnected = 0;
            const guardBlocksHit = pItemGuardTurns > 0;
            if (!guardBlocksHit) {
                for (let hit = 0; hit < cHits; hit++) {
                    if (rollDodge(pStatus, cSkill)) {
                        dodged = true;
                        continue;
                    }
                    const mult = skillHitMultiplier(cSkill, hit);
                    advDmgP = calculateAdvancedDamage(cRooster.atk, mult, cRooster.level, state.currentArena, cRooster.element, cRooster.color, pStatus);
                    if (isTieBattle) {
                        dmgP += tieDuelHitDamage(DUEL_HP, mult);
                    } else {
                        let hitDmg = earthFortIncoming(applyProportionalHit(advDmgP.value, pStatus.shield, pStatus.def, DUEL_HP), pStatus);
                        hitDmg = softenOutgoing(hitDmg, cStatus);
                        hitDmg = gritIncoming(hitDmg, pStatus);
                        dmgP += hitDmg;
                    }
                    cpuConnected++;
                }
                pStatus.shield = 1;
            }
            if (dodged && dmgP === 0 && pAv) showFloatingText(pAv, 'DESVIO', 'left', false);

            // CPU Attack Visuals
            const isCpuUltimate = cSkill.type === 'ultimate' && cSkill.arenaReq === state.currentArena?.id;
            
            const cpuBasic = (isBasicStrike(cSkill) || cSkill.type === 'rhythm') && await playBasicCharge(cAv, pAv, cSkill, guardBlocksHit, cSkill.type === 'rhythm' ? 'breaker' : 'peck');
            if (!cpuBasic) {
                if (isCpuUltimate) {
                    const elClass = `arena-magic-${cRooster.element}`;
                    if(cAv) cAv.classList.add('arena-magic-cast', elClass);
                    AudioEngine.playElementUltimate(cRooster.element);
                    if(cAv && pAv) VFX.play(cRooster.element, pAv);
                } else {
                    if (cAv) cAv.classList.add('anim-lunge-down', 'anim-wing-flap'); 
                    AudioEngine.playAttack(); 
                }
                await sleep(300);
            }
            if (guardBlocksHit) {
                if (pAv) {
                    if (!cpuBasic) VFX.pulseItemGuard(pAv);
                    showFloatingText(pAv, i18n.t('btl-float-guard'), 'left', false);
                }
                AudioEngine.playClick();
            } else {
                if (!cpuBasic && pAv) pAv.classList.add('anim-hit');
                if (!cpuBasic) { AudioEngine.playHit(); triggerHaptic('medium'); }
            
                let floatMsgP = `-${dmgP}`;
                if (advDmgP.type === 'critical') floatMsgP = `${i18n.t('btl-critical')} ${floatMsgP}`;
                if (advDmgP.type === 'weak') floatMsgP = `${i18n.t('btl-weak')} ${floatMsgP}`;

                if (pAv) showFloatingText(pAv, floatMsgP, 'left', advDmgP.type === 'critical'); 
                updateHealth('p-hp-bar', (dmgP / DUEL_HP) * 100);
                pHP = Math.max(0, pHP - dmgP);
                syncDuelHp();
                syncDuelKnockout(pHP, cHP, pAv, cAv, pRooster, cRooster);

            }
            const cFort = applyListedEffects(cSkill, guardBlocksHit ? 0 : dmgP, cStatus, guardBlocksHit ? null : pStatus, (amount) => {
                pRooster.energy = Math.max(0, (pRooster.energy || 0) - amount);
                updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max || 100);
            }, cpuConnected);
            if (cFort && cAv) showFloatingText(cAv, i18n.t('btl-earth-fort', { n: cFort * 10 }), 'right', false);
            if (cSkill.effect === 'heal') {
                const heal = applySkillHealAmount(cSkill, DUEL_HP, cRooster);
                cHP = Math.min(DUEL_HP, cHP + heal);
                updateHealth('c-hp-bar', -(heal / DUEL_HP) * 100);
                syncDuelHp();
                if (cAv) showFloatingText(cAv, `+${heal}`, 'right', false);
            }
            if (rhythm) {
                applyRhythmAfterAction(rhythm, 'cpu', {
                    usedBreaker: cpuBroke,
                    usedUlt: cSkill.type === 'ultimate',
                    usedBasic: isBasicRhythmAttack(cSkill)
                });
                renderRhythmUI(rhythm);
            }

            await sleep(400); 
            if (cAv) cAv.classList.remove('anim-lunge-down', 'anim-wing-flap', 'arena-magic-cast', 'arena-magic-fire', 'arena-magic-water', 'arena-magic-earth', 'arena-magic-air'); 
            if (pAv) pAv.classList.remove('anim-hit'); 
            await sleep(600);
        } else {
            if (cAv) showFloatingText(cAv, i18n.t('btl-stunned'), 'right', false);
            cStatus.stun = false;
            await sleep(1000);
        }

        // Apply Burn Player
        const pBurn = pItemGuardTurns > 0 ? 0 : takeBurn(pStatus, DUEL_HP);
        if (pBurn > 0) {
            pHP = Math.max(0, pHP - pBurn);
            updateHealth('p-hp-bar', (pBurn / DUEL_HP) * 100);
            syncDuelHp();
            showFloatingText(pAv, `-${pBurn} ${i18n.t('btl-float-burn')}`, 'left', false);
            syncDuelKnockout(pHP, cHP, pAv, cAv, pRooster, cRooster);
            await sleep(800);
        }

        if (pHP <= 0 || cHP <= 0) break;
        
        if (!pUsedUlt && (pRooster.specialCharge || 0) < 2) pRooster.specialCharge = (pRooster.specialCharge || 0) + 1;
        if (!cUsedUlt && (cRooster.specialCharge || 0) < 2) cRooster.specialCharge = (cRooster.specialCharge || 0) + 1;
        if (pStatus.defTurns > 0 && --pStatus.defTurns <= 0) pStatus.def = 1;
        if (cStatus.defTurns > 0 && --cStatus.defTurns <= 0) cStatus.def = 1;
        pItemGuardTurns = tickItemGuardTurns(pItemGuardTurns, pAv);
        if (pHP > 0 && cHP > 0) {
            const nextArena = drawDifferentArena(state.currentArena?.id);
            await new Promise(resolve => playArenaRoulette(nextArena, resolve));
        }
        renderMatchup(pRooster, cRooster);
        round++;
    }

    VFX.setItemGuard(pAv, false);
    hideRhythmUI();

    let result = 'loss';
    if (isTieBattle || (pHP <= 0 && cHP <= 0) || (round > MAX_ROUNDS && pHP === cHP)) {
        result = 'tie';
    } else if (pHP > cHP) {
        result = 'win';
    }

    if (result === 'win') {
        pAv.classList.add('anim-winner-l');
        if (cAv?.dataset.knockedOut !== '1') applyKnockout(cAv, 'r', cRooster, false);
        AudioEngine.playWin();
        triggerHaptic('heavy');
    } else if (result === 'loss') {
        cAv.classList.add('anim-winner-r');
        if (pAv?.dataset.knockedOut !== '1') applyKnockout(pAv, 'l', pRooster, true);
        else AudioEngine.playLoss();
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

    const pForce = fighterPower(pRooster, cRooster);
    const cForce = fighterPower(cRooster, pRooster);
    report = {
        arena: i18n.t(`arena-${state.currentArena.id}`),
        p: { base: pForce.base, final: pForce.power, arena: pForce.arenaOn, color: pForce.colorOn },
        c: { base: cForce.base, final: cForce.power, arena: cForce.arenaOn, color: cForce.colorOn }
    };
    
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
    let cHP = cTeam.map(r => r.hp_max || r.hp || 100);
    const pMaxHP = [...pHP];
    const cMaxHP = [...cHP];
    
    let pEnergy = pTeam.map(r => r.energy_max || 100);
    let cEnergy = cTeam.map(() => 100);

    const isTieBattle = pTeam.length === cTeam.length && pTeam.every((r, i) => isIdentical(r, cTeam[i]));
    pTeam.forEach(r => { r.specialCharge = 2; resetEvolution(r); });
    cTeam.forEach(r => {
        r.specialCharge = 2;
        resetEvolution(r);
        r.cooldowns = {};
        r.energy = r.energy_max || 100;
    });
    const blankStatus = () => ({ shield: 1, def: 1, defTurns: 0, burnQueue: [], earthFort: 0, dodge: 0, stun: false, soak: 0, frail: 0 });
    const pStat = pTeam.map(blankStatus);
    const cStat = cTeam.map(blankStatus);
    let pItemGuardTurns = pTeam.map(() => 0);

    // Renderizar Avatares Iniciais
    pTeam.forEach((r, idx) => renderAvatar(`player-avatar-${idx}`, r.element, r.color, r.dna?.skin || 'none'));
    cTeam.forEach((r, idx) => renderAvatar(`cpu-avatar-${idx}`, r.element, r.color, 'none'));

    // Reset UI
    updateTotalHP(pHP, cHP, pMaxHP, cMaxHP);
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
        cTeam.forEach(r => {
            if (!r.cooldowns) return;
            for (const skId in r.cooldowns) {
                if (r.cooldowns[skId] > 0) r.cooldowns[skId]--;
                if (r.cooldowns[skId] <= 0) delete r.cooldowns[skId];
            }
        });

        // Ordem por lugar: 1º seu, 1º deles, 2º seu, 2º deles, 3º seu, 3º deles.
        // Galo morto pula a vez; o do mesmo lugar do outro lado ainda age.
        let pRoundDamageTakenByCPU = cHP.map(() => 0);
        let cRoundDamageTakenByPlayer = pHP.map(() => 0);
        const slotCount = Math.max(pTeam.length, cTeam.length);

        for (let slot = 0; slot < slotCount; slot++) {
            if (!pHP.some(h => h > 0) || !cHP.some(h => h > 0)) break;

            const pIdx = slot;
            if (pTeam[pIdx] && pHP[pIdx] > 0) { 
            
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
            pGal.energy = pEnergy[pIdx];

            if (pStat[pIdx].stun) {
                if (pAv) showFloatingText(pAv, i18n.t('btl-stunned'), 'left', false);
                pStat[pIdx].stun = false;
                await sleep(700);
            } else {
            let action = await showPlayerSkills(pGal, pItemGuardTurns[pIdx]);

            if (action.type === 'skill') {
                if (pItemGuardTurns[pIdx] > 0) {
                    if (pAv) showFloatingText(pAv, i18n.t('btl-guard-no-attack'), 'left', false);
                    await sleep(400);
                } else {
                const skill = skillsFor(pGal).find(s => s.id === action.id) || skillsFor(pGal)[0];
                pEnergy[pIdx] -= (skill.cost || 0);
                updateSlotEnergy('p', pIdx, pEnergy[pIdx]);

                const cGal = cTeam[playerTargetIdx];
                const foe = cStat[playerTargetIdx];
                const strike = strikeElement(pGal, skill);
                tickEvolution(pGal);
                const foeView = { element: cGal.element, color: cGal.color, shield: foe.shield, def: foe.def };

                const hits = skill.hits || 1;
                let dmg = 0;
                let connected = 0;
                let splashBase = 0;
                let advDmg = { type: 'normal', value: 0 };
                for (let hit = 0; hit < hits; hit++) {
                    if (cHP[playerTargetIdx] <= 0) break;
                    if (rollDodge(foe, skill)) continue;
                    const mult = skillHitMultiplier(skill, hit);
                    advDmg = calculateAdvancedDamage(pGal.atk, mult, pGal.level, state.currentArena, strike, pGal.color, foeView);
                    let hitValue = applyProportionalHit(advDmg.value, foe.shield, foe.def, cMaxHP[playerTargetIdx]);
                    hitValue = softenOutgoing(hitValue, pStat[pIdx]);
                    hitValue = gritIncoming(hitValue, foe);
                    hitValue = earthFortIncoming(hitValue, foe);
                    const shaped = shapeTeamHit(hitValue, pGal, cGal, strike, cMaxHP[playerTargetIdx]);
                    hitValue = shaped.damage + (hit === 0 ? fusionChip(skill, cMaxHP[playerTargetIdx]) : 0);
                    if (shaped.note && cAv && hit === 0) showFloatingText(cAv, i18n.t(shaped.note), 'right', false);
                    if (hit === 0) splashBase = hitValue;
                    const resResult = applyDamageWithResistance(cHP[playerTargetIdx], cMaxHP[playerTargetIdx], hitValue, pRoundDamageTakenByCPU[playerTargetIdx]);
                    dmg += resResult.actualDamage;
                    cHP[playerTargetIdx] = resResult.newHP;
                    pRoundDamageTakenByCPU[playerTargetIdx] += resResult.actualDamage;
                    connected++;
                }
                foe.shield = 1;
                if (skill.splash || skill.effect === 'aoe') {
                    splashLivingFoes(skill, splashBase, cHP, cMaxHP, pRoundDamageTakenByCPU, playerTargetIdx, 'c');
                    syncTeamKnockouts(pHP, cHP, pTeam, cTeam);
                }
                
                const isUltimateArenaSkill = ultimateIsLive(skill);
                const charged = isBasicStrike(skill) && await playBasicCharge(pAv, cAv, skill);
                if (!charged) {
                    if (pAv && isUltimateArenaSkill) {
                        const elClass = `arena-magic-${skill.veil || pGal.element}`;
                        pAv.classList.add('arena-magic-cast', elClass);
                        AudioEngine.playElementUltimate(skill.veil || pGal.element);
                        if (cAv && skill.fusionId) VFX.playFusion(skill.fusionId, cAv, pAv);
                        else if (cAv) VFX.play(pGal.element, cAv, pAv);
                    } else if (pAv) {
                        pAv.classList.add('anim-lunge-up', 'anim-wing-flap');
                        AudioEngine.playAttack();
                    } else {
                        AudioEngine.playAttack();
                    }
                    await sleep(300);
                    if (cAv) cAv.classList.add('anim-hit'); AudioEngine.playHit(); triggerHaptic('light');
                }

                updateSlotHP('c', playerTargetIdx, (cHP[playerTargetIdx] / cMaxHP[playerTargetIdx]) * 100);
                const pFort = applyListedEffects(skill, dmg, pStat[pIdx], foe, (amount) => {
                    cEnergy[playerTargetIdx] = Math.max(0, (cEnergy[playerTargetIdx] || 0) - amount);
                    cGal.energy = cEnergy[playerTargetIdx];
                }, connected);
                if (pFort && pAv) showFloatingText(pAv, i18n.t('btl-earth-fort', { n: pFort * 10 }), 'left', false);
                if (skill.effect === 'heal') {
                    const heal = applySkillHealAmount(skill, pMaxHP[pIdx], pGal);
                    pHP[pIdx] = Math.min(pGal.hp_max, pHP[pIdx] + heal);
                    updateSlotHP('p', pIdx, (pHP[pIdx] / pGal.hp_max) * 100);
                    if (pAv) showFloatingText(pAv, `+${heal}`, 'left', false);
                    pGal.hp_current = pHP[pIdx];
                }
                if (skill.effect !== 'heal') {
                    updateSlotHP('c', playerTargetIdx, (cHP[playerTargetIdx] / cMaxHP[playerTargetIdx]) * 100);
                    
                    let floatMsg = `-${dmg}`;
                    if (advDmg.type === 'critical') floatMsg = `${i18n.t('btl-critical')} ${floatMsg}`;
                    if (advDmg.type === 'weak') floatMsg = `${i18n.t('btl-weak')} ${floatMsg}`;
                    if (cAv) showFloatingText(cAv, floatMsg, 'right', advDmg.type === 'critical');

                    syncTeamKnockouts(pHP, cHP, pTeam, cTeam);
                }
                applyForgedMark(skill, dmg, pStat[pIdx], foe, (amount) => {
                    cEnergy[playerTargetIdx] = Math.max(0, (cEnergy[playerTargetIdx] || 0) - amount);
                    cGal.energy = cEnergy[playerTargetIdx];
                }, pGal);
                fusionFollowUp(skill, foe);
                if (skill.sip) {
                    cEnergy[playerTargetIdx] = Math.max(0, (cEnergy[playerTargetIdx] || 0) - skill.sip);
                    cGal.energy = cEnergy[playerTargetIdx];
                }
                const echo = finishTaken(cGal, pStat[pIdx], dmg, cMaxHP[playerTargetIdx], cHP, playerTargetIdx);
                if (echo.heal > 0) {
                    updateSlotHP('c', playerTargetIdx, (cHP[playerTargetIdx] / cMaxHP[playerTargetIdx]) * 100);
                    if (cAv) showFloatingText(cAv, `+${echo.heal}`, 'right', false);
                } else if (echo.note && pAv) {
                    showFloatingText(pAv, i18n.t(echo.note), 'left', false);
                }
                }
            } else if (action.type === 'pass') {
                if (pAv) showFloatingText(pAv, i18n.t('btl-guard-pass'), 'left', false);
                AudioEngine.playClick();
                await sleep(500);
            } else if (action.type === 'item') {
                const item = state.gameData.inventory.items.find(it => it.id === action.id);
                if (!item || item.count <= 0) {
                    await sleep(200);
                } else if (item.type === 'guard') {
                    const guard = tryActivateItemGuard(pItemGuardTurns[pIdx], item, pAv);
                    pItemGuardTurns[pIdx] = guard.turns;
                    if (guard.consumed) item.count--;
                    if (pAv) showFloatingText(pAv, i18n.t(guard.msgKey), 'left', false);
                    AudioEngine.playClick();
                    state.save();
                    await sleep(500);
                } else {
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
                    AudioEngine.playClick();
                    state.save();
                    await sleep(500);
                }
            }

            const usedUlt = action.type === 'skill' && skillsFor(pGal).find(s => s.id === action.id)?.type === 'ultimate';
            if (usedUlt) pGal.specialCharge = 0;
            else if ((pGal.specialCharge || 0) < 2) pGal.specialCharge = (pGal.specialCharge || 0) + 1;
            updateTotalHP(pHP, cHP, pMaxHP, cMaxHP);
            await sleep(400); 
            if (pAv) pAv.classList.remove('anim-lunge-up', 'anim-wing-flap', 'arena-magic-cast', 'arena-magic-fire', 'arena-magic-water', 'arena-magic-earth', 'arena-magic-air'); 
            if (cAv) cAv.classList.remove('target-rooster');
            pTeam.forEach((_, i) => {
                const el = document.getElementById(`player-avatar-${i}`);
                if (el) el.classList.remove('active-rooster', 'inactive-rooster');
            });
            await sleep(350);
            }
            }

            if (!pHP.some(h => h > 0) || !cHP.some(h => h > 0)) break;

            const cIdx = slot;
            if (cTeam[cIdx] && cHP[cIdx] > 0) {
            
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

            if (cStat[cIdx].stun) {
                if (cAv) showFloatingText(cAv, i18n.t('btl-stunned'), 'right', false);
                cStat[cIdx].stun = false;
                await sleep(700);
            } else {
            const pGal = pTeam[cpuTargetIdx];
            const victim = pStat[cpuTargetIdx];
            const pStatus = { element: pGal.element, color: pGal.color, shield: victim.shield, def: victim.def };

            cEnergy[cIdx] = Math.min(100, cEnergy[cIdx] + 15);
            cGal.energy = cEnergy[cIdx];

            const cSkill = pickCpuBattleSkill(cGal, state.currentArena?.id, {
                hpRatio: cHP[cIdx] / cMaxHP[cIdx],
                opponentHpRatio: pHP[cpuTargetIdx] / pMaxHP[cpuTargetIdx]
            });

            cEnergy[cIdx] -= cSkill.cost || 0;
            if (cSkill.cooldown) {
                cGal.cooldowns[cSkill.id] = cSkill.cooldown;
            }

            const cpuStrike = strikeElement(cGal, cSkill);
            tickEvolution(cGal);
            const guardBlocksHit = pItemGuardTurns[cpuTargetIdx] > 0;
            let dmgP = 0;
            let cpuConnected = 0;
            const advDmgP = { type: 'normal', value: 0 };
            if (!guardBlocksHit) {
                const hits = cSkill.hits || 1;
                for (let hit = 0; hit < hits; hit++) {
                    if (pHP[cpuTargetIdx] <= 0) break;
                    if (rollDodge(victim, cSkill)) continue;
                    const mult = skillHitMultiplier(cSkill, hit);
                    const rolled = calculateAdvancedDamage(cGal.atk, mult, cGal.level || 1, state.currentArena, cpuStrike, cGal.color, pStatus);
                    advDmgP.type = rolled.type;
                    let hitValue = applyProportionalHit(rolled.value, victim.shield, victim.def, pMaxHP[cpuTargetIdx]);
                    hitValue = softenOutgoing(hitValue, cStat[cIdx]);
                    hitValue = gritIncoming(hitValue, victim);
                    hitValue = earthFortIncoming(hitValue, victim);
                    const shapedP = shapeTeamHit(hitValue, cGal, pGal, cpuStrike, pMaxHP[cpuTargetIdx]);
                    hitValue = shapedP.damage + (hit === 0 ? fusionChip(cSkill, pMaxHP[cpuTargetIdx]) : 0);
                    if (shapedP.note && pAv && hit === 0) showFloatingText(pAv, i18n.t(shapedP.note), 'left', false);
                    const resResultP = applyDamageWithResistance(pHP[cpuTargetIdx], pMaxHP[cpuTargetIdx], hitValue, cRoundDamageTakenByPlayer[cpuTargetIdx]);
                    dmgP += resResultP.actualDamage;
                    pHP[cpuTargetIdx] = resResultP.newHP;
                    cRoundDamageTakenByPlayer[cpuTargetIdx] += resResultP.actualDamage;
                    cpuConnected++;
                }
                victim.shield = 1;
                applyForgedMark(cSkill, dmgP, cStat[cIdx], victim, (amount) => {
                    pEnergy[cpuTargetIdx] = Math.max(0, (pEnergy[cpuTargetIdx] || 0) - amount);
                    pGal.energy = pEnergy[cpuTargetIdx];
                    updateSlotEnergy('p', cpuTargetIdx, pEnergy[cpuTargetIdx]);
                }, cGal);
                fusionFollowUp(cSkill, victim);
                if (cSkill.sip) {
                    pEnergy[cpuTargetIdx] = Math.max(0, (pEnergy[cpuTargetIdx] || 0) - cSkill.sip);
                    pGal.energy = pEnergy[cpuTargetIdx];
                    updateSlotEnergy('p', cpuTargetIdx, pEnergy[cpuTargetIdx]);
                }
                const echoP = finishTaken(pGal, cStat[cIdx], dmgP, pMaxHP[cpuTargetIdx], pHP, cpuTargetIdx);
                if (echoP.heal > 0 && pAv) showFloatingText(pAv, `+${echoP.heal}`, 'left', false);
                else if (echoP.note && pAv) showFloatingText(pAv, i18n.t(echoP.note), 'left', false);
            }
            const cFortTeam = applyListedEffects(cSkill, guardBlocksHit ? 0 : dmgP, cStat[cIdx], guardBlocksHit ? null : victim, (amount) => {
                pEnergy[cpuTargetIdx] = Math.max(0, (pEnergy[cpuTargetIdx] || 0) - amount);
                pGal.energy = pEnergy[cpuTargetIdx];
                updateSlotEnergy('p', cpuTargetIdx, pEnergy[cpuTargetIdx]);
            }, cpuConnected);
            if (cFortTeam && cAv) showFloatingText(cAv, i18n.t('btl-earth-fort', { n: cFortTeam * 10 }), 'right', false);
            if (cSkill.effect === 'heal') {
                const heal = applySkillHealAmount(cSkill, cMaxHP[cIdx], cGal);
                cHP[cIdx] = Math.min(cMaxHP[cIdx], cHP[cIdx] + heal);
                updateSlotHP('c', cIdx, (cHP[cIdx] / cMaxHP[cIdx]) * 100);
                if (cAv) showFloatingText(cAv, `+${heal}`, 'right', false);
            }
            if (cSkill.type === 'ultimate') cGal.specialCharge = 0;
            else if ((cGal.specialCharge || 0) < 2) cGal.specialCharge = (cGal.specialCharge || 0) + 1;
            const isCpuUltimate = ultimateIsLive(cSkill);
            const cpuBasic = isBasicStrike(cSkill) && await playBasicCharge(cAv, pAv, cSkill, guardBlocksHit);
            if (!cpuBasic) {
                if (isCpuUltimate) {
                    const elClass = `arena-magic-${cSkill.veil || cGal.element}`;
                    if (cAv) cAv.classList.add('arena-magic-cast', elClass);
                    AudioEngine.playElementUltimate(cSkill.veil || cGal.element);
                    if (cAv && pAv && cSkill.fusionId) VFX.playFusion(cSkill.fusionId, pAv, cAv);
                    else if (cAv && pAv) VFX.play(cGal.element, pAv, cAv);
                } else {
                    if (cAv) cAv.classList.add('anim-lunge-down', 'anim-wing-flap');
                    AudioEngine.playAttack();
                }
                await sleep(300);
            }
            if (guardBlocksHit) {
                if (pAv) {
                    if (!cpuBasic) VFX.pulseItemGuard(pAv);
                    showFloatingText(pAv, i18n.t('btl-float-guard'), 'left', false);
                }
                AudioEngine.playClick();
            } else {
                if (!cpuBasic && pAv) {
                    pAv.classList.add('anim-hit');
                    AudioEngine.playHit();
                    triggerHaptic('medium');
                }
                updateSlotHP('p', cpuTargetIdx, (pHP[cpuTargetIdx] / pMaxHP[cpuTargetIdx]) * 100);
                let floatMsgP = `-${dmgP}`;
                if (advDmgP.type === 'critical') floatMsgP = `${i18n.t('btl-critical')} ${floatMsgP}`;
                if (pAv) showFloatingText(pAv, floatMsgP, 'left', advDmgP.type === 'critical');
            }

            syncTeamKnockouts(pHP, cHP, pTeam, cTeam);

            updateTotalHP(pHP, cHP, pMaxHP, cMaxHP);
            await sleep(400); 
            if (cAv) cAv.classList.remove('anim-lunge-down', 'anim-wing-flap', 'arena-magic-cast', 'arena-magic-fire', 'arena-magic-water', 'arena-magic-earth', 'arena-magic-air'); 
            if (pAv) pAv.classList.remove('target-rooster');
            cTeam.forEach((_, i) => {
                const el = document.getElementById(`cpu-avatar-${i}`);
                if (el) el.classList.remove('active-rooster', 'inactive-rooster');
            });
            await sleep(350);
            }
            }
        }

        for (let i = 0; i < pTeam.length; i++) {
            const burn = pItemGuardTurns[i] > 0 ? 0 : takeBurn(pStat[i], pMaxHP[i]);
            if (burn > 0 && pHP[i] > 0) {
                pHP[i] = Math.max(0, pHP[i] - burn);
                updateSlotHP('p', i, (pHP[i] / pMaxHP[i]) * 100);
            }
            if (pStat[i].defTurns > 0 && --pStat[i].defTurns <= 0) pStat[i].def = 1;
            const pGuardAv = document.getElementById(`player-avatar-${i}`);
            pItemGuardTurns[i] = tickItemGuardTurns(pItemGuardTurns[i], pGuardAv);
        }
        for (let i = 0; i < cTeam.length; i++) {
            const burn = takeBurn(cStat[i], cMaxHP[i]);
            if (burn > 0 && cHP[i] > 0) {
                cHP[i] = Math.max(0, cHP[i] - burn);
                updateSlotHP('c', i, (cHP[i] / cMaxHP[i]) * 100);
            }
            if (cStat[i].defTurns > 0 && --cStat[i].defTurns <= 0) cStat[i].def = 1;
        }
        syncTeamKnockouts(pHP, cHP, pTeam, cTeam);
        updateTotalHP(pHP, cHP, pMaxHP, cMaxHP);

        round++;
        if (pHP.some(h => h > 0) && cHP.some(h => h > 0)) {
            const nextArena = drawDifferentArena(state.currentArena?.id);
            await new Promise(resolve => playArenaRoulette(nextArena, resolve));
        }
    }

    pTeam.forEach((_, i) => VFX.setItemGuard(document.getElementById(`player-avatar-${i}`), false));

    // Determinar Resultado Final
    let result = 'loss';
    const pAlive = pHP.some(h => h > 0);
    const cAlive = cHP.some(h => h > 0);

    if (isTieBattle || (!pAlive && !cAlive)) result = 'tie';
    else if (pAlive && !cAlive) result = 'win';
    else if (!pAlive && cAlive) result = 'loss';
    else {
        const pSum = pHP.reduce((a, b) => a + b, 0);
        const cSum = cHP.reduce((a, b) => a + b, 0);
        result = pSum > cSum ? 'win' : (cSum > pSum ? 'loss' : 'tie');
    }

    const playerWon = result === 'win' ? true : (result === 'loss' ? false : null);
    
    // Animações Finais
    syncTeamKnockouts(pHP, cHP, pTeam, cTeam);
    if (result === 'win') {
        AudioEngine.playWin();
        pHP.forEach((h, idx) => {
            const el = document.getElementById(`player-avatar-${idx}`);
            if (h > 0 && el) el.classList.add('anim-winner-l');
        });
    } else if (result === 'loss') {
        const anyPlayerKo = pHP.some((h, idx) => h <= 0 && document.getElementById(`player-avatar-${idx}`)?.dataset.knockedOut === '1');
        if (!anyPlayerKo) AudioEngine.playLoss();
        cHP.forEach((h, idx) => {
            const el = document.getElementById(`cpu-avatar-${idx}`);
            if (h > 0 && el) el.classList.add('anim-winner-r');
        });
    }

    saveMatchResult(playerWon, pTeam[0].element, pTeam[0].color);
    
    // Relatório
    const pForce = fighterPower(pTeam[0], cTeam[0]);
    const cForce = fighterPower(cTeam[0], pTeam[0]);
    const report = {
        arena: i18n.t(`arena-${state.currentArena.id}`),
        p: { base: pForce.base, final: pForce.power, arena: pForce.arenaOn, color: pForce.colorOn },
        c: { base: cForce.base, final: cForce.power, arena: cForce.arenaOn, color: cForce.colorOn }
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

function updateTotalHP(pHPArray, cHPArray, pMaxArray = null, cMaxArray = null) {
    const pTotal = pHPArray.reduce((a, b) => a + b, 0);
    const cTotal = cHPArray.reduce((a, b) => a + b, 0);
    const pMax = pMaxArray?.length ? pMaxArray.reduce((a, b) => a + b, 0) : 300;
    const cMax = cMaxArray?.length ? cMaxArray.reduce((a, b) => a + b, 0) : 300;
    const pBarPct = pMax > 0 ? Math.min(100, (pTotal / pMax) * 100) : 0;
    const cBarPct = cMax > 0 ? Math.min(100, (cTotal / cMax) * 100) : 0;

    updateHealth('p-hp-bar', 100 - pBarPct);
    updateHealth('c-hp-bar', 100 - cBarPct);
    
    const pTotalText = document.getElementById('p-hp-total-text');
    const cTotalText = document.getElementById('c-hp-total-text');
    if (pTotalText) pTotalText.innerText = `${Math.round(pTotal)}/${Math.round(pMax)} HP`;
    if (cTotalText) cTotalText.innerText = `${Math.round(cTotal)}/${Math.round(cMax)} HP`;
}

async function saveMatchResult(win, pEl, pCol) {
    const resString = win === true ? 'win' : (win === false ? 'loss' : 'draw');
    const xpGained = win === true ? 50 : (win === null ? 20 : 10);
    const activeRoosters = TeamService.getTeamRoosters();
    const levelUps = [];

    const grantXp = (rooster) => {
        if (rooster && state.constructor.addXP(rooster, xpGained)) levelUps.push(rooster);
    };
    if (state.gameMode === '3v3') activeRoosters.forEach(grantXp);
    else grantXp(activeRoosters[0] || state.gameData.inventory.roosters.find(r => r.element === pEl && r.color === pCol));

    let financial = win === true ? 0 : (win === false ? -state.currentBet : 0);
    if (state.betLocked && state.gameData.user?.id) {
        const { LocalBackend } = await import('./backend.js');
        const settled = LocalBackend.settleMatch({
            userId: state.gameData.user.id,
            result: resString,
            xpGained
        });
        state.betLocked = false;
        state.gameData.pendingBet = null;
        state.gameData.balance = settled.balance;
        state.gameData.wins = settled.wins;
        state.gameData.losses = settled.losses;
        state.gameData.economy = settled.economy;
        financial = settled.financial;
    }

    state.gameData.matches.unshift({
        result: resString,
        element: pEl,
        color: pCol,
        financial,
        bet: state.currentBet,
        date: new Date().toLocaleTimeString(state.gameData.settings.lang, { hour: '2-digit', minute: '2-digit' })
    });
    if (state.gameData.matches.length > 20) state.gameData.matches.pop();

    MatchLogService.addLog({
        result: resString,
        bet: state.currentBet,
        financial,
        playerRoosters: activeRoosters.map(r => ({ element: r.element, color: r.color, level: r.level })),
        opponentRoosters: state.gameMode === '3v3' ? state.cpuTeam.map(r => ({ element: r.element, color: r.color, level: r.level })) : [{ element: state.cpu.element, color: state.cpu.color, level: activeRoosters[0]?.level || 1 }]
    });

    MissionService.updateProgress(MISSION_TYPES.MATCHES, 1);
    if (win === true) MissionService.updateProgress(MISSION_TYPES.WINS, 1);

    if (state.gameMode === 'tournament') {
        const result = TournamentService.advanceRound(win === true ? 'player' : 'cpu');
        if (result.finished) {
            if (result.won) {
                const { LocalBackend } = await import('./backend.js');
                const jackpot = LocalBackend.claimJackpot(state.gameData.user.id);
                state.gameData.balance += 0;
                const profile = LocalBackend.getProfile(state.gameData.user.id);
                if (profile) state.gameData.balance = profile.balance;
                setTimeout(() => alert(i18n.t('tour-win-msg', { jackpot })), 1000);
            } else {
                setTimeout(() => alert(i18n.t('tour-loss-msg')), 1000);
            }
        }
    }

    state.save();
    updateBalanceUI();
    updateRankUI();

    if (levelUps.length > 0) {
        setTimeout(() => alert(i18n.t('sys-level-up')), 1000);
    }
}

function fighterPower(rooster, enemy) {
    const arenaOn = state.currentArena && rooster.element === state.currentArena.bonusElement;
    const colorOn = enemy && COLOR_COUNTERS[rooster.color] === enemy.color;
    const arena = arenaOn ? 1.25 : 1;
    const color = colorOn ? 1.30 : 1;
    const base = rooster.atk || ELEMENT_BASE_STRENGTH[rooster.element] || 100;
    return {
        base,
        arenaOn,
        colorOn,
        power: Math.round(base * arena * color),
        element: rooster.element,
        color: rooster.color
    };
}

function renderMatchup(player, cpu) {
    const bar = document.getElementById('matchup-bar');
    if (!bar || !player || !cpu) return;
    const p = fighterPower(player, cpu);
    const c = fighterPower(cpu, player);
    const chip = (on, label) => on
        ? `<span class="text-green-400 font-black">${label}</span>`
        : `<span class="text-slate-500">${label}</span>`;
    bar.innerHTML = `
        <div class="bg-black/50 border border-blue-500/30 rounded-xl px-2 py-2">
            <div class="text-blue-300 font-black uppercase">Você · ${i18n.t('el-' + p.element)} · ${i18n.t('col-' + p.color + '-name')}</div>
            <div class="font-mono text-white text-sm">${p.power} <span class="text-slate-500">força</span></div>
            <div>${chip(p.arenaOn, 'Arena +25%')} ${chip(p.colorOn, 'Cor +30%')}</div>
        </div>
        <div class="bg-black/50 border border-red-500/30 rounded-xl px-2 py-2 text-right">
            <div class="text-red-300 font-black uppercase">CPU · ${i18n.t('el-' + c.element)} · ${i18n.t('col-' + c.color + '-name')}</div>
            <div class="font-mono text-white text-sm">${c.power} <span class="text-slate-500">força</span></div>
            <div>${chip(c.arenaOn, 'Arena +25%')} ${chip(c.colorOn, 'Cor +30%')}</div>
        </div>`;
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

const HIT_RATIO = 0.18;
const HIT_CAP = 0.35;
/** Rodadas-alvo no 1v1 espelho (mesmo elemento/cor) — ~45–60s com animações atuais. */
const DUEL_TIE_ROUNDS_TARGET = 8;

function tieDuelHitDamage(maxHp, skillMultiplier = 1) {
    const base = Math.round(maxHp / DUEL_TIE_ROUNDS_TARGET);
    const scaled = Math.round(base * (skillMultiplier || 1));
    const cap = Math.round(maxHp * HIT_CAP);
    return Math.min(Math.max(1, scaled), cap);
}

function calculateAdvancedDamage(atk, multiplier, level, arena, element, color, targetStatus) {
    const arenaBonus = arena && arena.bonusElement === element ? 1.25 : 1;
    const colorBonus = COLOR_COUNTERS[color] === targetStatus.color ? 1.30 : 1;
    const force = (atk || ELEMENT_BASE_STRENGTH[element] || 100) * arenaBonus * colorBonus;
    const raw = force * (multiplier || 1) * HIT_RATIO;
    return {
        value: Math.max(1, Math.round(raw)),
        type: 'normal',
        force: Math.round(force)
    };
}

function armBurn(status, skill) {
    if (skill.burnPct) {
        status.burnQueue = skill.burnPct.map(pct => ({ pct }));
        return;
    }
    if (Math.random() < (skill.chance ?? 1)) {
        status.burnQueue = Array.from({ length: 3 }, () => ({ flat: 15 }));
    }
}

function takeBurn(status, maxHp) {
    if (!status.burnQueue?.length) return 0;
    const step = status.burnQueue.shift();
    if (step.pct) return Math.max(1, Math.round(maxHp * step.pct));
    return step.flat || 0;
}

function applyProportionalHit(raw, shield, def, maxHp) {
    const scaled = Math.max(1, Math.round(raw * (shield || 1) * (1 / (def || 1))));
    const cap = Math.max(1, Math.round((maxHp || 100) * HIT_CAP));
    return Math.min(scaled, cap);
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
        const bet = state.currentBet;
        const prize = Math.floor(bet * PVP.WIN_PAYOUT);
        const profit = prize - bet;
        const rake = Math.floor(bet * PVP.RAKE);
        if (win) {
            finDiv.innerText = `+${profit} RC`;
            finDiv.className = "text-3xl font-mono font-bold text-green-400 mt-1";
            if (finDet) {
                finDet.innerText = `${i18n.t('res-bet')}: ${bet} | ${i18n.t('res-prize')}: ${prize} (${i18n.t('res-profit')} +${profit}) | Rake ${rake} (${Math.round(PVP.RAKE * 100)}%)`;
            }
        } else if (win === false) {
            finDiv.innerText = `-${bet} RC`;
            finDiv.className = "text-3xl font-mono font-bold text-red-400 mt-1";
            if (finDet) finDet.innerText = `${i18n.t('res-lost')} Rake ${rake} (${Math.round(PVP.RAKE * 100)}%).`;
        } else {
            finDiv.innerText = `0 RC`;
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
    if (pBonus) pBonus.innerHTML = `<span>Arena:</span> ${report.p.arena ? '<span class="text-green-400 font-bold">+25%</span>' : dash}`;
    const pPaint = document.getElementById('res-p-paint');
    if (pPaint) pPaint.innerHTML = `<span>Cor:</span> ${report.p.color ? '<span class="text-green-400 font-bold">+30%</span>' : dash}`;
    
    renderAvatar('res-p-icon', state.player.element, state.player.color);

    const cBase = document.getElementById('res-c-base');
    if (cBase) cBase.innerText = report.c.base;
    const cFinal = document.getElementById('res-c-final');
    if (cFinal) cFinal.innerText = report.c.final;
    const cBonus = document.getElementById('res-c-bonus');
    if (cBonus) cBonus.innerHTML = `<span>Arena:</span> ${report.c.arena ? '<span class="text-red-400 font-bold">+25%</span>' : dash}`;
    const cPaint = document.getElementById('res-c-paint');
    if (cPaint) cPaint.innerHTML = `<span>Cor:</span> ${report.c.color ? '<span class="text-red-400 font-bold">+30%</span>' : dash}`;
    
    renderAvatar('res-c-icon', state.cpu.element, state.cpu.color);

    if (overlay) {
        overlay.classList.remove('hidden');
        if (card) {
            setTimeout(() => { card.classList.remove('scale-90', 'opacity-0'); card.classList.add('scale-100', 'opacity-100'); }, 50);
        }
    }
    const reason = document.getElementById('result-reason');
    if (reason) {
        const winner = win === true ? 'Você' : (win === false ? 'A CPU' : 'Ninguém');
        reason.innerText = `${winner} ficou com HP. Cada golpe tira 18% da força, no máximo 35% do HP. Escudo, defesa e poção mudam essa conta.`;
    }
    AudioEngine.playClick();
}
