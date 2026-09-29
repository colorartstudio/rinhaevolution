import { ELEMENTS, COLORS, SKINS } from './state.js';
import { AudioEngine } from './audio.js';
import { fusionLook } from './fusion-visuals.js';

function fusionAura(aura, glow) {
    if (aura === 'steam') return `
        <g class="fusion-aura" fill="#e0f2fe">
            <circle cx="78" cy="168" r="5" opacity="0.45"><animate attributeName="cy" values="170;95" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.45;0" dur="2.6s" repeatCount="indefinite"/></circle>
            <circle cx="118" cy="150" r="4" fill="${glow}" opacity="0.35"><animate attributeName="cy" values="160;88" dur="3.1s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0" dur="3.1s" repeatCount="indefinite"/></circle>
            <circle cx="96" cy="140" r="3" opacity="0.3"><animate attributeName="cy" values="150;80" dur="2.2s" repeatCount="indefinite"/></circle>
        </g>`;
    if (aura === 'magma') return `
        <g class="fusion-aura">
            <circle cx="92" cy="188" r="7" fill="${glow}" opacity="0.35"><animate attributeName="opacity" values="0.2;0.55;0.2" dur="1.4s" repeatCount="indefinite"/></circle>
            <circle cx="132" cy="176" r="4" fill="#f97316" opacity="0.5"><animate attributeName="cy" values="178;150" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.55;0" dur="1.8s" repeatCount="indefinite"/></circle>
            <path d="M118,168 L128,156 L136,170" fill="none" stroke="${glow}" stroke-width="2" opacity="0.7"/>
        </g>`;
    if (aura === 'fire_wind') return `
        <g class="fusion-aura" fill="none" stroke="${glow}" stroke-width="2" opacity="0.55">
            <path d="M48,150 C70,140 78,168 100,158"><animate attributeName="opacity" values="0.2;0.7;0.2" dur="1.6s" repeatCount="indefinite"/></path>
            <path d="M40,128 C68,118 80,146 104,132" stroke="#fff7ed"/>
            <circle cx="150" cy="120" r="3" fill="#fde68a" stroke="none" opacity="0.6"/>
        </g>`;
    if (aura === 'mud') return `
        <g class="fusion-aura">
            <circle cx="108" cy="198" r="6" fill="#78350f" opacity="0.45"/>
            <circle cx="148" cy="192" r="4" fill="#0f766e" opacity="0.4"/>
            <circle cx="128" cy="210" r="3" fill="${glow}" opacity="0.35"><animate attributeName="cy" values="206;214;206" dur="2.4s" repeatCount="indefinite"/></circle>
        </g>`;
    if (aura === 'storm') return `
        <g class="fusion-aura">
            <path d="M70,118 L82,140 L74,140 L90,168" fill="none" stroke="#e0f2fe" stroke-width="2" opacity="0.7"><animate attributeName="opacity" values="0.15;0.8;0.15" dur="1.3s" repeatCount="indefinite"/></path>
            <circle cx="150" cy="100" r="3" fill="${glow}" opacity="0.6"><animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.9s" repeatCount="indefinite"/></circle>
            <circle cx="60" cy="140" r="2.5" fill="#7dd3fc" opacity="0.5"/>
        </g>`;
    if (aura === 'sand') return `
        <g class="fusion-aura" fill="#d6d3d1">
            <circle cx="70" cy="140" r="2.5" opacity="0.7"><animate attributeName="cx" values="60;150;60" dur="3s" repeatCount="indefinite"/><animate attributeName="cy" values="150;110;150" dur="3s" repeatCount="indefinite"/></circle>
            <circle cx="120" cy="100" r="2" fill="#a8a29e" opacity="0.55"><animate attributeName="cx" values="130;70;130" dur="3.6s" repeatCount="indefinite"/></circle>
            <circle cx="160" cy="170" r="2" fill="${glow}" opacity="0.45"/>
        </g>`;
    if (aura === 'embers') return `
        <g class="fusion-aura" fill="${glow}">
            <circle cx="90" cy="160" r="3" opacity="0.6"><animate attributeName="cy" values="170;110" dur="1.7s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0" dur="1.7s" repeatCount="indefinite"/></circle>
            <circle cx="130" cy="150" r="2.5" fill="#fbbf24"><animate attributeName="cy" values="160;100" dur="2.1s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0" dur="2.1s" repeatCount="indefinite"/></circle>
        </g>`;
    if (aura === 'tide') return `
        <g class="fusion-aura" fill="none" stroke="${glow}" stroke-width="2" opacity="0.45">
            <path d="M50,190 C80,176 110,204 150,188"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="M50,190 C80,176 110,204 150,188; M50,186 C80,200 110,172 150,192; M50,190 C80,176 110,204 150,188"/></path>
            <path d="M60,204 C90,190 120,214 155,200" stroke="#22d3ee"/>
        </g>`;
    if (aura === 'stone') return `
        <g class="fusion-aura" fill="${glow}" opacity="0.35">
            <path d="M64,168 L72,156 L80,168 Z"/>
            <path d="M150,188 L160,174 L170,190 Z" fill="#a8a29e"/>
            <circle cx="110" cy="200" r="3" fill="#78716c"/>
        </g>`;
    if (aura === 'gale') return `
        <g class="fusion-aura" fill="none" stroke="#f8fafc" stroke-width="1.5" opacity="0.55">
            <path d="M46,130 C80,120 90,150 130,136"><animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" repeatCount="indefinite"/></path>
            <path d="M40,154 C78,144 96,170 140,154" stroke="${glow}"/>
        </g>`;
    return '';
}

export function renderRooster(containerId, rooster, isGhost = false) {
    const look = fusionLook(rooster);
    renderAvatar(
        containerId,
        rooster?.element,
        rooster?.color,
        look ? 'none' : (rooster?.dna?.skin || 'none'),
        isGhost,
        look
    );
}

export function renderAvatar(containerId, type, colorKey, skinKey = 'none', isGhost = false, look = null) {
    let container = document.getElementById(containerId + '-avatar');
    if (!container) container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    let bodyColor = isGhost ? '#4b5563' : '#cbd5e1'; 
    let darkColor = isGhost ? '#1f2937' : '#64748b';
    
    if (!isGhost && look?.primary) {
        bodyColor = look.primary;
        darkColor = look.dark || '#334155';
    } else if (!isGhost && colorKey && COLORS[colorKey]) {
        bodyColor = COLORS[colorKey].hex;
        darkColor = COLORS[colorKey].dark;
    }
    
    const elData = ELEMENTS[type];
    if (!elData) return;

    const skin = SKINS[skinKey] || SKINS.none;
    let filterStyle = skin.filter ? `style="filter: ${skin.filter}"` : "";
    
    if (isGhost) {
        filterStyle = `style="filter: grayscale(1) opacity(0.5) contrast(0.8)"`;
    } else if (look?.primary) {
        filterStyle = '';
    }

    const tailFill1 = isGhost ? '#374151' : (look?.primary || elData.tailColor1);
    const tailFill2 = isGhost ? '#111827' : (look?.secondary || elData.tailColor2);
    const wingFill = look && !isGhost ? look.secondary : darkColor;
    const wingMark = look && !isGhost ? look.glow : 'rgba(0,0,0,0.2)';
    const aura = look && !isGhost ? fusionAura(look.aura, look.glow) : '';
    const bodyMark = look && !isGhost
        ? `<path d="M112,150 C138,138 168,168 150,188" fill="none" stroke="${look.secondary}" stroke-width="4" stroke-linecap="round" opacity="0.8"/>`
        : '';
    
    // --- Sistema de Cauda Profissional (Penas em Camadas) ---
    let tailGroup = "";
    let tailAnim = "";

    if (type === 'fire') {
        tailGroup = `
            <g class="tail-feathers">
                <path d="M70,180 C20,150 -10,80 60,40 C70,60 80,100 100,140 Z" fill="url(#gradTail-${containerId})">
                    <animate attributeName="d" dur="0.8s" repeatCount="indefinite" values="M70,180 C20,150 -10,80 60,40 C70,60 80,100 100,140 Z; M70,180 C15,145 -15,75 55,35 C65,55 75,95 100,140 Z; M70,180 C20,150 -10,80 60,40 C70,60 80,100 100,140 Z" />
                </path>
                <path d="M80,180 C40,130 20,40 100,20 C110,50 120,90 130,140 Z" fill="url(#gradTail-${containerId})" opacity="0.8">
                    <animate attributeName="d" dur="1s" repeatCount="indefinite" values="M80,180 C40,130 20,40 100,20 C110,50 120,90 130,140 Z; M80,180 C35,125 15,35 105,15 C115,45 125,85 130,140 Z; M80,180 C40,130 20,40 100,20 C110,50 120,90 130,140 Z" />
                </path>
                <path d="M90,180 C60,110 50,20 140,40 C140,70 140,110 140,160 Z" fill="url(#gradTail-${containerId})" opacity="0.6">
                    <animate attributeName="d" dur="1.2s" repeatCount="indefinite" values="M90,180 C60,110 50,20 140,40 C140,70 140,110 140,160 Z; M90,180 C55,105 45,15 145,35 C145,65 145,105 140,160 Z; M90,180 C60,110 50,20 140,40 C140,70 140,110 140,160 Z" />
                </path>
            </g>`;
    } else if (type === 'water') {
        tailGroup = `
            <g class="tail-feathers">
                <path d="M70,180 C30,160 20,100 80,60 C90,80 100,120 110,150 Z" fill="url(#gradTail-${containerId})" stroke="${darkColor}" stroke-width="1"/>
                <path d="M85,185 C50,140 40,60 110,40 C120,70 130,110 135,160 Z" fill="url(#gradTail-${containerId})" opacity="0.7" stroke="${darkColor}" stroke-width="1"/>
                <path d="M100,190 C70,130 80,40 150,60 C150,90 150,130 140,170 Z" fill="url(#gradTail-${containerId})" opacity="0.5" stroke="${darkColor}" stroke-width="1"/>
                <animateTransform attributeName="transform" type="translate" values="0,0; 2,0; 0,0" dur="2s" repeatCount="indefinite" />
            </g>`;
    } else if (type === 'earth') {
        tailGroup = `
            <g class="tail-feathers">
                <path d="M70,180 L30,120 L60,80 L100,140 Z" fill="${tailFill1}" stroke="#2e2e2e" stroke-width="2"/>
                <path d="M80,180 L50,80 L90,40 L120,140 Z" fill="${tailFill2}" stroke="#2e2e2e" stroke-width="2"/>
                <path d="M95,180 L80,40 L130,20 L145,150 Z" fill="${tailFill1}" stroke="#2e2e2e" stroke-width="2"/>
            </g>`;
    } else if (type === 'air') {
        tailGroup = `
            <g class="tail-feathers">
                <path d="M70,180 C20,160 10,100 70,80 C80,100 90,130 100,160 Z" fill="${tailFill1}" opacity="0.6"/>
                <path d="M85,180 C40,140 30,60 110,50 C120,80 130,110 135,160 Z" fill="${tailFill2}" opacity="0.4"/>
                <path d="M100,180 C70,120 80,30 150,50 C150,80 150,120 140,170 Z" fill="${tailFill1}" opacity="0.2"/>
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,-8; 0,0" dur="4s" repeatCount="indefinite" />
            </g>`;
    }

    const svg = `
    <svg width="100%" height="100%" viewBox="0 0 300 300" ${filterStyle}>
        <defs>
            <linearGradient id="gradBody-${containerId}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${bodyColor};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${darkColor};stop-opacity:1" />
            </linearGradient>
            <linearGradient id="gradTail-${containerId}" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:${tailFill1};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${tailFill2};stop-opacity:1" />
            </linearGradient>
            <filter id="glow-${containerId}">
                 <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                 <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
        <g>
            <!-- Cauda de Galo Profissional -->
            ${tailGroup}
            ${aura}

            <!-- Corpo Anatômico do Galo -->
            <path d="M100,100 
                     C80,80 130,45 170,60 
                     C210,75 220,120 200,170 
                     C180,220 130,235 90,210 
                     C65,190 60,140 100,100" 
                  fill="url(#gradBody-${containerId})" stroke="#0f172a" stroke-width="2.5"/>
            ${bodyMark}
            
            <!-- Detalhe da Asa: no híbrido carrega o elemento herdado -->
            <path class="rooster-wing" d="M125,135 C125,135 175,115 185,165 C155,185 130,170 125,135" 
                  fill="${wingFill}" opacity="0.9" stroke="#0f172a" stroke-width="1.5"/>
            <path d="M140,145 C140,145 170,130 175,160 C155,175 140,165 140,145" 
                  fill="${wingMark}" stroke="none"/>

            <!-- Cabeça de Elite -->
            <g class="rooster-head" transform="translate(155, 45)">
                <!-- Crista de Galo Realista -->
                <path d="M-10,25 C-25,-5 -10,-15 5,5 C10,-15 30,-15 35,10 C45,-10 65,0 55,30 C50,45 20,45 10,40" 
                      fill="#ef4444" stroke="#7f1d1d" stroke-width="2"/>
                
                <!-- Barbela -->
                <path d="M25,55 C20,75 40,75 35,55" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.5"/>
                
                <!-- Rosto -->
                <circle cx="25" cy="40" r="32" fill="url(#gradBody-${containerId})" stroke="#0f172a" stroke-width="2.5"/>
                
                <!-- Bico fechado (estado normal) -->
                <path class="rooster-beak" d="M52,35 L75,42 L52,52 Z" fill="#fbbf24" stroke="#b45309" stroke-width="1.5"/>
                <path class="rooster-beak-line" d="M52,42 L65,42" stroke="#b45309" stroke-width="1" opacity="0.5"/>
                <!-- Bico aberto — só aparece nas expressões do especial -->
                <g class="rooster-beak-open">
                    <path d="M48,30 L86,12 L56,40 Z" fill="#fbbf24" stroke="#b45309" stroke-width="1.2"/>
                    <path d="M48,50 L86,72 L56,44 Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.2"/>
                </g>
                
                <!-- Olho Expressivo -->
                <circle class="rooster-eye-white" cx="35" cy="38" r="7" fill="white"/>
                <circle class="rooster-pupil" cx="37" cy="38" r="4" fill="black"/>
                <circle class="rooster-eye-glint" cx="38" cy="36" r="1.5" fill="white"/>
                <path class="rooster-brow" d="M28,30 L45,34" stroke="black" stroke-width="3" stroke-linecap="round"/>
            </g>

            <!-- Patas com Esporas -->
            <g stroke="#f59e0b" stroke-width="6" stroke-linecap="round" fill="none">
                <!-- Pata Esquerda -->
                <path d="M125,220 L125,260 L105,270 M125,260 L145,270"/>
                <path d="M125,245 L115,245" stroke-width="3"/> <!-- Espora -->
                
                <!-- Pata Direita -->
                <path d="M165,210 L165,250 L145,260 M165,250 L185,260"/>
                <path d="M165,235 L155,235" stroke-width="3"/> <!-- Espora -->
            </g>
        </g>
    </svg>
    `;
    container.innerHTML = svg;
    
    if (isGhost) {
        showDeadEyes(container);
    }
}

const deadEyeX = (cx, cy, r = 6) =>
    `<line x1="${cx - r}" y1="${cy - r}" x2="${cx + r}" y2="${cy + r}" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />
     <line x1="${cx + r}" y1="${cy - r}" x2="${cx - r}" y2="${cy + r}" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />`;

export function showDeadEyes(container) {
    const svg = container.querySelector('svg');
    if (!svg || container.dataset.deadEyes === '1') return;
    container.dataset.deadEyes = '1';

    const head = svg.querySelector('g[transform="translate(155, 45)"]');
    if (head) {
        head.querySelectorAll('circle').forEach(c => c.setAttribute('opacity', '0'));
        head.querySelectorAll('path').forEach(p => {
            const d = p.getAttribute('d') || '';
            if (d.includes('28,30') && d.includes('45,34')) p.setAttribute('opacity', '0');
        });
        const eyes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        eyes.setAttribute('class', 'dead-eyes');
        eyes.innerHTML = deadEyeX(35, 38) + deadEyeX(18, 36, 4);
        head.appendChild(eyes);
        return;
    }

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('transform', 'translate(155, 45)');
    group.setAttribute('class', 'dead-eyes');
    group.innerHTML = deadEyeX(35, 38) + deadEyeX(18, 36, 4);
    const root = svg.querySelector('g');
    if (root) root.appendChild(group);
}

/**
 * Knockout visual + som quando HP chega a 0.
 * @param {string|HTMLElement} containerId
 * @param {'l'|'r'} facing — l jogador, r CPU (espelhado)
 * @param {{ element, color, dna? }|null} rooster — re-render em cinza
 * @param {boolean} [_isPlayerSide] — reservado; o tombo sempre usa blow_chicken
 */
export function applyKnockout(containerId, facing = 'l', rooster = null, _isPlayerSide = false) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container || container.dataset.knockedOut === '1') return;

    container.dataset.knockedOut = '1';
    const koClass = facing === 'r' ? 'anim-ko-r' : 'anim-ko-l';

    if (rooster) {
        const skin = rooster.dna?.skin || 'none';
        const id = container.id || containerId;
        renderAvatar(id, rooster.element, rooster.color, skin, true, fusionLook(rooster));
    } else {
        showDeadEyes(container);
    }

    container.classList.remove('anim-ko-l', 'anim-ko-r');
    container.classList.add(koClass, 'grayscale', 'opacity-60');

    AudioEngine.playBlow();
}
