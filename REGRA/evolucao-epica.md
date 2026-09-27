# Evolução épica — linhagens e cruzamentos

Contrato de poder para o Laboratório. A fusão de **elementos diferentes** não entrega os dois kits inteiros. Ela cria **uma linhagem nova**, com um especial próprio. A ordem dos pais não importa: Vento + Água é o mesmo galo que Água + Vento.

Dois pais do **mesmo** elemento não viram linhagem nova. O filho herda um elemento e mistura a pintura.

Esta pasta descreve o jogo alvo. O código de fusão atual ainda entrega bicada + especial do segundo elemento. A troca para estas linhagens é o passo seguinte.

## Conta que todo golpe usa

Não muda com a evolução.

- Força = ataque × bônus de arena (1,25 se o elemento **do golpe** for o da arena) × bônus de cor (1,30 no ciclo vermelho > azul > verde > amarelo > vermelho).
- Dano do acerto = 18% da força × multiplicador do golpe.
- Teto: **35% do HP máximo** por acerto. No 1v1 o HP da luta é 400. No 3v3 vale o HP do elenco.
- 3v3: no máximo 45% do HP máximo daquele galo numa rodada de equipe. O excesso vira 5% residual e não mata se ainda houver HP.
- O Escudo de loja anula o acerto e a queimadura/choque/corte enquanto estiver ativo.
- O especial da linhagem esvazia a barra de Ritmo, igual ao especial de arena. Só a bicada básica enche a barra.
- Carga do especial: começa pronta no 1v1 e no 3v3. Depois do uso volta a 0 e pede **2 rodadas** completas. Trocar de arena não apaga essa recarga.

Ataque base (nível 1), sem inflar acima do fogo:

| Linhagem | Ataque | De onde sai |
|---|---:|---|
| Fogo | 100 | elemento puro |
| Terra | 95 | elemento puro |
| Água | 90 | elemento puro |
| Ar | 85 | elemento puro |
| Laser | 100 | o maior dos pais (fogo) |
| Magma | 100 | o maior dos pais (fogo) |
| Cometa | 100 | o maior dos pais (fogo) |
| Maremoto | 95 | o maior dos pais (terra) |
| Avalanche | 95 | o maior dos pais (terra) |
| Elétrico | 90 | o maior dos pais (água) |

HP fora da rinha continua `100 + 10 × nível`. A fusão nasce no nível 1 (110 HP de elenco). Na rinha 1v1 todo mundo luta com 400 HP.

## Puros

O especial puro só abre na arena do próprio elemento.

| Galo | Especial | Dano | Efeito | Vantagem | Limite |
|---|---|---|---|---|---|
| Fogo | 2,5x | um acerto, teto 35% | queima 2 rodadas: 8% depois 3% do HP máximo | maior ataque e a queima mais forte | não cura e não defesa |
| Terra | 2,4x | um acerto, teto 35% | defesa ×2 por 2 rodadas, contra qualquer elemento | segura o próximo golpe | ataque abaixo do fogo |
| Água | 2,2x | um acerto, teto 35% | cura 30% do HP máximo no 1º uso; cada Dilúvio seguinte cura 30% a menos (30 → 21 → 14,7 …) | única cura grande | o poder cai a cada uso na mesma luta |
| Ar | 2x → 1x | 5 acertos | cada acerto perde 20% do multiplicador até 1x | muitos toques, enche pressão | começa mais fraco que o fogo e não tem efeito depois do golpe |

## Cruzamentos

O especial da linhagem abre na arena de **qualquer um dos dois pais**. Fora das duas, o botão mostra "Fora da arena".

O golpe da linhagem **substitui** a bicada e o especial herdados dos pais. Não soma os dois especiais no mesmo turno.

### Ar + Água — Galo Elétrico

Choque. Faísca azul e branca no impacto, com o galo alvo de olho arregalado antes do raio.

| | |
|---|---|
| Ataque | 90 |
| Bicada | 1x, 0 MP. Sem efeito extra. |
| Especial **Curto-circuito** | 2,3x. Um acerto. Arenas: ar ou água. |
| Efeito | Choque por 1 rodada: o próximo golpe **do alvo** sai a 0,85x. Não é atordoamento (ele ainda age). |
| Vantagem | Abre em duas arenas. Pune quem ia soltar o golpe forte no turno seguinte. |
| Limite | Ataque 90. O choque é só no próximo golpe, e some se o alvo passar a vez. Não queima e não cura. |

Exemplo no 1v1, sem bônus de cor, arena de água (força com +25%): ataque 90 × 1,25 = 112,5 de força. 18% × 2,3 ≈ 46 de dano, bem abaixo do teto de 140 (35% de 400).

### Fogo + Água — Galo Laser

Feixe fino. Flash no ponto de contato e o alvo recua a cabeça antes do corte.

| | |
|---|---|
| Ataque | 100 |
| Bicada | 1x, 0 MP. |
| Especial **Corte de luz** | 2,4x. Um acerto. Arenas: fogo ou água. |
| Efeito | Ignora uma defesa dobrada. Se o alvo está com defesa ×2 (especial da terra ou equivalente), este golpe calcula como defesa ×1. Não atravessa o Escudo de loja. |
| Vantagem | O único golpe que fura a muralha da terra sem aumentar o teto de 35%. Ataque de fogo. |
| Limite | Sem queima e sem a cura do Dilúvio. Fora das arenas de fogo e água o corte fica trancado. |

### Fogo + Terra — Galo Magma

Lava e poeira. A rocha cai em brasa e a nuvem sobe depois do impacto.

| | |
|---|---|
| Ataque | 100 |
| Bicada | 1x, 0 MP. |
| Especial **Poça de lava** | 2,4x. Um acerto. Arenas: fogo ou terra. |
| Efeito | Queima curta: 5% do HP máximo na rodada seguinte e 2% na outra. No mesmo uso, o próprio galo ganha defesa ×1,5 por 1 rodada. |
| Vantagem | Ataque de fogo com um resto de muralha. Serve para trocar golpe e não sair nu. |
| Limite | A queima é mais fraca que a do fogo puro (8% + 3%). A defesa é mais curta e menor que a da terra (×2 por 2 rodadas). |

### Fogo + Ar — Galo Cometa

Rastro de fogo no vento. Três passagens, cada uma mais fraca.

| | |
|---|---|
| Ataque | 100 |
| Bicada | 1x, 0 MP. |
| Especial **Rastro** | 3 acertos: 2,2x, depois 1,76x, depois 1,4x. Arenas: fogo ou ar. |
| Efeito | Não há queimadura depois. O dano está nos três toques. Cada toque respeita o teto de 35% sozinho. |
| Vantagem | Pressão rápida com ataque de fogo. Bom quando a arena troca para fogo ou ar no meio da luta. |
| Limite | Não tem os 5 acertos do ar puro nem a queima do fogo. A soma dos três pode ser alta, mas o teto por acerto e o teto de 45% no 3v3 continuam valendo. |

### Terra + Água — Galo Maremoto

Onda de pedra. O alvo é coberto e a cabeça recua antes da onda fechar.

| | |
|---|---|
| Ataque | 95 |
| Bicada | 1x, 0 MP. |
| Especial **Quebra-mar** | 2,3x. Um acerto. Arenas: terra ou água. |
| Efeito | Atolado por 1 rodada: o próximo golpe do alvo sai a 0,80x. O maremoto cura **12%** do HP máximo uma vez por uso (não decai, e não chega perto dos 30% da água). |
| Vantagem | Segura o ritmo do rival e recupera um pouco, nas arenas de terra ou água. |
| Limite | Sem defesa dobrada. A cura é pequena de propósito, para não copiar o Dilúvio. |

### Terra + Ar — Galo Avalanche

Pedra dentro do redemoinho. Poeira fecha o alvo por um instante e depois dissipa.

| | |
|---|---|
| Ataque | 95 |
| Bicada | 1x, 0 MP. |
| Especial **Nuvem de pedra** | 2,2x. Um acerto. Arenas: terra ou ar. |
| Efeito | Poeira por 1 rodada: o próximo golpe **recebido** pelo avalanche tem 25% de chance de errar (desvio). Não é o desvio de 40% do ar puro, e só vale um golpe. |
| Vantagem | Troca arena entre terra e ar sem ficar sem especial, e ainda pode negar um retorno. |
| Limite | Sem os 5 acertos da tempestade e sem a defesa da terra. O desvio é um teste só. |

## O que a linhagem não faz

- Não soma o especial do pai com o da mãe no mesmo turno.
- Não nasce com ataque acima de 100.
- Não ignora o teto de 35% nem o teto de 45% do 3v3.
- Não ignora o Escudo de loja.
- Não cura 30% (isso continua exclusivo da água pura), exceto o maremoto com 12%.
- Não ganha os dois bônus de arena no mesmo acerto. O +25% olha o elemento daquele golpe.
- A cor segue o ciclo atual. A linhagem não cria uma cor nova.
