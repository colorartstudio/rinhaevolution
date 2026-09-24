import { LocalBackend } from './backend.js';

export class LeaderboardService {
    static async getTopPlayers(limit = 10) {
        return LocalBackend.leaderboard(limit);
    }
}
