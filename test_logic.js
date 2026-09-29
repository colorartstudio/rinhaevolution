
import { SKILLS, SkillService } from './js/skills.js';
import { describeFusion, buildFusionSkill } from './js/fusion-abilities.js';

const mockArenas = [
    { id: 'earth' }, { id: 'water' }, { id: 'air' }, { id: 'fire' }
];

console.log("--- TESTE DE FILTRO DE SKILLS ---");

['fire', 'water', 'earth', 'air'].forEach(element => {
    console.log(`\nTestando Galo de ${element.toUpperCase()} (Lvl 10):`);
    
    mockArenas.forEach(arena => {
        const skills = SkillService.getSkillsForRooster(element, 10, arena.id);
        const ultimate = skills.find(s => s.type === 'ultimate');
        const locked = Boolean(ultimate?.arenaLocked);
        const expectLocked = arena.id !== element;
        if (!ultimate) console.error(`  ERRO: Ultimate sumiu na arena ${arena.id}`);
        else if (locked !== expectLocked) console.error(`  ERRO: trava ${locked} na arena ${arena.id}`);
        else console.log(`  Arena ${arena.id}: ${locked ? 'trancado' : 'liberado'} (${ultimate.id})`);
    });
});

console.log("\n--- TESTE DE NÍVEL ---");
const fireSkillsLvl1 = SkillService.getSkillsForRooster('fire', 1, 'fire');
const ultLvl1 = fireSkillsLvl1.find(s => s.type === 'ultimate' && !s.arenaLocked);
if (ultLvl1) console.log("Galo Lvl 1 na Arena Fire: Ultimate OK");
else console.error("Galo Lvl 1 na Arena Fire: Ultimate FALTOU");

console.log("\n--- TESTE SEM ARENA ---");
const noArena = SkillService.getSkillsForRooster('fire', 10, null);
const ultNoArena = noArena.find(s => s.type === 'ultimate');
if (ultNoArena && !ultNoArena.arenaLocked) console.error("Sem arena: Ultimate APARECEU liberado (Erro)");
else console.log("Sem arena: Ultimate trancado (OK)");

console.log("\n--- FUSÃO HÍBRIDA ---");
const pairs = [['fire', 'water', 'steam_burst'], ['fire', 'earth', 'magma_eruption'], ['fire', 'air', 'fire_hurricane'], ['water', 'earth', 'mud_swamp'], ['water', 'air', 'storm'], ['earth', 'air', 'sand_tornado']];
pairs.forEach(([body, second, id]) => {
    ['fire', 'water', 'earth', 'air'].forEach(arena => {
        const skills = SkillService.getSkillsForRooster(body, 10, arena, second);
        const ults = skills.filter(s => s.type === 'ultimate');
        const basics = skills.filter(s => s.forgedBasic);
        const fusion = ults.find(s => s.id === id);
        const old = ults.some(s => s.id.endsWith('-arena'));
        const open = fusion && !fusion.arenaLocked;
        const shouldOpen = fusion?.arenaReq?.includes(arena);
        if (ults.length !== 1 || !fusion || old || basics.length < 2 || open !== shouldOpen) {
            console.error(`  ERRO ${body}+${second} @ ${arena}`, { ults: ults.map(s => s.id), basics: basics.length, open, shouldOpen });
        }
    });
    const spec = describeFusion(body, second);
    if (spec?.id !== id) console.error('  assinatura errada', body, second);
    else console.log(`  ${body}+${second} → ${id} OK`);
});

const steam = buildFusionSkill('fire', 'water', 'water');
if (steam?.charge !== 2 || steam.arenaLocked) console.error('Vapor na água deveria estar pronto, carga 2');
else console.log('Vapor na arena de água: liberado, carga 2');

const evo = describeFusion('earth', 'earth');
if (evo?.id !== 'ancient_earth' || evo.passive !== 'wall') console.error('Terra+Terra deveria ser Terra Ancestral');
else console.log('Terra+Terra → Muralha Ancestral OK');

const pureFire = SkillService.getSkillsForRooster('fire', 10, 'fire');
if (pureFire.some(s => s.fusionId)) console.error('Galo puro ganhou fusão');
else console.log('Galo puro sem fusão OK');
