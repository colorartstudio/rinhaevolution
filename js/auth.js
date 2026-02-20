import { state } from './state.js';
import i18n from './i18n.js';
import { supabase } from './supabase.js';

export class Auth {
    static init() {
        console.log("Inicializando listener de autenticação...");
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`Evento de Autenticação: ${event}`);
            if (event === 'PASSWORD_RECOVERY') {
                if (window.app && typeof window.app.showResetPasswordModal === 'function') {
                    window.app.showResetPasswordModal();
                }
                return;
            }
            if (event === 'SIGNED_IN' && session) {
                console.log("Usuário autenticado via OAuth/Session. Atualizando estado...");
                state.gameData.user = { 
                    id: session.user.id, 
                    name: session.user.user_metadata?.full_name || session.user.email.split('@')[0], 
                    email: session.user.email 
                };
                
                await state.syncAll();
                this.showMainGame();
            } else if (event === 'SIGNED_OUT') {
                console.log("Usuário saiu. Limpando estado...");
                state.gameData.user = null;
                this.showLogin();
            }
        });
    }

    static async checkSession() {
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

    static async register(username, email, password, lang) {
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
                
                // Engenharia Avançada: Se for erro 500, pode ser a trigger de perfil.
                // Mas a conta de AUTH pode ter sido criada. Tentamos avisar o usuário.
                if (error.status === 500 || error.message.includes("Database error")) {
                    throw new Error(i18n.t('auth-error-server-500'));
                }
                throw error;
            }

            if (!data.user) throw new Error(i18n.t('auth-error-no-user'));

            console.log("Usuário criado com sucesso no Supabase. ID:", data.user.id);
            state.gameData.user = { 
                id: data.user.id, 
                name: username, 
                email: email 
            };
            state.gameData.settings.lang = lang;
            
            // Aguarda um pequeno delay para a trigger do Supabase criar o profile
            console.log("Aguardando criação do profile via trigger...");
            await new Promise(r => setTimeout(r, 2000)); // Aumentado para 2s para segurança
            
            try {
                await state.syncAll();
            } catch (syncErr) {
                console.warn("Aviso: Falha na sincronização inicial do profile, mas o usuário foi registrado.", syncErr);
            }

            i18n.setLanguage(lang);
            state.save();
            this.showMainGame();
            return { success: true };
        } catch (err) {
            console.error("Erro capturado na função Auth.register:", err);
            let userMsg = err.message;
            if (err.message.includes("Database error")) {
                userMsg = i18n.t('auth-error-db');
            }
            alert(i18n.t('auth-error-reg-prefix') + userMsg);
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
                
                // Engenharia Avançada: Tratamento específico para e-mail não confirmado
                if (error.message.includes("Email not confirmed")) {
                    alert(i18n.t('auth-error-email-unconfirmed'));
                    return { success: false, error: "E-mail não confirmado." };
                }

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
            let msg = i18n.t('auth-error-login-failed');
            if (err.message.includes("Invalid login credentials")) {
                msg = i18n.t('auth-error-invalid-credentials');
            }
            alert(msg);
            return { success: false, error: err.message };
        }
    }

    static async startPasswordReset(email, redirectTo) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Erro resetPasswordForEmail:", err);
            return false;
        }
    }

    static async updatePassword(newPassword) {
        try {
            const { data, error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Erro updatePassword:", err);
            return false;
        }
    }

    static async logout() {
        if (state.gameData.user) {
            await supabase.auth.signOut();
        }
        state.gameData.user = null;
        state.save();
        location.reload();
    }
}
