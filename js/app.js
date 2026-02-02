import { state, ELEMENTS, COLORS } from './state.js';
import { Auth } from './auth.js';
import i18n from './i18n.js';
import { EconomyService } from './economy.js';
import { ReferralService } from './referral.js';
import { MarketplaceService, AuctionEngine } from './marketplace.js';
import { MissionService } from './missions.js';
import { TournamentService } from './tournament.js';
import { BreedingService } from './breeding.js';
import { MatchLogService } from './matchLog.js';
import { TeamService } from './team.js';
import { AudioEngine } from './audio.js';
import { renderAvatar } from './renderer.js';
import { 
    updateBalanceUI, 
    updateSettingsUI, 
    updateRankUI, 
    updateLeaderboardUI,
    updateShopUI,
    updateInventoryUI,
    updateReferralUI,
    updateMissionsUI,
    updateTournamentUI,
    updateLogsUI,
    updateBreedingUI,
    updatePreview,
    initGameUI,
    toggleModal 
} from './ui.js';
import { 
    selectBet, 
    checkBalanceAndStart, 
    resetGame,
    generateChallengeLink,
    parseChallenge,
    startChallengeBattle,
    handleSkillClick,
    handleItemClick,
    toggleItemMenu,
    startTournament,
    startTournamentMatch
} from './game.js';

// Global app object for HTML event handlers
window.app = window.app || {};

Object.assign(window.app, {
    isReady: false,
    handleSkillClick,
    handleItemClick,
    toggleItemMenu,
    startTournament,
    startTournamentMatch,
    t: (key) => i18n.t(key),
    setLang: (lang) => {
        i18n.setLanguage(lang);
        state.gameData.settings.lang = lang;
        state.save();
        updateSettingsUI();
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('border-yellow-500', 'bg-white/10'));
        document.getElementById(`lang-${lang}`)?.classList.add('border-yellow-500', 'bg-white/10');
    },
    showRegister: () => Auth.showRegister(),
    showLogin: () => Auth.showLogin(),
    handleRegister: async () => {
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const lang = state.gameData.settings.lang || 'pt-BR';

        if (!username || !email || !password) {
            alert("Preencha todos os campos!");
            return;
        }

        const res = await Auth.register(username, email, password, lang);
        if (res.success) {
            const pendingRef = localStorage.getItem('pending_referral');
            if (pendingRef) {
                console.log("Aplicando indicação pendente:", pendingRef);
                const applied = await ReferralService.applyReferrer(pendingRef);
                if (applied) {
                    console.log("Indicação aplicada com sucesso!");
                    localStorage.removeItem('pending_referral');
                }
            }
            initGameUI();
        }
    },
    handleLogin: async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            alert("Preencha todos os campos!");
            return;
        }

        const res = await Auth.login(email, password);
        if (res.success) {
            initGameUI();
            checkUrlChallenge();
        }
    },
    handleGuestLogin: async () => {
        const res = await Auth.loginAsGuest();
        if (res.success) {
            initGameUI();
        }
    },
    showScreen: (screenId) => {
        const screens = ['login', 'register', 'selection', 'battle', 'inventory', 'shop', 'breeding', 'referral', 'missions', 'tournament', 'logs'];
        screens.forEach(s => {
            const el = document.getElementById(`screen-${s}`);
            if (el) el.classList.add('hidden');
        });
        const target = document.getElementById(`screen-${screenId}`);
        if (target) target.classList.remove('hidden');

        // Toggle bottom nav visibility
        const bottomNav = document.getElementById('bottom-nav');
        if (bottomNav) {
            if (screenId === 'battle' || screenId === 'login' || screenId === 'register') {
                bottomNav.classList.add('hidden');
            } else {
                bottomNav.classList.remove('hidden');
            }
        }

        document.querySelectorAll('#bottom-nav button').forEach(b => b.classList.remove('nav-item-active'));
        const navBtn = document.getElementById(`nav-${screenId}`);
        if (navBtn) navBtn.classList.add('nav-item-active');

        if (screenId === 'shop') updateShopUI();
        if (screenId === 'inventory') updateInventoryUI();
        if (screenId === 'referral') updateReferralUI();
        if (screenId === 'missions') updateMissionsUI();
        if (screenId === 'tournament') updateTournamentUI();
        if (screenId === 'logs') updateLogsUI();
        if (screenId === 'breeding') updateBreedingUI();
        if (screenId === 'selection') updatePreview();

        const menu = document.getElementById('more-menu');
        if (menu) {
            menu.classList.remove('modal-visible');
            menu.classList.add('modal-hidden');
            setTimeout(() => menu.classList.add('hidden'), 300);
        }
    },
    toggleMenu: () => toggleModal('more-menu'),
    selectElement: (el) => {
        state.player.element = el;
        AudioEngine.playClick();
        document.querySelectorAll('.el-btn').forEach(b => b.classList.remove('btn-glass-selected'));
        document.getElementById(`el-${el}`)?.classList.add('btn-glass-selected');
        updatePreview();
    },
    selectColor: (col) => {
        state.player.color = col;
        AudioEngine.playClick();
        document.querySelectorAll('.col-btn').forEach(b => b.classList.remove('ring-2', 'ring-white', 'scale-110'));
        document.getElementById(`col-${col}`)?.classList.add('ring-2', 'ring-white', 'scale-110');
        updatePreview();
    },
    setMode: (mode) => {
        state.gameMode = mode;
        AudioEngine.playClick();
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('bg-yellow-500', 'text-black'));
        document.getElementById(`mode-${mode}`)?.classList.add('bg-yellow-500', 'text-black');
    },
    buyRooster: async (el, col, price) => {
        if (state.gameData.balance < price) {
            alert(i18n.t('shop-error-balance'));
            return;
        }
        const res = await MarketplaceService.buyRooster(el, col, price);
        if (res.success) {
            updateBalanceUI();
            updateShopUI();
            alert(i18n.t('shop-success-rooster'));
        }
    },
    buyItem: async (id, price) => {
        if (state.gameData.balance < price) {
            alert(i18n.t('shop-error-balance'));
            return;
        }
        const res = await MarketplaceService.buyItem(id, price);
        if (res.success) {
            updateBalanceUI();
            updateShopUI();
            updateInventoryUI();
            alert(i18n.t('shop-success-item'));
        }
    },
    sellRooster: async (id) => {
        const res = await MarketplaceService.sellRooster(id);
        if (res.success) {
            updateBalanceUI();
            updateInventoryUI();
        }
    },
    toggleTeamMember: (id) => {
        TeamService.toggleMember(id);
        updateInventoryUI();
    },
    bid: async (auctionId, currentPrice) => {
        const bidAmount = Math.floor(currentPrice * 1.1);
        if (state.gameData.balance < bidAmount) {
            alert(i18n.t('shop-error-balance'));
            return;
        }
        const res = await AuctionEngine.placeBid(auctionId, bidAmount);
        if (res.success) {
            updateBalanceUI();
            updateShopUI();
            alert(i18n.t('shop-success-bid'));
        }
    },
    selectBreedingParent: (id) => {
        const res = BreedingService.selectParent(id);
        if (res) {
            window.app.selectedBreedingParents = res;
            updateInventoryUI();
            updateBreedingUI();
        }
    },
    startBreeding: async () => {
        const [p1, p2] = window.app.selectedBreedingParents;
        const cost = BreedingService.getBreedingCost(p1, p2);
        if (state.gameData.balance < cost) {
            alert(i18n.t('shop-error-balance'));
            return;
        }
        
        const res = await BreedingService.breed(p1, p2, cost);
        if (res.success) {
            updateBalanceUI();
            window.app.selectedBreedingParents = [null, null];
            
            const overlay = document.getElementById('birth-overlay');
            const container = document.getElementById('new-rooster-container');
            container.innerHTML = '';
            const div = document.createElement('div');
            div.id = 'new-rooster-avatar';
            div.className = 'w-64 h-64 anim-birth';
            container.appendChild(div);
            
            renderAvatar('new-rooster-avatar', res.rooster.element, res.rooster.color, res.rooster.dna?.skin || 'none');
            
            overlay.classList.remove('hidden');
            AudioEngine.playTone(600, 'sine', 0.5, 0.2);
            
            setTimeout(() => {
                overlay.classList.add('hidden');
                window.app.showScreen('inventory');
            }, 4000);
        }
    },
    copyChallengeLink: () => {
        const link = generateChallengeLink();
        navigator.clipboard.writeText(link).then(() => {
            const btn = document.getElementById('btn-copy-text');
            if (btn) btn.innerText = i18n.t('mod-share-copied');
            setTimeout(() => {
                if (btn) btn.innerText = i18n.t('mod-share-copy');
            }, 2000);
        });
    },
    showFusionSuccess: (rooster) => {
        const overlay = document.getElementById('fusion-success-overlay');
        const content = document.getElementById('fusion-result-content');
        const flash = document.getElementById('fusion-flash-effect');
        const badge = document.getElementById('fusion-rarity-badge');
        
        if (!overlay || !content) return;

        document.getElementById('fusion-dna-code').innerText = rooster.dna.code;
        document.getElementById('fusion-stat-atk').innerText = rooster.atk;
        document.getElementById('fusion-stat-hp').innerText = rooster.hp_max;
        
        badge.innerText = rooster.dna.rarity;
        const rarityClasses = {
            'legendary': 'bg-gradient-to-r from-yellow-400 to-orange-600 text-black animate-pulse ring-4 ring-yellow-500/50',
            'rare': 'bg-gradient-to-r from-purple-500 to-pink-600 text-white ring-2 ring-purple-400/50',
            'common': 'bg-slate-700 text-slate-300'
        };
        badge.className = `absolute -top-4 -right-4 px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl z-20 rotate-12 ${rarityClasses[rooster.dna.rarity] || rarityClasses.common}`;

        renderAvatar('fusion-new-rooster-avatar', rooster.element, rooster.color, rooster.dna.skin || 'none');
        
        overlay.classList.remove('hidden');
        AudioEngine.playTone(220, 'sine', 0.8, 0.1); 
        
        setTimeout(() => {
            if (flash) flash.classList.add('anim-flash');
            AudioEngine.playTone(440, 'triangle', 0.4, 0.3); 
            
            content.classList.remove('scale-90', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
            
            const avatarContainer = document.getElementById('fusion-new-rooster-avatar');
            if (avatarContainer) {
                avatarContainer.classList.add('anim-birth');
                setTimeout(() => {
                    avatarContainer.classList.remove('anim-birth');
                    avatarContainer.classList.add('anim-float');
                    AudioEngine.playTone(660, 'sine', 0.5, 0.2);
                }, 1200);
            }
        }, 100);
    },
    closeFusionSuccess: () => {
        const overlay = document.getElementById('fusion-success-overlay');
        const content = document.getElementById('fusion-result-content');
        
        if (!overlay || !content) return;
        content.classList.add('scale-90', 'opacity-0');
        setTimeout(() => {
            overlay.classList.add('hidden');
            window.app.showScreen('inventory');
            updateInventoryUI();
        }, 500);
    },
    toggleChallengeModal: () => {
        toggleModal('challenge-modal');
    },
    acceptChallenge: () => {
        const urlParams = new URLSearchParams(window.location.search);
        const challenge = urlParams.get('challenge');
        const challengerData = parseChallenge(challenge);
        
        if (challengerData) {
            window.app.toggleChallengeModal();
            startChallengeBattle(challengerData);
        }
    },
    selectBet: (amount) => selectBet(amount),
    checkBalanceAndStart: () => checkBalanceAndStart(),
    resetGame: () => resetGame(),
    handleRinhaClick: () => {
        if (state.inBattle) {
            window.app.showScreen('battle');
        } else {
            window.app.showScreen('selection');
        }
    }
});

async function boot() {
    console.log("RINHA EVOLUTION: Booting...");
    
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
        console.log("Código de indicação detectado:", refCode);
        localStorage.setItem('pending_referral', refCode);
    }

    const currentLang = state.gameData.settings.lang || 'pt-BR';
    window.app.setLang(currentLang);

    Auth.init();
    
    const isLogged = await Auth.checkSession();
    
    if (isLogged) {
        MissionService.updateProgress('init', 0); 
        initGameUI();
        checkUrlChallenge();
    } else {
        Auth.showLogin();
    }
    
    window.app.isReady = true;
    console.log("RINHA EVOLUTION: Ready!");
}

function checkUrlChallenge() {
    const urlParams = new URLSearchParams(window.location.search);
    const challenge = urlParams.get('challenge');
    if (challenge) {
        const challengerData = parseChallenge(challenge);
        if (challengerData) {
            renderAvatar('challenge-avatar', challengerData.e, challengerData.c, challengerData.s || 'none');
            const nameEl = document.getElementById('challenger-name');
            const elNameEl = document.getElementById('challenge-el-name');
            const statsEl = document.getElementById('challenge-stats');
            if (nameEl) nameEl.innerText = challengerData.n;
            if (elNameEl) elNameEl.innerText = i18n.t(`el-${challengerData.e}`);
            if (statsEl) statsEl.innerText = `FORÇA: ${challengerData.b}`;
            
            setTimeout(() => {
                window.app.toggleChallengeModal();
            }, 1000);
        }
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
