import { state } from './state.js';

export const MISSION_TYPES = {
    MATCHES: 'matches',
    WINS: 'wins',
    SPEND: 'spend'
};

export class MissionService {
    static getDailyMissions() {
        // Simple fixed daily missions for now
        return [
            { id: 'm1', type: MISSION_TYPES.MATCHES, target: 5, reward: 500, xp: 100, descKey: 'miss-m1-desc' },
            { id: 'm2', type: MISSION_TYPES.WINS, target: 3, reward: 800, xp: 200, descKey: 'miss-m2-desc' },
            { id: 'm3', type: MISSION_TYPES.SPEND, target: 1000, reward: 1000, xp: 300, descKey: 'miss-m3-desc' }
        ];
    }

    static updateProgress(type, amount = 1) {
        if (!state.gameData.missions) {
            state.gameData.missions = {};
        }
        
        const today = new Date().toISOString().split('T')[0];
        if (state.gameData.missions.date !== today) {
            state.gameData.missions = {
                date: today,
                progress: {
                    [MISSION_TYPES.MATCHES]: 0,
                    [MISSION_TYPES.WINS]: 0,
                    [MISSION_TYPES.SPEND]: 0
                },
                completed: []
            };
        }

        if (state.gameData.missions.progress[type] !== undefined) {
            state.gameData.missions.progress[type] += amount;
            this.checkCompletions();
            state.save();
        }
    }

    static checkCompletions() {
        const missions = this.getDailyMissions();
        const progress = state.gameData.missions.progress;
        
        missions.forEach(mission => {
            if (!state.gameData.missions.completed.includes(mission.id)) {
                if (progress[mission.type] >= mission.target) {
                    state.gameData.missions.completed.push(mission.id);
                    state.gameData.balance += mission.reward;
                    
                    // Give XP to all active roosters
                    const activeRoosters = state.gameData.inventory.roosters.filter(r => r.in_team);
                    activeRoosters.forEach(r => state.constructor.addXP(r, mission.xp));
                    
                    console.log(`Missão concluída: ${mission.desc}! Recompensa: ${mission.reward} RC`);
                }
            }
        });
    }
}
