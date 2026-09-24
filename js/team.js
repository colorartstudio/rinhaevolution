import { state } from './state.js';

export class TeamService {
    static async addToTeam(roosterId) {
        if (state.gameData.teams.active.length >= 3) return { success: false, error: 'Team full (max 3)' };
        if (state.gameData.teams.active.includes(roosterId)) return { success: false, error: 'Already in team' };
        
        state.gameData.teams.active.push(roosterId);
        state.save();
        return { success: true };
    }

    static async removeFromTeam(roosterId) {
        state.gameData.teams.active = state.gameData.teams.active.filter(id => id !== roosterId);
        state.save();
        return { success: true };
    }

    static getTeamRoosters() {
        return state.gameData.teams.active.map(id => 
            state.gameData.inventory.roosters.find(r => r.id === id)
        ).filter(Boolean);
    }
}
