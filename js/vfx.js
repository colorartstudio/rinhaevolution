
import { AudioEngine } from './audio.js';

const FACE_STATES = ['shocked', 'hit', 'agony', 'recover'];
const cineTimers = new WeakMap();

export const VFX = {
    createContainer: function(targetElement, life = 2600) {
        if (!targetElement) return null;
        const cs = window.getComputedStyle(targetElement);
        if (cs.position === 'static') targetElement.style.position = 'relative';
        if (cs.overflow === 'hidden') targetElement.style.overflow = 'visible';

        const container = document.createElement('div');
        container.className = 'vfx-container vfx-container--epic';
        targetElement.appendChild(container);

        setTimeout(() => {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }, life);

        return container;
    },

    /** Leve câmera lenta: vinheta e zoom curto, sem mexer no painel de ações. */
    beginCinematic: function(kind) {
        const screen = document.getElementById('screen-battle') || document.body;
        let veil = document.getElementById('vfx-cinematic-veil');
        if (!veil) {
            veil = document.createElement('div');
            veil.id = 'vfx-cinematic-veil';
            screen.appendChild(veil);
        }
        veil.className = `vfx-cinematic-veil vfx-cinematic-veil--${kind || 'earth'}`;
        clearTimeout(this._veilTimer);
        this._veilTimer = setTimeout(() => {
            veil.classList.add('is-out');
        }, 1700);
    },

    agony: function(targetElement, kind) {
        if (!targetElement) return;
        const cls = `vfx-agony-${kind}`;
        targetElement.classList.remove('vfx-agony-fire', 'vfx-agony-water', 'vfx-agony-earth', 'vfx-agony-air');
        void targetElement.offsetWidth;
        targetElement.classList.add(cls);
        const life = kind === 'air' ? 2600 : 2300;
        setTimeout(() => targetElement.classList.remove(cls), life);
    },

    /**
     * Camada cinematográfica compartilhada pelos quatro especiais.
     * Não altera relógios, dano ou turno — só câmera, cara e tremor.
     */
    playSpecialCinematic: function({ defender, attacker, element } = {}) {
        if (!defender) return;
        this._clearCinematic(defender);
        const timers = [];
        const later = (ms, fn) => timers.push(setTimeout(fn, ms));
        cineTimers.set(defender, timers);

        this.setFace(defender, 'shocked');
        this.focusFighter(attacker);
        this.focusFighter(defender);
        this.shake('pre');

        later(700, () => {
            if (!defender.isConnected) return this._clearCinematic(defender);
            this.setFace(defender, 'hit');
            this.shake('impact');
            this.impactFlash(element);
            AudioEngine.playRoosterScream();
        });
        later(1080, () => { if (defender.isConnected) this.setFace(defender, 'agony'); });
        const recoverAt = element === 'air' ? 2500 : 1850;
        later(recoverAt, () => { if (defender.isConnected) this.setFace(defender, 'recover'); });
        later(recoverAt + 420, () => this._clearCinematic(defender));
    },

    _clearCinematic: function(el) {
        const timers = el && cineTimers.get(el);
        if (timers) timers.forEach(clearTimeout);
        if (el) cineTimers.delete(el);
        this.clearFace(el);
        this.clearShake();
        const flash = document.getElementById('vfx-impact-flash');
        if (flash) flash.remove();
    },

    setFace: function(el, name) {
        if (!el) return;
        FACE_STATES.forEach(state => el.classList.remove('vfx-face-' + state));
        void el.offsetWidth;
        if (name) el.classList.add('vfx-face-' + name);
    },

    clearFace: function(el) {
        if (!el) return;
        FACE_STATES.forEach(state => el.classList.remove('vfx-face-' + state));
    },

    focusFighter: function(el) {
        if (!el) return;
        el.classList.remove('vfx-slow-focus');
        void el.offsetWidth;
        el.classList.add('vfx-slow-focus');
        setTimeout(() => el.classList.remove('vfx-slow-focus'), 750);
    },

    shake: function(kind) {
        const stage = document.getElementById('screen-battle');
        if (!stage) return;
        stage.classList.remove('vfx-shake-pre', 'vfx-shake-hit');
        void stage.offsetWidth;
        stage.classList.add(kind === 'impact' ? 'vfx-shake-hit' : 'vfx-shake-pre');
        clearTimeout(this._shakeTimer);
        this._shakeTimer = setTimeout(() => stage.classList.remove('vfx-shake-pre', 'vfx-shake-hit'), kind === 'impact' ? 260 : 200);
    },

    clearShake: function() {
        clearTimeout(this._shakeTimer);
        document.getElementById('screen-battle')?.classList.remove('vfx-shake-pre', 'vfx-shake-hit');
    },

    impactFlash: function(element) {
        const screen = document.getElementById('screen-battle') || document.body;
        let flash = document.getElementById('vfx-impact-flash');
        if (!flash) {
            flash = document.createElement('div');
            flash.id = 'vfx-impact-flash';
            screen.appendChild(flash);
        }
        flash.className = `vfx-impact-flash vfx-impact-flash--${element || 'earth'}`;
        setTimeout(() => { if (flash.parentNode) flash.remove(); }, 220);
    },

    spawnPrep: function(container, className, count, paint) {
        if (!container) return;
        for (let i = 0; i < count; i++) {
            const node = document.createElement('div');
            node.className = className;
            paint(node, i);
            container.appendChild(node);
        }
    },

    playFire: function(targetElement) {
        this.beginCinematic('fire');
        this.agony(targetElement, 'fire');
        const container = this.createContainer(targetElement);
        if (!container) return;

        const core = document.createElement('div');
        core.className = 'vfx-fire-core';
        container.appendChild(core);

        const ring = document.createElement('div');
        ring.className = 'vfx-fire-ring';
        container.appendChild(ring);

        for (let i = 0; i < 14; i++) {
            const p = document.createElement('div');
            p.className = 'vfx-fire-particle';
            const angle = Math.random() * Math.PI * 2;
            const dist = 70 + Math.random() * 90;
            p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--ty', (Math.sin(angle) * dist - 40) + 'px');
            p.style.left = '50%';
            p.style.top = '55%';
            p.style.animationDelay = (0.35 + Math.random() * 0.45) + 's';
            p.style.width = p.style.height = (6 + Math.random() * 10) + 'px';
            container.appendChild(p);
        }
        this.spawnPrep(container, 'vfx-fire-smoke', 6, (node, i) => {
            node.style.left = (18 + i * 11) + '%';
            node.style.animationDelay = (0.95 + i * 0.08) + 's';
            node.style.setProperty('--sx', ((i - 2.5) * 22) + 'px');
        });
    },

    playWater: function(targetElement) {
        this.beginCinematic('water');
        this.agony(targetElement, 'water');
        const container = this.createContainer(targetElement);
        if (!container) return;

        const spout = document.createElement('div');
        spout.className = 'vfx-water-spout';
        container.appendChild(spout);

        const ring = document.createElement('div');
        ring.className = 'vfx-water-ring';
        container.appendChild(ring);

        for (let i = 0; i < 10; i++) {
            const b = document.createElement('div');
            b.className = 'vfx-water-bubble';
            const size = 8 + Math.random() * 22;
            b.style.width = size + 'px';
            b.style.height = size + 'px';
            b.style.left = (8 + Math.random() * 78) + '%';
            b.style.bottom = '18%';
            b.style.animationDelay = (0.45 + Math.random() * 0.55) + 's';
            b.style.setProperty('--drift', ((Math.random() - 0.5) * 50) + 'px');
            container.appendChild(b);
        }
        this.spawnPrep(container, 'vfx-water-bubble', 8, (node, i) => {
            const size = 6 + Math.random() * 16;
            node.style.width = node.style.height = size + 'px';
            node.style.left = (12 + (i * 9) % 76) + '%';
            node.style.bottom = (8 + Math.random() * 20) + '%';
            node.style.animationDuration = (1.1 + Math.random() * 0.9) + 's';
            node.style.animationDelay = (0.85 + Math.random() * 0.45) + 's';
            node.style.setProperty('--drift', ((Math.random() - 0.5) * 70) + 'px');
        });
    },

    playEarth: function(targetElement) {
        this.beginCinematic('earth');
        this.agony(targetElement, 'earth');
        const container = this.createContainer(targetElement);
        if (!container) return;

        const shadow = document.createElement('div');
        shadow.className = 'vfx-earth-shadow';
        container.appendChild(shadow);

        const rock = document.createElement('div');
        rock.className = 'vfx-earth-rock';
        container.appendChild(rock);

        for (let i = 0; i < 4; i++) {
            const chip = document.createElement('div');
            chip.className = 'vfx-earth-chip';
            chip.style.left = (30 + Math.random() * 40) + '%';
            chip.style.setProperty('--cx', ((Math.random() - 0.5) * 120) + 'px');
            chip.style.animationDelay = (0.72 + Math.random() * 0.12) + 's';
            container.appendChild(chip);
        }

        const ring = document.createElement('div');
        ring.className = 'vfx-earth-ring';
        container.appendChild(ring);

        for (let i = 0; i < 7; i++) {
            const dust = document.createElement('div');
            dust.className = 'vfx-earth-dust';
            dust.style.left = (10 + i * 12) + '%';
            dust.style.animationDelay = (0.78 + i * 0.06) + 's';
            dust.style.setProperty('--dx', ((i - 3) * 28) + 'px');
            container.appendChild(dust);
        }
        this.spawnPrep(container, 'vfx-earth-speck', 8, (node, i) => {
            node.style.left = (20 + i * 8) + '%';
            node.style.animationDelay = (i * 0.04) + 's';
            node.style.setProperty('--sx', ((i - 4) * 14) + 'px');
        });
        this.spawnPrep(container, 'vfx-earth-burst', 8, (node, i) => {
            node.style.left = '46%';
            node.style.animationDelay = (0.72 + i * 0.03) + 's';
            node.style.setProperty('--bx', ((i - 3.5) * 36) + 'px');
            node.style.setProperty('--by', (-18 - (i % 3) * 16) + 'px');
        });
    },

    playAir: function(targetElement) {
        this.beginCinematic('air');
        this.agony(targetElement, 'air');
        const container = this.createContainer(targetElement, 2800);
        if (!container) return;

        for (let i = 0; i < 3; i++) {
            const tornado = document.createElement('div');
            tornado.className = 'vfx-air-tornado';
            tornado.style.animationDelay = (i * 0.12) + 's';
            tornado.style.width = (70 + i * 18) + '%';
            tornado.style.height = (78 + i * 10) + '%';
            tornado.style.left = (15 - i * 4) + '%';
            tornado.style.top = (6 + i * 4) + '%';
            container.appendChild(tornado);
        }

        for (let i = 0; i < 8; i++) {
            const line = document.createElement('div');
            line.className = 'vfx-air-line';
            line.style.top = (12 + Math.random() * 70) + '%';
            line.style.animationDelay = (0.15 + i * 0.12) + 's';
            line.style.setProperty('--spin', (i % 2 === 0 ? 1 : -1));
            container.appendChild(line);
        }
        this.spawnPrep(container, 'vfx-air-leaf', 7, (node, i) => {
            node.style.top = (20 + (i * 9) % 60) + '%';
            node.style.left = '42%';
            node.style.animationDelay = (0.1 + i * 0.12) + 's';
            node.style.setProperty('--orbit', (i % 2 ? 1 : -1));
            node.style.background = i % 2 ? '#86efac' : '#d6d3d1';
        });
        this.spawnPrep(container, 'vfx-air-cloud', 4, (node, i) => {
            node.style.left = (10 + i * 18) + '%';
            node.style.animationDelay = (0.35 + i * 0.1) + 's';
            node.style.setProperty('--cx', ((i - 1.5) * 24) + 'px');
        });
    },

    playFusion: function(fusionId, targetElement, attackerElement) {
        const look = FUSION_LOOK[fusionId] || FUSION_LOOK.steam_burst;
        if (!targetElement) return;
        this.playSpecialCinematic({ defender: targetElement, attacker: attackerElement, element: look.veil });
        this.beginCinematic(look.veil);
        this.agony(targetElement, look.agony);
        const container = this.createContainer(targetElement, 2600);
        if (!container) return;
        spawnFusionBits(container, look.mode);
    },

    play: function(element, targetElement, attackerElement) {
        if (!element || !targetElement) return;
        this.playSpecialCinematic({ defender: targetElement, attacker: attackerElement, element });

        switch(element) {
            case 'fire': this.playFire(targetElement); break;
            case 'water': this.playWater(targetElement); break;
            case 'earth': this.playEarth(targetElement); break;
            case 'air': this.playAir(targetElement); break;
        }
    },

    /** Bolha de Escudo (item) — permanece enquanto itemGuardTurns > 0. */
    setItemGuard: function(avatarEl, active) {
        if (!avatarEl) return;
        const existing = avatarEl.querySelector(':scope > .vfx-item-guard');
        if (!active) {
            if (existing) existing.remove();
            return;
        }
        const cs = window.getComputedStyle(avatarEl);
        if (cs.position === 'static') avatarEl.style.position = 'relative';
        if (cs.overflow === 'hidden') avatarEl.style.overflow = 'visible';
        if (existing) return;
        const bubble = document.createElement('div');
        bubble.className = 'vfx-item-guard';
        bubble.setAttribute('aria-hidden', 'true');
        avatarEl.appendChild(bubble);
    },

    pulseItemGuard: function(avatarEl) {
        if (!avatarEl) return;
        const bubble = avatarEl.querySelector(':scope > .vfx-item-guard');
        if (!bubble) return;
        bubble.classList.remove('vfx-item-guard--hit');
        void bubble.offsetWidth;
        bubble.classList.add('vfx-item-guard--hit');
        setTimeout(() => bubble.classList.remove('vfx-item-guard--hit'), 360);
    },

    /**
     * Esporada até o galo alvo. O sprite vira um clone em position:fixed,
     * então o palco com overflow hidden não corta o voo em desktop, tablet ou mobile.
     * O galo original fica no slot (visibility) para o layout não pular.
     * onImpact dispara no contato, antes do retorno.
     */
    chargeStrike: function(attacker, target, style, hooks = {}) {
        const profile = CHARGE_PROFILES[style] || CHARGE_PROFILES.peck;
        const trail = TRAIL_COLOR[hooks.trail] ? hooks.trail : 'fire';
        const fireImpact = () => {
            try { hooks.onImpact?.(); } catch (err) { console.error(err); }
        };

        if (!attacker?.isConnected || !target?.isConnected) {
            fireImpact();
            return Promise.resolve();
        }

        const from = attacker.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        if (from.width < 4 || to.width < 4) {
            fireImpact();
            return Promise.resolve();
        }

        const face = readFacing(attacker);
        const ax = from.left + from.width / 2;
        const ay = from.top + from.height / 2;
        const tx = to.left + to.width / 2;
        const ty = to.top + to.height * 0.48;
        const fullDx = tx - ax;
        const fullDy = ty - ay;
        const dx = fullDx * profile.stop;
        const dy = fullDy * profile.stop;
        const dist = Math.hypot(fullDx, fullDy) || 1;
        const hopMag = Math.min(Math.max(from.height, 64) * 1.15, dist * Math.abs(profile.arc || 0.25));
        const hop = hopMag * Math.sign(profile.arc || -1);

        const clone = attacker.cloneNode(true);
        clone.removeAttribute('id');
        clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        clone.classList.remove('anim-hit', 'anim-lunge-up', 'anim-lunge-down', 'anim-wing-flap', 'active-rooster', 'inactive-rooster', 'target-rooster');
        clone.classList.add('charge-actor');
        clone.style.cssText = `position:fixed;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;margin:0;z-index:2800;pointer-events:none;visibility:visible;transition:none;transform:scale(${face},1)`;
        document.body.appendChild(clone);
        attacker.style.visibility = 'hidden';

        const xf = (x, y, s = 1) => `translate(${x}px, ${y}px) scale(${face * s}, ${s})`;
        const pecks = Math.max(1, profile.pecks || 1);
        const frames = [
            { transform: xf(0, 0, 1), offset: 0 },
            { transform: xf(fullDx * 0.05, hop * 0.14, 0.94), offset: 0.1 },
            { transform: xf(dx * 0.48, hop, 1.08), offset: 0.3 },
            { transform: xf(dx, dy, 1.14), offset: 0.46 }
        ];
        let cursor = 0.46;
        const room = 0.3;
        for (let i = 0; i < pecks; i++) {
            const jab = i % 2 === 0 ? 12 : -9;
            cursor += (room / pecks) * 0.42;
            frames.push({ transform: xf(dx + jab, dy + (i % 2 ? 5 : -6), 1.2), offset: roundOffset(cursor) });
            cursor += (room / pecks) * 0.58;
            frames.push({ transform: xf(dx, dy, 1.06), offset: roundOffset(Math.min(0.8, cursor)) });
        }
        frames.push({ transform: xf(dx * 0.32, hop * 0.22, 1), offset: 0.9 });
        frames.push({ transform: xf(0, 0, 1), offset: 1 });
        lockOffsets(frames);

        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const duration = Math.round(profile.duration * (reduced ? 0.62 : 1));
        spawnChargeTrail(ax, ay, dx, dy, hop, trail, duration * 0.46);

        const anim = clone.animate(frames, { duration, easing: 'linear', fill: 'forwards' });
        let impacted = false;
        const impactTimer = setTimeout(() => {
            impacted = true;
            spawnChargeBurst(to, trail);
            if (profile.self && attacker.isConnected) {
                const shell = document.createElement('div');
                shell.className = 'charge-shell';
                attacker.appendChild(shell);
                setTimeout(() => shell.remove(), 780);
            }
            if (style !== 'peck') this.shake(style === 'ultimate' || style === 'quake' || style === 'breaker' ? 'impact' : 'pre');
            fireImpact();
        }, duration * 0.46);

        return new Promise(resolve => {
            let settled = false;
            const end = () => {
                if (settled) return;
                settled = true;
                clearTimeout(impactTimer);
                if (!impacted) fireImpact();
                if (clone.parentNode) clone.remove();
                if (attacker.isConnected) attacker.style.visibility = '';
                resolve();
            };
            anim.onfinish = end;
            setTimeout(end, duration + 90);
        });
    }
};

const FUSION_LOOK = {
    steam_burst: { veil: 'water', agony: 'water', mode: 'steam' },
    magma_eruption: { veil: 'fire', agony: 'earth', mode: 'magma' },
    fire_hurricane: { veil: 'fire', agony: 'fire', mode: 'spin' },
    mud_swamp: { veil: 'earth', agony: 'earth', mode: 'mud' },
    storm: { veil: 'water', agony: 'air', mode: 'storm' },
    sand_tornado: { veil: 'earth', agony: 'air', mode: 'sand' }
};

function spawnFusionBits(container, mode) {
    const count = mode === 'storm' ? 16 : 12;
    for (let i = 0; i < count; i++) {
        const bit = document.createElement('div');
        bit.className = `vfx-fusion-bit vfx-fusion-bit--${mode}`;
        bit.style.setProperty('--i', String(i));
        bit.style.left = (8 + (i * 17) % 84) + '%';
        bit.style.animationDelay = (i * 0.06) + 's';
        container.appendChild(bit);
    }
    if (mode === 'magma' || mode === 'mud') {
        const ground = document.createElement('div');
        ground.className = `vfx-fusion-ground vfx-fusion-ground--${mode}`;
        container.appendChild(ground);
    }
    if (mode === 'storm') {
        const bolt = document.createElement('div');
        bolt.className = 'vfx-fusion-bolt';
        container.appendChild(bolt);
    }
}

const CHARGE_PROFILES = {
    peck: { duration: 560, arc: -0.22, stop: 0.84, pecks: 1 },
    comet: { duration: 720, arc: -0.5, stop: 0.9, pecks: 1 },
    shell: { duration: 640, arc: 0.12, stop: 0.82, pecks: 1, self: true },
    wave: { duration: 800, arc: -0.14, stop: 0.96, pecks: 1 },
    brace: { duration: 680, arc: 0.2, stop: 0.74, pecks: 1 },
    quake: { duration: 860, arc: -0.68, stop: 0.88, pecks: 1 },
    dive: { duration: 780, arc: -0.78, stop: 0.86, pecks: 1 },
    flurry: { duration: 960, arc: -0.3, stop: 0.82, pecks: 3 },
    phoenix: { duration: 820, arc: -0.72, stop: 0.84, pecks: 1 },
    ultimate: { duration: 900, arc: -0.42, stop: 0.8, pecks: 2 },
    breaker: { duration: 740, arc: -0.36, stop: 0.92, pecks: 1 }
};

const TRAIL_COLOR = {
    fire: '#fb923c',
    water: '#38bdf8',
    earth: '#a3e635',
    air: '#e2e8f0'
};

function readFacing(el) {
    try {
        const t = getComputedStyle(el).transform;
        if (t && t !== 'none') {
            const m = new DOMMatrix(t);
            if (m.a < -0.01) return -1;
        }
    } catch (err) { /* segue de frente */ }
    return String(el.className || '').includes('scale-x-[-1]') ? -1 : 1;
}

function roundOffset(n) {
    return Math.round(Math.min(0.99, Math.max(0.01, n)) * 1000) / 1000;
}

function lockOffsets(frames) {
    let last = -0.001;
    frames.forEach((frame, index) => {
        if (index === frames.length - 1) {
            frame.offset = 1;
            return;
        }
        if (frame.offset <= last) frame.offset = Math.min(0.97, last + 0.015);
        last = frame.offset;
    });
}

function spawnChargeTrail(ax, ay, dx, dy, hop, trail, ms) {
    const color = TRAIL_COLOR[trail] || '#fff';
    const layer = document.createElement('div');
    layer.className = 'charge-layer';
    document.body.appendChild(layer);
    for (let i = 0; i < 12; i++) {
        const spark = document.createElement('div');
        spark.className = 'charge-spark';
        spark.style.background = color;
        spark.style.color = color;
        spark.style.left = ax + 'px';
        spark.style.top = ay + 'px';
        spark.style.width = spark.style.height = (6 + (i % 3) * 3) + 'px';
        spark.animate([
            { transform: 'translate(-4px, -4px) scale(1)', opacity: 0.95 },
            { transform: `translate(${dx * 0.5}px, ${hop}px) scale(0.75)`, opacity: 0.85, offset: 0.5 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0 }
        ], { duration: Math.max(180, ms), delay: i * 18, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
        layer.appendChild(spark);
    }
    setTimeout(() => layer.remove(), ms + 520);
}

function spawnChargeBurst(rect, trail) {
    const color = TRAIL_COLOR[trail] || '#fff';
    const burst = document.createElement('div');
    burst.className = `charge-burst charge-burst--${trail}`;
    burst.style.left = (rect.left + rect.width / 2) + 'px';
    burst.style.top = (rect.top + rect.height * 0.45) + 'px';
    for (let i = 0; i < 8; i++) {
        const chip = document.createElement('i');
        chip.className = 'charge-chip';
        const ang = (Math.PI * 2 * i) / 8;
        chip.style.background = color;
        chip.style.setProperty('--cx', Math.cos(ang) * 46 + 'px');
        chip.style.setProperty('--cy', Math.sin(ang) * 34 + 'px');
        burst.appendChild(chip);
    }
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 520);
}
