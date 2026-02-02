import { state, ELEMENTS, COLORS } from './state.js';
import i18n from './i18n.js';

export class TournamentService {
    static startNew() {
        const playerRooster = state.gameData.inventory.roosters.find(r => r.in_team) || state.gameData.inventory.roosters[0];
        
        if (!playerRooster) return { success: false, error: i18n.t('tour-error-no-rooster') };
        
        const participants = [];
        // Add Player
        participants.push({
            id: 'player',
            name: state.gameData.user.name,
            element: playerRooster.element,
            color: playerRooster.color,
            level: playerRooster.level,
            isPlayer: true,
            isEliminated: false
        });

        // Add 7 CPUs
        for (let i = 0; i < 7; i++) {
            const elKeys = Object.keys(ELEMENTS);
            const colKeys = Object.keys(COLORS);
            const el = elKeys[Math.floor(Math.random() * elKeys.length)];
            const col = colKeys[Math.floor(Math.random() * colKeys.length)];
            
            const cpuNames = i18n.t('tour-cpu-names');
            participants.push({
                id: 'cpu-' + i,
                name: cpuNames[Math.floor(Math.random() * cpuNames.length)] + " " + (i+1),
                element: el,
                color: col,
                level: Math.max(1, playerRooster.level + Math.floor(Math.random() * 3) - 1),
                isPlayer: false,
                isEliminated: false
            });
        }

        // Shuffle participants
        participants.sort(() => Math.random() - 0.5);

        state.gameData.tournament = {
            active: true,
            round: 0,
            participants: participants,
            bracket: [
                [participants[0], participants[1], participants[2], participants[3], participants[4], participants[5], participants[6], participants[7]], // QF
                [null, null, null, null], // SF
                [null, null] // Final
            ]
        };
        
        state.save();
        return { success: true };
    }

    static getMatchups() {
        const round = state.gameData.tournament.round;
        const currentRoundParticipants = state.gameData.tournament.bracket[round];
        const matchups = [];
        
        for (let i = 0; i < currentRoundParticipants.length; i += 2) {
            matchups.push({
                p1: currentRoundParticipants[i],
                p2: currentRoundParticipants[i+1]
            });
        }
        return matchups;
    }

    static advanceRound(winnerId) {
        const t = state.gameData.tournament;
        const round = t.round;
        const currentBracket = t.bracket[round];
        const nextBracket = t.bracket[round + 1];

        // 1. Mark losers as eliminated and find winners for CPU vs CPU
        for (let i = 0; i < currentBracket.length; i += 2) {
            const p1 = currentBracket[i];
            const p2 = currentBracket[i+1];
            let winner;

            if (p1.id === 'player' || p2.id === 'player') {
                // One of them is player, winner is passed as argument
                winner = (p1.id === winnerId) ? p1 : p2;
                const loser = (p1.id === winnerId) ? p2 : p1;
                loser.isEliminated = true;
                
                if (winnerId !== 'player' && (p1.isPlayer || p2.isPlayer)) {
                    // Player lost, tournament over
                    t.active = false;
                }
            } else {
                // CPU vs CPU - Simulate winner based on level
                const p1WinProb = 0.5 + (p1.level - p2.level) * 0.1;
                winner = Math.random() < p1WinProb ? p1 : p2;
                const loser = (winner.id === p1.id) ? p2 : p1;
                loser.isEliminated = true;
            }

            if (nextBracket) {
                nextBracket[i/2] = winner;
            }
        }

        if (t.active) {
            t.round++;
            if (t.round > 2) {
                // Tournament Won!
                t.active = false;
                state.gameMode = '1v1'; // Reset mode
                return { finished: true, won: true };
            }
        } else {
            state.gameMode = '1v1'; // Reset mode
            return { finished: true, won: false };
        }

        state.save();
        return { finished: false };
    }
}
