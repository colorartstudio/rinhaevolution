import { state } from './state.js';

export const AudioEngine = {
    ctx: null,
    musicGain: null,
    sfxGain: null,
    musicOscillators: [],
    noiseBuffer: null,
    
    init: function() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        // Music Channel
        if (!this.musicGain) {
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(state.gameData.settings.muteMusic ? 0 : 0.15, this.ctx.currentTime);
            this.musicGain.connect(this.ctx.destination);
        }

        // SFX Channel
        if (!this.sfxGain) {
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(state.gameData.settings.muteSFX ? 0 : 1.0, this.ctx.currentTime);
            this.sfxGain.connect(this.ctx.destination);
        }

        // Create Noise Buffer
        if (!this.noiseBuffer) {
            const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            this.noiseBuffer = buffer;
        }
    },

    playTone: function(freq, type, dur, vol) {
        if (state.gameData.settings.muteSFX || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gn = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gn.gain.setValueAtTime(vol, this.ctx.currentTime);
        gn.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
        osc.connect(gn);
        gn.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    },

    playNoise: function(dur, filterType, freq, q, vol) {
        if (state.gameData.settings.muteSFX || !this.ctx || !this.noiseBuffer) return;
        
        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (q) filter.Q.value = q;

        const gn = this.ctx.createGain();
        gn.gain.setValueAtTime(vol, this.ctx.currentTime);
        gn.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);

        source.connect(filter);
        filter.connect(gn);
        gn.connect(this.sfxGain);
        
        source.start();
        source.stop(this.ctx.currentTime + dur);
    },

    playAttack: function() { this.playTone(300, 'triangle', 0.1, 0.1); setTimeout(() => this.playTone(200, 'triangle', 0.1, 0.1), 50); },
    
    playElementUltimate: function(element) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        if (element === 'fire') {
            // Explosão
            this.playNoise(0.8, 'lowpass', 600, 1, 0.8); // Rumbling explosion
            this.playTone(150, 'sawtooth', 0.4, 0.3); // Core impact
            setTimeout(() => this.playNoise(0.5, 'highpass', 1000, 0, 0.4), 100); // Sizzle
            return;
        }
        if (element === 'water') {
            // Splash / Bolhas
            this.playNoise(0.6, 'bandpass', 400, 2, 0.6); // Splash body
            this.playTone(300, 'sine', 0.3, 0.3); // Water glug
            setTimeout(() => {
                this.playTone(400, 'sine', 0.1, 0.2); // Bubble 1
                this.playTone(500, 'sine', 0.1, 0.2); // Bubble 2
            }, 150);
            return;
        }
        if (element === 'earth') {
            // Impacto Pesado
            this.playNoise(0.5, 'lowpass', 200, 0, 1.0); // Deep impact
            this.playTone(80, 'square', 0.4, 0.4); // Rumble
            this.playTone(60, 'sawtooth', 0.6, 0.3); // Sub rumble
            return;
        }
        if (element === 'air') {
            // Vento / Tornado (Swoosh)
            // Sweep filter frequency
            if (state.gameData.settings.muteSFX) return;
            const source = this.ctx.createBufferSource();
            source.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.value = 5;
            filter.frequency.setValueAtTime(200, t);
            filter.frequency.exponentialRampToValueAtTime(1500, t + 0.3); // Swoosh up
            filter.frequency.exponentialRampToValueAtTime(400, t + 0.8); // Swoosh down
            const gn = this.ctx.createGain();
            gn.gain.setValueAtTime(0, t);
            gn.gain.linearRampToValueAtTime(0.6, t + 0.2);
            gn.gain.linearRampToValueAtTime(0, t + 0.8);
            source.connect(filter);
            filter.connect(gn);
            gn.connect(this.sfxGain);
            source.start();
            source.stop(t + 0.8);
            return;
        }
        this.playAttack();
    },
    playHit: function() { this.playTone(100, 'square', 0.15, 0.2); },
    playCrit: function() { this.playTone(800, 'sawtooth', 0.1, 0.1); setTimeout(() => this.playTone(600, 'square', 0.2, 0.2), 50); },
    playWin: function() { [261, 329, 392, 523].forEach((f, i) => setTimeout(() => this.playTone(f, 'square', 0.3, 0.1), i * 150)); },
    playLoss: function() { [400, 380, 360, 340].forEach((f, i) => setTimeout(() => this.playTone(f, 'sawtooth', 0.4, 0.15), i * 300)); },
    playDefeat: function() { this.playTone(150, 'square', 0.5, 0.2); setTimeout(() => this.playTone(100, 'square', 0.4, 0.2), 100); },
    playClick: function() { this.playTone(800, 'sine', 0.05, 0.05); },

    startMusic: function() {
        this.init();
        if (!this.ctx || !this.musicGain) return;
        this.stopMusic();

        // 16-bit Style Battle Theme (Procedural)
        const tempo = 0.16; // Duration of one 16th note (approx)
        const t = this.ctx.currentTime;
        const vol = 0.08;

        // Helper to schedule note
        const note = (freq, startTime, dur, type = 'square', v = vol) => {
            const osc = this.ctx.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, startTime);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(state.gameData.settings.muteMusic ? 0 : v, startTime);
            g.gain.exponentialRampToValueAtTime(0.001, startTime + dur - 0.02);
            osc.connect(g);
            g.connect(this.musicGain);
            osc.start(startTime);
            osc.stop(startTime + dur);
            this.musicOscillators.push(osc);
        };

        // Bass Line (A2, F2, G2, E2)
        const bassNotes = [
            { f: 110, d: 4 }, { f: 110, d: 4 }, { f: 110, d: 4 }, { f: 110, d: 4 }, // A2
            { f: 87.3, d: 4 }, { f: 87.3, d: 4 }, { f: 87.3, d: 4 }, { f: 87.3, d: 4 }, // F2
            { f: 98, d: 4 }, { f: 98, d: 4 }, { f: 98, d: 4 }, { f: 98, d: 4 }, // G2
            { f: 82.4, d: 4 }, { f: 82.4, d: 4 }, { f: 82.4, d: 4 }, { f: 82.4, d: 4 }  // E2
        ];

        // Lead Arpeggio (Am, F, G, E)
        const leadNotes = [
            // Am (A, C, E, A)
            220, 261, 329, 440, 329, 261, 220, 196,
            220, 261, 329, 440, 523, 440, 329, 261,
            // F (F, A, C, F)
            174, 220, 261, 349, 261, 220, 174, 130,
            174, 220, 261, 349, 440, 349, 261, 220,
            // G (G, B, D, G)
            196, 246, 293, 392, 293, 246, 196, 146,
            196, 246, 293, 392, 493, 392, 293, 246,
            // E (E, G#, B, E)
            164, 207, 246, 329, 246, 207, 164, 123,
            164, 207, 246, 329, 415, 329, 246, 207
        ];

        let currentTime = t;
        
        // Loop Bass
        let bassTime = t;
        for(let i=0; i<4; i++) { // 4 bars
            bassNotes.forEach(n => {
                note(n.f, bassTime, tempo * n.d, 'triangle', vol * 1.5);
                bassTime += tempo * n.d;
            });
        }

        // Loop Lead
        leadNotes.forEach(f => {
            note(f, currentTime, tempo, 'sawtooth', vol * 0.8);
            currentTime += tempo;
        });

        // Loop duration should match total time
        const totalDuration = leadNotes.length * tempo;

        this.musicTimeout = setTimeout(() => {
            if (!state.gameData.settings.muteMusic) this.startMusic();
        }, totalDuration * 1000);
    },

    stopMusic: function() {
        if (this.musicTimeout) clearTimeout(this.musicTimeout);
        this.musicOscillators.forEach(o => {
            try { o.stop(); } catch (e) {}
        });
        this.musicOscillators = [];
    },

    updateMusicState: function() {
        if (!this.ctx || !this.musicGain) return;
        const target = state.gameData.settings.muteMusic ? 0 : 0.15;
        this.musicGain.gain.setValueAtTime(target, this.ctx.currentTime);
        
        if (state.gameData.settings.muteMusic) {
            this.stopMusic();
        } else {
            this.startMusic();
        }
    }
};
