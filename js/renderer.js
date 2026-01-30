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
    let tailPath = ""; 
    let anim = "";

    if (type === 'fire') {
        tailPath = `<path d="M60,180 C30,140 10,80 70,60 C80,30 110,10 140,50 C160,10 200,30 180,90 C220,80 230,130 190,160 L140,190 Z" fill="url(#gradTail-${containerId})" filter="url(#glow-${containerId})"/>`;
        anim = `<animate attributeName="d" dur="0.2s" repeatCount="indefinite" values="M60,180 C30,140 10,80 70,60 C80,30 110,10 140,50 C160,10 200,30 180,90 C220,80 230,130 190,160 L140,190 Z; M60,180 C35,145 15,85 75,65 C85,35 115,15 140,50 C160,15 200,35 185,95 C220,85 230,130 190,160 L140,190 Z; M60,180 C30,140 10,80 70,60 C80,30 110,10 140,50 C160,10 200,30 180,90 C220,80 230,130 190,160 L140,190 Z"/>`;
    } else if (type === 'water') {
        tailPath = `<path d="M50,180 C30,120 80,120 60,80 C50,40 100,50 120,20 C140,60 180,40 180,100 C180,150 160,160 140,190 Z" fill="url(#gradTail-${containerId})" stroke="${darkColor}" stroke-width="2"/>`;
        anim = `<animateTransform attributeName="transform" type="skewX" values="0;3;0" dur="2s" repeatCount="indefinite" />`;
    } else if (type === 'earth') {
        tailPath = `<path d="M60,180 L40,120 L70,100 L80,50 L120,80 L150,40 L160,100 L140,190 Z" fill="${tailFill1}" stroke="#2e2e2e" stroke-width="2"/>`;
    } else if (type === 'air') {
        tailPath = `<path d="M80,180 C40,160 20,120 60,100 C40,60 80,40 100,70 C120,30 160,40 150,90 C180,100 170,150 140,180 Z" fill="${tailFill1}" opacity="0.8"/>`;
        anim = `<animateTransform attributeName="transform" type="translate" values="0,0; 0,-5; 0,0" dur="3s" repeatCount="indefinite" />`;
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
            ${anim ? `<g>${tailPath}${anim}</g>` : tailPath}
            <path d="M100,100 C80,80 130,50 160,60 C190,70 210,110 190,160 C170,210 130,220 90,200 C70,180 60,140 100,100" fill="url(#gradBody-${containerId})" stroke="#1e293b" stroke-width="2"/>
            <path d="M120,130 C120,130 170,110 180,160 C150,180 130,160 120,130" fill="${darkColor}" stroke="#1e293b" stroke-width="2"/>
            <g transform="translate(140, 50)">
                <path d="M0,30 C-10,0 20,-10 30,10 C40,-5 60,20 40,40" fill="#dc2626" stroke="black" stroke-width="2"/>
                <circle cx="20" cy="35" r="30" fill="url(#gradBody-${containerId})" stroke="#1e293b" stroke-width="2"/>
                <path d="M45,30 L65,35 L45,45 Z" fill="#ffd700" stroke="black" stroke-width="1"/>
                <path d="M25,25 L40,30" stroke="black" stroke-width="3" stroke-linecap="round"/>
                <circle cx="30" cy="35" r="4" fill="black"/>
            </g>
            <path d="M120,210 L120,250 L100,260 M120,250 L140,260" stroke="#ffd700" stroke-width="6" stroke-linecap="round" fill="none"/>
            <path d="M160,200 L160,240 L140,250 M160,240 L180,250" stroke="#ffd700" stroke-width="6" stroke-linecap="round" fill="none"/>
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
