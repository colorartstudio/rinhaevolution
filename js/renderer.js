import { ELEMENTS, COLORS, SKINS } from './state.js';

export function renderAvatar(containerId, type, colorKey, skinKey = 'none') {
    let container = document.getElementById(containerId + '-avatar');
    if (!container) container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    let bodyColor = '#cbd5e1'; 
    let darkColor = '#64748b';
    
    if (colorKey && COLORS[colorKey]) { 
        bodyColor = COLORS[colorKey].hex; 
        darkColor = COLORS[colorKey].dark; 
    }
    
    const elData = ELEMENTS[type];
    if (!elData) return;

    const skin = SKINS[skinKey] || SKINS.none;
    const filterStyle = skin.filter ? `style="filter: ${skin.filter}"` : "";

    const tailFill1 = elData.tailColor1; 
    const tailFill2 = elData.tailColor2;
    
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

            <!-- Corpo Anatômico do Galo -->
            <path d="M100,100 
                     C80,80 130,45 170,60 
                     C210,75 220,120 200,170 
                     C180,220 130,235 90,210 
                     C65,190 60,140 100,100" 
                  fill="url(#gradBody-${containerId})" stroke="#0f172a" stroke-width="2.5"/>
            
            <!-- Detalhe da Asa -->
            <path d="M125,135 C125,135 175,115 185,165 C155,185 130,170 125,135" 
                  fill="${darkColor}" opacity="0.8" stroke="#0f172a" stroke-width="1.5"/>
            <path d="M140,145 C140,145 170,130 175,160 C155,175 140,165 140,145" 
                  fill="rgba(0,0,0,0.2)" stroke="none"/>

            <!-- Cabeça de Elite -->
            <g transform="translate(155, 45)">
                <!-- Crista de Galo Realista -->
                <path d="M-10,25 C-25,-5 -10,-15 5,5 C10,-15 30,-15 35,10 C45,-10 65,0 55,30 C50,45 20,45 10,40" 
                      fill="#ef4444" stroke="#7f1d1d" stroke-width="2"/>
                
                <!-- Barbela -->
                <path d="M25,55 C20,75 40,75 35,55" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.5"/>
                
                <!-- Rosto -->
                <circle cx="25" cy="40" r="32" fill="url(#gradBody-${containerId})" stroke="#0f172a" stroke-width="2.5"/>
                
                <!-- Bico Forte -->
                <path d="M52,35 L75,42 L52,52 Z" fill="#fbbf24" stroke="#b45309" stroke-width="1.5"/>
                <path d="M52,42 L65,42" stroke="#b45309" stroke-width="1" opacity="0.5"/>
                
                <!-- Olho Expressivo -->
                <circle cx="35" cy="38" r="7" fill="white"/>
                <circle cx="37" cy="38" r="4" fill="black"/>
                <circle cx="38" cy="36" r="1.5" fill="white"/>
                <path d="M28,30 L45,34" stroke="black" stroke-width="3" stroke-linecap="round"/>
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
}

export function showDeadEyes(container) {
    const svg = container.querySelector('svg');
    if(svg) {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("transform", "translate(140, 50)");
        group.innerHTML = `<line x1="15" y1="30" x2="25" y2="40" stroke="black" stroke-width="4" stroke-linecap="round" /><line x1="25" y1="30" x2="15" y2="40" stroke="black" stroke-width="4" stroke-linecap="round" />`;
        svg.querySelector('g').appendChild(group);
    }
}
