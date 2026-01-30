import { state } from './state.js';
import i18n from './i18n.js';

export class MatchLogService {
    static addLog(matchData) {
        if (!state.gameData.battleLogs) {
            state.gameData.battleLogs = [];
        }

        const logEntry = {
            id: 'log_' + Date.now(),
            date: new Date().toISOString(),
            mode: state.gameMode,
            result: matchData.result, // 'win', 'loss', 'draw'
            bet: matchData.bet,
            financial: matchData.financial,
            playerRoosters: matchData.playerRoosters, // [{element, color, level}]
            opponentRoosters: matchData.opponentRoosters,
            events: matchData.events || [] // Turn by turn events
        };

        state.gameData.battleLogs.unshift(logEntry);
        
        // Keep only last 50 logs
        if (state.gameData.battleLogs.length > 50) {
            state.gameData.battleLogs.pop();
        }

        state.save();
    }

    static getLogs() {
        return state.gameData.battleLogs || [];
    }

    static getLogById(id) {
        return (state.gameData.battleLogs || []).find(log => log.id === id);
    }
}
