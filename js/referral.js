import { state } from './state.js';
import { LocalBackend } from './backend.js';

export class ReferralService {
    static generateCode() {
        if (!state.gameData.user) return null;
        if (!state.gameData.referral.code) {
            const prefix = state.gameData.user.name.substring(0, 3).toUpperCase();
            const random = Math.random().toString(36).substring(2, 7).toUpperCase();
            state.gameData.referral.code = `${prefix}-${random}`;
            state.save();
        }
        return state.gameData.referral.code;
    }

    static getReferralLink() {
        const code = this.generateCode();
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('ref', code);
        return url.toString();
    }

    static async applyReferrer(code) {
        if (!state.gameData.user?.id) return false;
        const ok = LocalBackend.applyReferrer(state.gameData.user.id, code);
        if (!ok) return false;
        state.gameData.referral.referrer = code;
        state.save();
        return true;
    }

    static async getStats() {
        return state.gameData.referral;
    }
}
