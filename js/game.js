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

export function checkBalanceAndStart() {
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
    state.gameData.balance -= state.currentBet;
    showFloatingText(document.getElementById('btn-start'), `-${state.currentBet}`, 'center', false);
    state.save();
    updateBalanceUI();
    
    // Random CPU
    const elKeys = Object.keys(ELEMENTS);
    const colKeys = Object.keys(COLORS);
    
    if (state.gameMode === '3v3') {
        state.cpuTeam = [
            state.constructor.createRooster(elKeys[Math.floor(Math.random()*4)], colKeys[Math.floor(Math.random()*4)], 1),
            state.constructor.createRooster(elKeys[Math.floor(Math.random()*4)], colKeys[Math.floor(Math.random()*4)], 1),
            state.constructor.createRooster(elKeys[Math.floor(Math.random()*4)], colKeys[Math.floor(Math.random()*4)], 1)
        ];
    } else {
        state.cpu.element = elKeys[Math.floor(Math.random() * elKeys.length)];
        state.cpu.color = colKeys[Math.floor(Math.random() * colKeys.length)];
    }

    startRouletteSequence();
}

export function startRouletteSequence() {
    state.currentArena = ARENAS[Math.floor(Math.random() * ARENAS.length)];

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
        state.cpuTeam.forEach((gal, i) => {
            const div = document.createElement('div');
            div.id = `cpu-avatar-${i}`;
            div.className = "w-24 h-24 scale-x-[-1] transition-transform duration-300";
            cGrid.appendChild(div);
            renderAvatar(`cpu-avatar-${i}`, gal.element, gal.color);
        });
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

async function battleSequence3v3() {
    const pTeam = TeamService.getTeamRoosters();
    const cTeam = state.cpuTeam;
    const rounds = 9; 
    
    let pHP = 300; 
    let cHP = 300;

    // Reset energy for all team members
    pTeam.forEach(r => r.energy = r.energy_max);
    cTeam.forEach(r => r.energy = r.energy_max);
    
    for (let i = 0; i < rounds; i++) {
        const pIdx = i % pTeam.length;
        const cIdx = i % cTeam.length;
        
        const pGal = pTeam[pIdx];
        const cGal = cTeam[cIdx];
        
        const pAv = document.getElementById(`player-avatar-${pIdx}`);
        const cAv = document.getElementById(`cpu-avatar-${cIdx}`);

        // Energy Regen
        pGal.energy = Math.min(pGal.energy_max, pGal.energy + 20);
        cGal.energy = Math.min(cGal.energy_max, cGal.energy + 20);
        updateEnergy('p-en-bar', pGal.energy, pGal.energy_max);
        
        // --- PLAYER TURN ---
        const action = await showPlayerSkills(pGal);
        if (action.type === 'skill') {
            const skill = SKILLS[pGal.element].find(s => s.id === action.id);
            pGal.energy -= skill.cost;
            updateEnergy('p-en-bar', pGal.energy, pGal.energy_max);

            const dmgC = SkillService.calculateDamage(pGal.atk, skill.multiplier, pGal.level);

            if (skill.effect === 'heal') {
                const heal = Math.round(300 * (skill.value / 100));
                pHP = Math.min(300, pHP + heal);
                updateHealth('p-hp-bar', -(heal / 300) * 100);
                showFloatingText(pAv, `+${heal}`, 'left', false);
            }

            pAv.classList.add('anim-atk-l'); AudioEngine.playAttack(); await sleep(100);
            cAv.classList.add('anim-hit'); AudioEngine.playHit();
            showFloatingText(cAv, `-${dmgC}`, 'right', false); 
            updateHealth('c-hp-bar', (dmgC / 300) * 100);
            cHP -= dmgC;
        } else if (action.type === 'item') {
            const item = state.gameData.inventory.items.find(it => it.id === action.id);
            item.count--;
            if (item.type === 'heal') {
                const heal = 50; // Team heal in 3v3
                pHP = Math.min(300, pHP + heal);
                updateHealth('p-hp-bar', -(heal / 300) * 100);
                showFloatingText(pAv, `+${heal} 🧪`, 'left', false);
            } else if (item.type === 'energy') {
                pGal.energy = Math.min(pGal.energy_max, pGal.energy + item.value);
                updateEnergy('p-en-bar', pGal.energy, pGal.energy_max);
                showFloatingText(pAv, `+${item.value} ⚡`, 'left', false);
            }
            await sleep(1000);
        }

        await sleep(250); pAv.classList.remove('anim-atk-l'); cAv.classList.remove('anim-hit'); await sleep(200);

        if (cHP <= 0) break;

        // --- CPU TURN ---
        const cSkills = SkillService.getSkillsForRooster(cGal.element, cGal.level);
        const affordableSkills = cSkills.filter(s => s.cost <= cGal.energy);
        const cSkill = affordableSkills.length > 0 ? affordableSkills[Math.floor(Math.random() * affordableSkills.length)] : cSkills[0];
        
        cGal.energy -= cSkill.cost;
        updateEnergy('c-en-bar', cGal.energy, cGal.energy_max);

        const dmgP = SkillService.calculateDamage(cGal.atk, cSkill.multiplier, cGal.level);

        cAv.classList.add('anim-atk-r'); AudioEngine.playAttack(); await sleep(100);
        pAv.classList.add('anim-hit'); AudioEngine.playHit();
        showFloatingText(pAv, `-${dmgP}`, 'left', false); 
        updateHealth('p-hp-bar', (dmgP / 300) * 100);
        pHP -= dmgP;
        await sleep(250); cAv.classList.remove('anim-atk-r'); pAv.classList.remove('anim-hit'); await sleep(400);

        if (pHP <= 0) break;
    }

    const playerWon = pHP > cHP;
    saveMatchResult(playerWon, pTeam[0].element, pTeam[0].color);
    showFinalResult3v3(playerWon);
}

function showFinalResult3v3(playerWon) {
    const pGrid = document.getElementById('player-avatars-grid');
    const cGrid = document.getElementById('cpu-avatars-grid');
    
    if (playerWon) {
        pGrid.classList.add('anim-winner-l');
        cGrid.classList.add('opacity-50', 'grayscale');
        AudioEngine.playWin();
    } else {
        cGrid.classList.add('anim-winner-r');
        pGrid.classList.add('opacity-50', 'grayscale');
        AudioEngine.playLoss();
    }
    
    const report = { arena: i18n.t(`arena-${state.currentArena.id}`), p: { final: 100 }, c: { final: 80 } };
    showDetailedResult(playerWon, report);
}

async function showPlayerSkills(rooster) {
    const panel = document.getElementById('skill-panel');
    const container = document.getElementById('skill-buttons');
    const skills = SkillService.getSkillsForRooster(rooster.element, rooster.level);
    
    container.innerHTML = '';
    skills.forEach(skill => {
        const canAfford = rooster.energy >= skill.cost;
        const btn = document.createElement('button');
        if (canAfford) {
            btn.onclick = () => handleSkillClick(skill.id);
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
    
    return new Promise(resolve => {
        playerActionResolve = resolve;
    });
}

async function battleSequence() {
    if (state.gameMode === '3v3') {
        await battleSequence3v3();
        return;
    }

    const pRooster = TeamService.getTeamRoosters()[0] || state.constructor.createRooster(state.player.element, state.player.color);
    const cRooster = state.constructor.createRooster(state.cpu.element, state.cpu.color, pRooster.level);
    
    // Initial UI Setup
    pRooster.energy = pRooster.energy_max;
    cRooster.energy = cRooster.energy_max;
    updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max);
    updateEnergy('c-en-bar', cRooster.energy, cRooster.energy_max);

    let pHP = pRooster.hp_max;
    let cHP = cRooster.hp_max;
    
    const pAv = document.getElementById('player-avatar');
    const cAv = document.getElementById('cpu-avatar');

    let pStatus = { shield: 1, def: 1, burn: 0, stun: false };
    let cStatus = { shield: 1, def: 1, burn: 0, stun: false };

    // Turn Loop
    while (pHP > 0 && cHP > 0) {
        // Energy Regen per turn
        pRooster.energy = Math.min(pRooster.energy_max, pRooster.energy + 15);
        cRooster.energy = Math.min(cRooster.energy_max, cRooster.energy + 15);
        updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max);
        updateEnergy('c-en-bar', cRooster.energy, cRooster.energy_max);

        // --- PLAYER TURN ---
        if (!pStatus.stun) {
            const action = await showPlayerSkills(pRooster);
            
            if (action.type === 'skill') {
                const skill = SKILLS[pRooster.element].find(s => s.id === action.id);
                pRooster.energy -= skill.cost;
                updateEnergy('p-en-bar', pRooster.energy, pRooster.energy_max);

                let dmgC = SkillService.calculateDamage(pRooster.atk, skill.multiplier, pRooster.level);
                dmgC = Math.round(dmgC * cStatus.shield * (1 / cStatus.def));
                cStatus.shield = 1;

                pAv.classList.add('anim-atk-l'); AudioEngine.playAttack(); await sleep(200);
                cAv.classList.add('anim-hit'); AudioEngine.playHit();
                showFloatingText(cAv, `-${dmgC}`, 'right', false); 
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
                await sleep(1000);
            }

            await sleep(300); pAv.classList.remove('anim-atk-l'); cAv.classList.remove('anim-hit'); await sleep(500);
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
            // CPU Filter skills it can afford
            const affordableSkills = cSkills.filter(s => s.cost <= cRooster.energy);
            const cSkill = affordableSkills.length > 0 ? affordableSkills[Math.floor(Math.random() * affordableSkills.length)] : cSkills[0];
            
            cRooster.energy -= cSkill.cost;
            updateEnergy('c-en-bar', cRooster.energy, cRooster.energy_max);

            let dmgP = SkillService.calculateDamage(cRooster.atk, cSkill.multiplier, cRooster.level);
            dmgP = Math.round(dmgP * pStatus.shield * (1 / pStatus.def));
            pStatus.shield = 1;

            cAv.classList.add('anim-atk-r'); AudioEngine.playAttack(); await sleep(200);
            pAv.classList.add('anim-hit'); AudioEngine.playHit();
            showFloatingText(pAv, `-${dmgP}`, 'left', false); 
            updateHealth('p-hp-bar', (dmgP / pRooster.hp_max) * 100);
            pHP -= dmgP;

            if (cSkill.effect === 'burn' && Math.random() < cSkill.chance) pStatus.burn = 3;
            if (cSkill.effect === 'stun' && Math.random() < cSkill.chance) pStatus.stun = true;
            if (cSkill.effect === 'shield') cStatus.shield = cSkill.value;
            if (cSkill.effect === 'def') cStatus.def = cSkill.value;

            await sleep(300); cAv.classList.remove('anim-atk-r'); pAv.classList.remove('anim-hit'); await sleep(500);
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
    }

    const playerWon = pHP > 0;
    
    if (playerWon) {
        pAv.classList.add('anim-winner-l'); cAv.classList.add('anim-ko-r'); showDeadEyes(cAv); AudioEngine.playWin();
    } else {
        cAv.classList.add('anim-winner-r'); pAv.classList.add('anim-ko-l'); showDeadEyes(pAv); AudioEngine.playLoss();
    }

    saveMatchResult(playerWon, pRooster.element, pRooster.color);
    await sleep(2000);
    
    const report = { arena: i18n.t(`arena-${state.currentArena.id}`), p: { base: pRooster.atk, final: pHP }, c: { base: cRooster.atk, final: cHP } };
    showDetailedResult(playerWon, report);
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
    if (state.gameData.user && state.gameData.user.id) {
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
    document.getElementById('player-avatar').className = "w-32 h-32 md:w-48 md:h-48 filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]";
    document.getElementById('cpu-avatar').className = "w-32 h-32 md:w-48 md:h-48 filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] transform scale-x-[-1]";
    document.getElementById('p-hp-bar').style.width = '100%';
    document.getElementById('c-hp-bar').style.width = '100%';
    
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
    document.getElementById('res-p-arena').innerHTML = `<span>${i18n.t('btl-bonus')}:</span> ${report.p.arena ? '<span class="text-green-400 font-bold">+25%</span>' : dash}`;
    document.getElementById('res-p-color').innerHTML = `<span>${i18n.t('sel-paint')}:</span> ${report.p.color ? '<span class="text-green-400 font-bold">+30%</span>' : dash}`;
    
    renderAvatar('res-p-icon', state.player.element, state.player.color);

    document.getElementById('res-c-base').innerText = report.c.base;
    document.getElementById('res-c-final').innerText = report.c.final;
    document.getElementById('res-c-arena').innerHTML = `<span>${i18n.t('btl-bonus')}:</span> ${report.c.arena ? '<span class="text-green-400 font-bold">+25%</span>' : dash}`;
    document.getElementById('res-c-color').innerHTML = `<span>${i18n.t('sel-paint')}:</span> ${report.c.color ? '<span class="text-green-400 font-bold">+30%</span>' : dash}`;
    
    renderAvatar('res-c-icon', state.cpu.element, state.cpu.color);

    overlay.classList.remove('hidden');
    setTimeout(() => { card.classList.remove('scale-90', 'opacity-0'); card.classList.add('scale-100', 'opacity-100'); }, 50);
    AudioEngine.playClick();
}
