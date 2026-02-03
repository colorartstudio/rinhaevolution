import { state } from './state.js';

export const AudioEngine = {
    ctx: null,
    
    init: function() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    playTone: function(freq, type, dur, vol) {
        if (state.gameData.settings.mute || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gn = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gn.gain.setValueAtTime(vol, this.ctx.currentTime);
        gn.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
        osc.connect(gn);
        gn.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    },

    playAttack: function() { this.playTone(300, 'triangle', 0.1, 0.1); setTimeout(() => this.playTone(200, 'triangle', 0.1, 0.1), 50); },
    playHit: function() { this.playTone(100, 'square', 0.15, 0.2); },
    playCrit: function() { this.playTone(800, 'sawtooth', 0.1, 0.1); setTimeout(() => this.playTone(600, 'square', 0.2, 0.2), 50); },
    playWin: function() { [261, 329, 392, 523].forEach((f, i) => setTimeout(() => this.playTone(f, 'square', 0.3, 0.1), i * 150)); },
    playLoss: function() { [400, 380, 360, 340].forEach((f, i) => setTimeout(() => this.playTone(f, 'sawtooth', 0.4, 0.15), i * 300)); },
    playDefeat: function() { this.playTone(150, 'square', 0.5, 0.2); setTimeout(() => this.playTone(100, 'square', 0.4, 0.2), 100); },
    playClick: function() { this.playTone(800, 'sine', 0.05, 0.05); }
};
