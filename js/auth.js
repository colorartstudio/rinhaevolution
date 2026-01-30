import { state } from './state.js';
import i18n from './i18n.js';
import { supabase } from './supabase.js';

export class Auth {
    static async checkSession() {
        // Se for convidado, pula verificação do Supabase
        if (state.gameData.user && state.gameData.user.isGuest) {
            this.showMainGame();
            return true;
        }

        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error || !session) {
                // Se não houver sessão, garante que estamos na tela de login
                this.showLogin();
                return false;
            }

            // Atualiza dados do usuário no estado global
            state.gameData.user = { 
                id: session.user.id, 
                name: session.user.user_metadata?.full_name || session.user.email.split('@')[0], 
                email: session.user.email 
            };

            // Sincroniza dados com o servidor
            await state.syncAll();
            
            // Vai para a tela principal
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
        
        if (i18n && typeof i18n.updateUI === 'function') {
            i18n.updateUI();
        }
    }

    static showRegister() {
        const loginScreen = document.getElementById('screen-login');
        if (loginScreen) loginScreen.classList.add('hidden');
        
        const registerScreen = document.getElementById('screen-register');
        if (registerScreen) registerScreen.classList.remove('hidden');
    }

    static showMainGame() {
        const screens = ['screen-login', 'screen-register', 'screen-battle'];
        screens.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        
        const selectionScreen = document.getElementById('screen-selection');
        if (selectionScreen) selectionScreen.classList.remove('hidden');
        
        i18n.updateUI();
    }

    static async register(email, password, username, lang) {
        console.log(`Iniciando registro para: ${email}...`);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { 
                    data: { 
                        full_name: username, 
                        lang: lang 
                    } 
                }
            });

            if (error) {
                console.error("Erro retornado pelo Supabase Auth no Registro:", error.status, error.message);
                throw error;
            }

            console.log("Usuário criado com sucesso no Supabase. ID:", data.user.id);
            state.gameData.user = { 
                id: data.user.id, 
                name: username, 
                email: email 
            };
            state.gameData.settings.lang = lang;
            
            // Aguarda um pequeno delay para a trigger do Supabase criar o profile
            console.log("Aguardando criação do profile via trigger...");
            await new Promise(r => setTimeout(r, 1500));
            await state.syncAll();

            i18n.setLanguage(lang);
            state.save();
            this.showMainGame();
            return { success: true };
        } catch (err) {
            console.error("Erro capturado na função Auth.register:", err);
            return { success: false, error: err.message };
        }
    }

    static async login(email, password) {
        console.log(`Tentando login para: ${email}...`);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error("Erro retornado pelo Supabase Auth:", error.status, error.message);
                throw error;
            }

            console.log("Login realizado com sucesso no Supabase. ID:", data.user.id);
            state.gameData.user = { 
                id: data.user.id, 
                name: data.user.user_metadata?.full_name || data.user.email.split('@')[0], 
                email: data.user.email 
            };

            await state.syncAll();
            
            i18n.setLanguage(state.gameData.settings.lang);
            
            state.save();
            this.showMainGame();
            return { success: true };
        } catch (err) {
            console.error("Erro capturado na função Auth.login:", err);
            return { success: false, error: err.message };
        }
    }

    static async loginWithGoogle() {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + window.location.pathname
                }
            });

            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error("Google login error:", err);
            return { success: false, error: err.message };
        }
    }

    static async loginAsGuest() {
        const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        state.gameData.user = { 
            id: guestId, 
            name: 'Convidado ' + Math.floor(Math.random() * 1000), 
            email: 'guest@local.dev',
            isGuest: true
        };
        
        // Reset basic data for guest to ensure clean slate or keep local progress
        if (!state.gameData.balance) state.gameData.balance = 1000;
        
        i18n.setLanguage(state.gameData.settings.lang || 'pt-BR');
        state.save();
        this.showMainGame();
        return { success: true };
    }

    static async logout() {
        if (state.gameData.user && !state.gameData.user.isGuest) {
            await supabase.auth.signOut();
        }
        state.gameData.user = null;
        state.save();
        location.reload();
    }
}

