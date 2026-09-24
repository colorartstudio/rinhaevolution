
import { SKILLS, SkillService } from './js/skills.js';

const mockArenas = [
    { id: 'earth' }, { id: 'water' }, { id: 'air' }, { id: 'fire' }
];

console.log("--- TESTE DE FILTRO DE SKILLS ---");

['fire', 'water', 'earth', 'air'].forEach(element => {
    console.log(`\nTestando Galo de ${element.toUpperCase()} (Lvl 10):`);
    
    mockArenas.forEach(arena => {
        const skills = SkillService.getSkillsForRooster(element, 10, arena.id);
        const ultimate = skills.find(s => s.type === 'ultimate');
        
        if (ultimate) {
            console.log(`  Arena ${arena.id}: ULTIMATE DISPONÍVEL (${ultimate.id})`);
            if (arena.id !== element) {
                console.error(`  ERRO CRÍTICO: Ultimate apareceu na arena errada!`);
            }
        } else {
            console.log(`  Arena ${arena.id}: Ultimate indisponível`);
            if (arena.id === element) {
                console.error(`  ERRO CRÍTICO: Ultimate NÃO apareceu na arena certa!`);
            }
        }
    });
});

console.log("\n--- TESTE DE NÍVEL ---");
const fireSkillsLvl1 = SkillService.getSkillsForRooster('fire', 1, 'fire');
const ultLvl1 = fireSkillsLvl1.find(s => s.type === 'ultimate');
if (ultLvl1) console.log("Galo Lvl 1 na Arena Fire: Ultimate OK");
else console.error("Galo Lvl 1 na Arena Fire: Ultimate FALTOU");

console.log("\n--- TESTE SEM ARENA ---");
const noArena = SkillService.getSkillsForRooster('fire', 10, null);
const ultNoArena = noArena.find(s => s.type === 'ultimate');
if (ultNoArena) console.error("Sem arena: Ultimate APARECEU (Erro)");
else console.log("Sem arena: Ultimate indisponível (OK)");
