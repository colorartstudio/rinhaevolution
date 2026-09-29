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

    /** Troca o lugar do galo com o vizinho. direction -1 adianta, +1 atrasa. */
    static moveInTeam(roosterId, direction) {
        const team = state.gameData.teams.active;
        const index = team.indexOf(roosterId);
        const step = direction < 0 ? -1 : 1;
        const next = index + step;
        if (index < 0 || next < 0 || next >= team.length) return { success: false };
        const ordered = team.slice();
        const [moved] = ordered.splice(index, 1);
        ordered.splice(next, 0, moved);
        state.gameData.teams.active = ordered;
        state.save();
        return { success: true };
    }

    static getTeamRoosters() {
        return state.gameData.teams.active.map(id => 
            state.gameData.inventory.roosters.find(r => r.id === id)
        ).filter(Boolean);
    }
}
