import { state } from './state.js';
import i18n from './i18n.js';
import { LocalBackend } from './backend.js';

export class Auth {
    static init() {
        const userId = LocalBackend.getSessionUserId();
        if (!userId) return;
        const profile = LocalBackend.getProfile(userId);
        if (!profile) {
            LocalBackend.logout();
            return;
        }
        state.hydrate(profile);
    }

    static async checkSession() {
        try {
            const userId = LocalBackend.getSessionUserId();
            if (!userId) {
                this.showLogin();
                return false;
            }
            const profile = LocalBackend.getProfile(userId);
            if (!profile) {
                LocalBackend.logout();
                this.showLogin();
                return false;
            }
            state.hydrate(profile);
            this.showMainGame();
            return true;
        } catch (err) {
            console.warn("Session check failed:", err);
            this.showLogin();
            return false;
        }
    }

    static showLogin() {
        const screens = ['screen-login', 'screen-register', 'screen-selection', 'screen-battle'];
        screens.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        const loginScreen = document.getElementById('screen-login');
        if (loginScreen) loginScreen.classList.remove('hidden');
        if (i18n && typeof i18n.updateUI === 'function') i18n.updateUI();
    }

    static showRegister() {
        document.getElementById('screen-login')?.classList.add('hidden');
        document.getElementById('screen-register')?.classList.remove('hidden');
    }

    static showMainGame() {
        ['screen-login', 'screen-register', 'screen-battle'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
        document.getElementById('screen-selection')?.classList.remove('hidden');
        i18n.updateUI();
    }

    static async register(username, email, password, lang) {
        try {
            const profile = await LocalBackend.register({ username, email, password, lang });
            state.hydrate(profile);
            i18n.setLanguage(lang);
            this.showMainGame();
            return { success: true };
        } catch (err) {
            alert(i18n.t('auth-error-reg-prefix') + err.message);
            return { success: false, error: err.message };
        }
    }

    static async login(email, password) {
        try {
            const profile = await LocalBackend.login(email, password);
            state.hydrate(profile);
            i18n.setLanguage(state.gameData.settings.lang);
            this.showMainGame();
            return { success: true };
        } catch (err) {
            const msg = err.message.includes('Invalid login credentials')
                ? i18n.t('auth-error-invalid-credentials')
                : i18n.t('auth-error-login-failed');
            alert(msg);
            return { success: false, error: err.message };
        }
    }

    static loginAsGuest() {
        const profile = LocalBackend.loginAsGuest();
        state.hydrate(profile);
        this.showMainGame();
        return { success: true };
    }

    static async startPasswordReset(email) {
        return LocalBackend.requestPasswordReset(email);
    }

    static async updatePassword(newPassword) {
        return LocalBackend.updatePassword(newPassword);
    }

    static async logout() {
        LocalBackend.logout();
        state.gameData.user = null;
        location.reload();
    }
}
