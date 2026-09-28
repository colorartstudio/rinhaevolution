/**
 * Identidade visual das fusões. Não entra em dano, HP, defesa nem na vantagem de cor.
 * O corpo (element) segue o sorteio 50/50. A paleta muda conforme o corpo,
 * para o elemento principal continuar legível dentro da fusão.
 */
import { pairKey } from './fusion-abilities.js';

const KEY_ALIAS = {
    earth_fire: 'fire_earth',
    air_fire: 'fire_air',
    earth_water: 'water_earth',
    air_water: 'water_air',
    air_earth: 'earth_air'
};

export const FUSION_VISUALS = {
    fire_water: {
        name: 'Vapor Escaldante',
        nameKey: 'skill-fusion-steam-name',
        primaryColor: '#e11d48',
        secondaryColor: '#22d3ee',
        glowColor: '#fb7185',
        aura: 'steam',
        bodies: {
            fire: { primary: '#e11d48', secondary: '#22d3ee', glow: '#fb7185' },
            water: { primary: '#0e7490', secondary: '#e879f9', glow: '#f472b6' }
        }
    },
    fire_earth: {
        name: 'Erupção Magmática',
        nameKey: 'skill-fusion-magma-name',
        primaryColor: '#c2410c',
        secondaryColor: '#7f1d1d',
        glowColor: '#fbbf24',
        aura: 'magma',
        bodies: {
            fire: { primary: '#c2410c', secondary: '#7f1d1d', glow: '#fbbf24' },
            earth: { primary: '#9a3412', secondary: '#f97316', glow: '#f59e0b' }
        }
    },
    fire_air: {
        name: 'Furacão de Fogo',
        nameKey: 'skill-fusion-hurricane-name',
        primaryColor: '#dc2626',
        secondaryColor: '#fb923c',
        glowColor: '#facc15',
        aura: 'fire_wind',
        bodies: {
            fire: { primary: '#dc2626', secondary: '#fb923c', glow: '#facc15' },
            air: { primary: '#fdba74', secondary: '#ef4444', glow: '#fde68a' }
        }
    },
    water_earth: {
        name: 'Pântano de Lama',
        nameKey: 'skill-fusion-mud-name',
        primaryColor: '#0f766e',
        secondaryColor: '#1e3a8a',
        glowColor: '#a16207',
        aura: 'mud',
        bodies: {
            water: { primary: '#0f766e', secondary: '#1e3a8a', glow: '#a16207' },
            earth: { primary: '#4d7c0f', secondary: '#0e7490', glow: '#78350f' }
        }
    },
    water_air: {
        name: 'Tempestade Tropical',
        nameKey: 'skill-fusion-storm-name',
        primaryColor: '#1d4ed8',
        secondaryColor: '#22d3ee',
        glowColor: '#7dd3fc',
        aura: 'storm',
        bodies: {
            water: { primary: '#1d4ed8', secondary: '#22d3ee', glow: '#7dd3fc' },
            air: { primary: '#38bdf8', secondary: '#1e40af', glow: '#e0f2fe' }
        }
    },
    earth_air: {
        name: 'Tornado de Areia',
        nameKey: 'skill-fusion-sand-name',
        primaryColor: '#d97706',
        secondaryColor: '#78350f',
        glowColor: '#d6d3d1',
        aura: 'sand',
        bodies: {
            earth: { primary: '#d97706', secondary: '#78350f', glow: '#d6d3d1' },
            air: { primary: '#f3d5b5', secondary: '#b45309', glow: '#a8a29e' }
        }
    }
};

export const EVOLUTION_VISUALS = {
    fire: {
        name: 'Fogo Primordial',
        nameKey: 'skill-evo-fire-name',
        primary: '#b91c1c',
        secondary: '#fbbf24',
        glow: '#f97316',
        aura: 'embers'
    },
    water: {
        name: 'Água Abissal',
        nameKey: 'skill-evo-water-name',
        primary: '#1e3a8a',
        secondary: '#22d3ee',
        glow: '#38bdf8',
        aura: 'tide'
    },
    earth: {
        name: 'Terra Ancestral',
        nameKey: 'skill-evo-earth-name',
        primary: '#3f6212',
        secondary: '#a8a29e',
        glow: '#eab308',
        aura: 'stone'
    },
    air: {
        name: 'Ar Celestial',
        nameKey: 'skill-evo-air-name',
        primary: '#7dd3fc',
        secondary: '#f8fafc',
        glow: '#e2e8f0',
        aura: 'gale'
    }
};

function shadeHex(hex, amount) {
    const raw = String(hex || '').replace('#', '');
    const full = raw.length === 3 ? raw.split('').map(ch => ch + ch).join('') : raw;
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return '#334155';
    const clamp = (n) => Math.max(0, Math.min(255, n));
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 255) + amount);
    const b = clamp((num & 255) + amount);
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function pack(palette, aura, nameKey, kind) {
    const primary = palette.primary || palette.primaryColor;
    const secondary = palette.secondary || palette.secondaryColor;
    const glow = palette.glow || palette.glowColor;
    return { kind, nameKey, aura, primary, secondary, glow, dark: shadeHex(primary, -48) };
}

export function fusionVisualSpec(element, secondary) {
    if (!element || !secondary || element === secondary) return null;
    const key = KEY_ALIAS[pairKey(element, secondary)] || pairKey(element, secondary);
    return FUSION_VISUALS[key] || null;
}

/** Paleta do sprite. Galo puro devolve null e segue a cor de pintura. */
export function fusionLook(rooster) {
    if (!rooster?.element) return null;
    const second = rooster.secondaryElement || rooster.dna?.secondaryElement;
    if (second && second !== rooster.element) {
        const spec = fusionVisualSpec(rooster.element, second);
        if (!spec) return null;
        const body = spec.bodies?.[rooster.element] || {
            primary: spec.primaryColor,
            secondary: spec.secondaryColor,
            glow: spec.glowColor
        };
        return pack(body, spec.aura, spec.nameKey, 'hybrid');
    }
    if (rooster.forged || rooster.dna?.evolution) {
        const evo = EVOLUTION_VISUALS[rooster.element];
        if (!evo) return null;
        return pack(evo, evo.aura, evo.nameKey, 'evolution');
    }
    return null;
}
