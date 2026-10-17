# Simulaciones de equilibrio

Resultados del simulador (`npm run simular`) con los valores de `packages/engine/src/rules.ts`. Los bots juegan bien pero no como personas: las cifras marcan tendencias. Lo que importa es lo que sale muy desequilibrado.

## Cómo se simula

Cada partida reproduce el calendario del servidor: producción diaria, acciones del día, comercio, resoluciones el miércoles y el domingo, mantenimiento, ayuda al último, Prestigio en vivo y final con objetivos secretos.

### Bots con personalidad (`packages/engine/src/ai`)

Son los que se usan por defecto y los de las partidas de prueba. Solo ven lo que vería una persona: sus casillas, las vecinas y el Prestigio público. Cada día:

- **Valoran cada recurso** según lo que van a necesitar: mantenimiento, tropas, mejoras y fortificaciones. Lo que les sobra vale poco y lo que les falta, mucho; en la última semana lo guardado deja de valer.
- **Construyen o reclutan** según lo que más rinde: producción por los días que quedan más Prestigio. No reclutan más tropas de las que pueden alimentar y siempre guardan el Pan del domingo.
- **Fortifican** las casillas amenazadas a las que la fortificación salva.
- **Comercian:** publican una oferta con lo que les sobra y aceptan las que les convienen (un socio nuevo da Prestigio).
- **Antes de cada resolución:**
  - Atacan los objetivos que más valen, con una casilla que se mueve y apoyos desde las demás vecinas. El apoyo no sale de su casilla, así que también usan las tropas que dejan de guardia.
  - Refuerzan o apoyan las casillas amenazadas.
  - Llevan el resto hacia la frontera.
- **Persiguen su objetivo secreto** (lo eligen según su personalidad) y la que quiere la obra maestra ahorra para ella.

| Personalidad | Margen de ataque | Prudencia | Contra casas | Manía al líder | Comercio | Especialización | Ejército |
| --- | --- | --- | --- | --- | --- | --- | --- |
| estratega | x1,25 | 0,8 | 0,8 | 0,5 | 0,6 | 0,3 | 1,0 |
| mercader | x1,4 | 0,9 | 0,4 | 0,3 | 1,0 | 0,5 | 0,7 |
| guerrero | x1,1 | 0,6 | 1,3 | 0,6 | 0,3 | 0,2 | 1,6 |
| arquitecta | x1,5 | 1,0 | 0,3 | 0,2 | 0,6 | 1,0 | 0,5 |
| oportunista | x1,2 | 0,7 | 1,1 | 1,0 | 0,5 | 0,3 | 1,1 |

### Bots clásicos (referencia)

Los primeros bots, más simples, siguen disponibles para comparar:

| Estrategia | Qué hace |
| --- | --- |
| equilibrada | Piloto automático equilibrado y ataques con margen (x1,2 a neutrales, x1,5 a casas). |
| constructora | Sube edificios siempre que puede; solo ataca neutrales y con mucho margen. |
| conquistadora | Recluta todo lo posible y ataca con poco margen, también a otras casas. |
| comerciante | Como la equilibrada, y además cada día cambia 10 de lo que más le sobra por 10 de lo que le falte. |
| ausente | Solo el piloto automático: nunca ataca y defiende con +25%. |
| pasiva | No hace nada. |

Comandos:

```bash
npm run simular                                   # 500 partidas de 6 semanas, 4-8 casas, personalidades mezcladas
npm run simular -- --partidas 2000 --modo espejo  # todas estrategas: ¿es justo el reparto inicial?
npm run simular -- --modo todos                   # personalidades y bots clásicos juntos
npm run simular -- --modo clasico                 # solo los bots clásicos
npm run simular -- --estrategias guerrero,mercader
npm run simular -- --semanas 4                    # duración de la partida
npm run simular -- --json datos.json              # además, todos los datos
```

## Hexágonos y una resolución al día (17 de octubre de 2026, fase 0 del sistema de guerra v3)

Primera prueba del nuevo sistema de guerra (`docs/diseno.md`, propuesta v3): casillas hexagonales con 6 vecinas y una resolución cada día en vez de dos por semana. Fortificar dura 4 resoluciones. Las tropas, el terreno y los asedios nuevos aún no están en el simulador; esto solo mide la forma del mapa y el ritmo. Se lanza con `HEX=1 npm run simular-mapa -- 150`.

**Resultado: con resolución diaria hay unas 2,5 veces más batallas entre casas y unas 3 veces más casillas robadas.** El primer choque llega entre el día 6 y el 9, cuando ahora llega el 10 o el 14. Con hexágonos, el mismo mapa deja los castillos a 2 pasos, así que hace falta en torno a un 50% más de casillas para mantenerlos a 3.

| Casas | Ahora (cuadrado, 2/sem) | Hexágonos elegidos (`MAP_LAYOUT_HEX`) | Castillos a ≤2 | 1.er choque (día) | Choques entre casas por semana | Casillas robadas por casa | Líder de la semana 2 gana | Casas con deserciones |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4 | 5x4 + 1 | 6x5 + 2 | 0% | 14 → 9 | 2,6 → 6,6 | 1,9 → 6,2 | 41% → 45% | 9% → 19% |
| 5 | 6x4 + 1 | 7x6 + 5 | 0% | 10 → 9 | 3,3 → 9,7 | 2,0 → 8,1 | 32% → 30% | 7% → 19% |
| 6 | 6x5 + 2 | 8x6 + 6 | 0% | 10 → 6 | 4,4 → 11,2 | 2,3 → 7,2 | 35% → 33% | 5% → 18% |
| 7 | 7x6 + 5 | 9x7 + 10 | 0% | 10 → 7 | 5,0 → 11,8 | 2,3 → 6,8 | 28% → 27% | 6% → 22% |
| 8 | 7x7 + 7 | 10x8 + 14 | 0% | 10 → 6 | 6,1 → 11,1 | 2,5 → 5,4 | 32% → 30% | 6% → 19% |

Tamaños descartados (150 partidas por variante):

- **El mismo mapa en hexágonos** (por ejemplo 5x4 con 4 casas): el 33% de los castillos queda a 2 pasos y el primer choque llega el día 3.
- **Un paso menos** (7x6 con 6 casas, 8x7 con 7, 9x8 con 8): entre un 2% y un 7% de castillos a 2 pasos y choque el día 4 o 5.
- **Más grandes aún** (9x8 con 7 casas, 10x9 con 8): más Prestigio por territorio y más deserciones, sin mejorar el choque.
- **7x5 con 5 casas** daba buenas distancias, pero el generador no lograba salidas justas: el valor de los alrededores de los castillos difería en 1,8 puntos de mediana (el límite es 1,5). Con 7x6 y 5 páramos baja a 1,1.

Lo que queda por ajustar antes de jugar con hexágonos:

- **Deserciones: suben del 5-9% al 15-22% de las casas.** Con más batallas se pierden casillas y Pan a mitad de semana. Empezar a cobrar el coste de estirarse a partir de la 7.ª casilla en vez de la 5.ª las baja al 12-14% (probado con 4, 6 y 8 casas). Se decidirá junto con las tropas nuevas, que cambian el mantenimiento.
- **El Prestigio del ganador sube de unos 51 a 58-68** porque hay más territorio. No cambia quién gana, pero el territorio pesa más que construir; habrá que revisar `PRESTIGE.perTile`.
- El juego de verdad sigue con cuadrícula y dos resoluciones por semana (`GRID` y `RHYTHM` en `rules.ts`) hasta que el mapa hexagonal esté dibujado.

## Mapas más grandes con 7 y 8 casas, y páramos (17 de octubre de 2026, aplicado)

**El problema.** Con 7 y 8 casas el mapa era 6x5 y 6x6. Los castillos quedaban a 2 pasos del vecino (con 4-6 casas, a 3), el 14% de las parejas de castillos estaban a 2 pasos o menos, el primer choque entre casas llegaba una resolución antes y cada casa tenía 3,3-3,5 casillas productivas (con 4-6 casas, unas 4). En la partida de prueba de 8 casas se veían castillos casi pegados.

**Qué dicen otros juegos.**
- *Diplomacy*: la guía de diseño de mapas pide no poner centros de origen de dos potencias juntos, que ninguna potencia esté el doble de expuesta que otra y que un tercio de los centros sean neutrales agrupados en zonas disputadas. [Agar, *Map Design*](https://diplom.org/Zine/F1998M/Agar/mapDesign.html)
- *Civilization*: el tamaño del mapa se elige por número de civilizaciones para mantener la misma tierra por jugador; cuando la densidad cambia, cambia el juego (en mapas pequeños, conquistar ciudades es mucho más decisivo). [CivFanatics, *Map size scaling*](https://forums.civfanatics.com/threads/map-size-scaling.623497/)
- *Small World*: un tablero distinto para cada número de jugadores. [Wikipedia](https://en.wikipedia.org/wiki/Small_World_(board_game))
- *Catan*: una casilla que no produce nada (el desierto) da forma al tablero sin añadir reglas. [Meeple Mountain](https://www.meeplemountain.com/articles/games-we-love-catan)
- *Twilight Imperium*: las casillas sin planetas o con anomalías separan a los jugadores y crean pasillos. [Wiki de TI](https://twilight-imperium.fandom.com/wiki/Anomalies)

De ahí la idea: hacer crecer el mapa para recuperar las distancias de 4-6 casas y rellenar lo que sobra con **páramos**, casillas que no producen, para que el terreno productivo por casa no se dispare.

**Cómo se probó.** `scripts/simular-mapa.ts` (se compila con esbuild como `npm run simular`): 400-600 partidas por variante con bots con personalidad mezclados, de 6 y de 4 semanas. Mide la distancia entre castillos, el primer choque entre casas, los choques, las casillas robadas, el territorio, el Prestigio del ganador, cuánto gana la casa con la mejor y con la peor salida (valor de lo que tiene a 1-2 pasos) y las deserciones.

**Variantes descartadas (8 casas, 6 semanas, 400 partidas):**

| Variante | Productivas por casa | Castillos a ≤2 | Distancia al vecino | Territorio medio | Prestigio del ganador | Páramos tomados |
| --- | --- | --- | --- | --- | --- | --- |
| 6x6 (antes) | 3,5 | 14% | 2,0 | 7,7 | 46,5 | — |
| 7x6 | 4,3 | 7% | 2,5 | 10,4 | 51,7 | — |
| 7x7 sin páramos | 5,1 | 0% | 3,0 | 11,6 | 51,9 | — |
| 8x6 + 6 páramos | 4,3 | 0% | 3,0 | 11,9 | 51,9 | 87% |
| 7x7 + 7 páramos, 3 de Prestigio | 4,3 | 0% | 3,0 | 12,5 | 53,6 | 70% |
| 7x7 + 7 páramos, 0 de Prestigio | 4,3 | 0% | 3,0 | 10,7 | 50,6 | 9% |

- 7x6 no basta: siguen quedando castillos a 2 pasos.
- Sin páramos, el mapa grande da más terreno productivo que con 4-6 casas y el Prestigio sube.
- Un páramo con 3 de Prestigio es una casilla normal sin producción: casi todos lo toman y el Prestigio sube.
- Con 0 de Prestigio nadie lo quiere (9%): no hace de tierra de nadie disputada y la casa con mejor salida gana más (1,2-1,6 veces lo esperado según la tanda).
- Con 1 de Prestigio se toma algo más de la mitad, sobre todo hacia el final, y el resto de cifras queda como con 4-6 casas.

**Lo aplicado** (`MAP_LAYOUT` y `PRESTIGE.perWasteland` en `rules.ts`): 7 casas en 7x6 con 5 páramos y 8 casas en 7x7 con 7 páramos; 1 o 2 páramos también en 4-6 casas, por variedad (apenas cambia nada). El páramo no produce, tiene 2 de guarnición, da 1 de Prestigio y nunca está junto a un castillo. Además, el generador ya no prueba colocaciones al azar hasta acertar: pone primero fortalezas y páramos en los huecos lejos de los castillos. Con eso el reparto es más justo: la diferencia de valor alrededor de los castillos baja a 0,3-0,7 de mediana y 1,2 como mucho (antes se aceptaba hasta 1,5).

**Antes y después, 600 partidas por variante:**

| Casas | Semanas | Mapa | Productivas por casa | Castillos a ≤2 | 1.er choque (resolución) | Choques entre casas | Territorio medio | Prestigio del ganador | Páramos tomados |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4 | 6 | antes 5x4 / ahora + 1 páramo | 4,0 / 3,8 | 0% / 0% | 4 / 4 | 12,4 / 14,5 | 12,1 / 11,4 | 51,7 / 50,8 | — / 97% |
| 6 | 6 | antes 6x5 / ahora + 2 páramos | 4,0 / 3,7 | 0% / 0% | 3 / 3 | 24,3 / 26,1 | 11,1 / 11,2 | 51,8 / 52,3 | — / 77% |
| 7 | 6 | antes 6x5 / ahora 7x6 + 5 | 3,3 / 4,3 | 14% / 0% | 2 / 3 | 33,8 / 31,3 | 9,0 / 11,8 | 48,1 / 53,8 | — / 73% |
| 8 | 6 | antes 6x6 / ahora 7x7 + 7 | 3,5 / 4,3 | 14% / 0% | 2 / 3 | 32,2 / 34,8 | 8,0 / 11,2 | 47,0 / 51,3 | — / 62% |
| 7 | 4 | antes 6x5 / ahora 7x6 + 5 | 3,3 / 4,3 | 14% / 0% | 2 / 3 | 20,5 / 18,4 | 8,3 / 10,8 | 40,2 / 43,6 | — / 62% |
| 8 | 4 | antes 6x6 / ahora 7x7 + 7 | 3,5 / 4,3 | 14% / 0% | 2 / 3 | 19,6 / 21,6 | 7,2 / 10,5 | 38,7 / 42,5 | — / 54% |

Con 7 y 8 casas el territorio y el Prestigio del ganador quedan ahora como con 4-6 casas, y el primer choque llega en la resolución 3 como en el resto. Las guerras no bajan: hay los mismos choques, pero después de una fase de expansión. En el simulador general (500 partidas mezcladas), los rebotes con 7-8 casas bajan de 1,4-3,8 a 0,2 por partida (había tantos ejércitos apiñados que chocaban sin querer).

**Pendiente.** El objetivo secreto «puerto y fortaleza» se cumplía poco y ahora menos (del 7% al 2%): las fortalezas quedan en el centro y los puertos casi siempre en el borde. «Cinco casillas» se cumple algo más (del 20% al 29%). Conviene revisar los dos objetivos.

## Eventos de la semana (versión 1, 17 de octubre de 2026)

20 eventos, uno por semana en un orden fijado por la semilla. Los bots tienen en cuenta los de combate (barro, fervor, Paz del Rey) y el mantenimiento doble o gratis. Comparación con y sin eventos (`--eventos no`), 1000 partidas mezcladas de 6 semanas cada una:

| Dato | Sin eventos | Con eventos |
| --- | --- | --- |
| Personalidades (x lo esperado) | 0,7-1,4 | 0,7-1,3 |
| Diferencia media 1.º - 2.º | 4,7 | 4,7 |
| El líder de la semana 2 gana | 34% | 35% |
| Casas con deserciones | 1% | 5% |
| Prestigio medio del ganador | 49,6 | 50,0 |

Los eventos dan variedad sin decidir partidas. La Paga Atrasada es la que más se nota: obliga a guardar Pan.

## Gran Subasta y cartas (versión 1, 16 de octubre de 2026)

Los bots con personalidad pujan con parte de su Oro según lo que vale cada lote para ellos (más el Prestigio del logro y su objetivo secreto). Usan las cartas de efecto inmediato al momento, y la Tregua y los Tambores el día de la resolución.

| Dato (1000 partidas mezcladas de 6 semanas) | Sin subasta | Con subasta |
| --- | --- | --- |
| Oro sin gastar al final | ~200 | ~130 |
| Oro gastado en la subasta por partida | — | ~457 |
| Lotes ganados por casa | — | 2,0 |
| Cartas usadas por partida | — | 4,9 |
| Prestigio por logros | ~0,3 | ~4 |
| Personalidades (x lo esperado) | 0,7-1,3 | 0,7-1,4 |

Con el Oro gastándose, terminar con 200 de Oro pasó a cumplirse solo el 12% de las veces. Se bajó a 150 (42%). El objetivo nuevo, ganar lotes de la subasta, se cumplía el 63% con 2 lotes y el 35% con 3, que es el que queda.

## Segundo ajuste, con bots con personalidad (16 de octubre de 2026, aplicado)

| Valor | Antes | Ahora | Resultado (1000 partidas mezcladas) |
| --- | --- | --- | --- |
| Objetivo de edificios | Los 5 a nivel 3 (97%) | Sumar 17 niveles (35%) | Probado también "4 a nivel 4" (3%) y "3 a nivel 4" (13%) |
| Objetivo de casillas | 6 casillas (3%) | 5 casillas (15%) | Quien lo cumple gana el 62% (antes, el 87%) |
| Nivel 5 de un edificio | 75+45+40+40 = 200 | 60+35+30+30 = 155 | Obra maestra: 12% → 17%. Se probó también +3 de Prestigio por edificio a nivel 5: apenas cambiaba nada |
| Guarnición de las fortalezas | 10 | 8 | Objetivo fortaleza: 12% → 14% |
| Fortificar | 10 de Piedra | 8 de Piedra | La Piedra sigue sobrando (unos 80); los bots fortifican poco |

Personalidades entre 0,7 y 1,3; especialidades entre 0,9 y 1,1 (2000 en espejo); el líder de la semana 2 gana el 25% (28% en partidas de 4 semanas). El comercio sigue saturado (comercio_con_tres y diez_tratos al 100%): se decide tras la piloto.

## Con bots con personalidad (16 de octubre de 2026)

1000 partidas mezcladas de 6 semanas, 2000 en espejo (todas estrategas) y 1000 con todos los bots.

### Personalidades

| Personalidad | Gana | x lo esperado | Prestigio medio |
| --- | --- | --- | --- |
| guerrero | 21% | 1,3 | 36,8 |
| estratega | 18% | 1,1 | 36,7 |
| oportunista | 16% | 1,0 | 36,2 |
| mercader | 15% | 0,9 | 36,3 |
| arquitecta | 11% | 0,7 | 34,8 |

Contra los bots clásicos, las personalidades ganan entre 1,1 y 2,0 veces lo esperado; los clásicos, entre 0,1 y 1,5 veces. El bot nuevo juega claramente mejor.

### Lo que está bien

- **Hay varias formas de ganar.** Todas las personalidades quedan entre 0,7 y 1,3, sin ninguna dominante.
- **Las partidas son ajustadas.** Entre el primero y el segundo hay de media 4 puntos de Prestigio, y el líder de la semana 2 solo gana una de cada cuatro veces. Con 4 semanas, el 28%: la piloto de 4 semanas sigue abierta hasta el final.
- **Las especialidades iniciales son justas** (0,9-1,1 en espejo).
- **El combate funciona:**
  - Unas 48 órdenes de ataque y 12 de apoyo por partida.
  - El 66% de los ataques toma la casilla.
  - Se roban entre 6 y 19 casillas entre casas según el número de jugadores.
- **Casi nadie sufre deserciones** (1%): el mantenimiento obliga a planificar sin castigar.

### Lo que está desequilibrado

1. **El comercio satura:**
   - Con bots que comercian a menudo (unos 55 tratos por partida), casi todas las casas llegan al tope de Prestigio de comercio: de 5,1 a 5,9 sobre 6.
   - comercio_con_tres y diez_tratos se cumplen el 100% de las veces.
   - Falta saber si las personas comerciarán tanto; la partida piloto lo dirá.
2. **Los objetivos de territorio son casi imposibles, y quien los cumple casi siempre gana:**
   - seis_casillas: se cumple el 2-3% de las veces y gana el 87%.
   - puerto_y_fortaleza: 3-4%, gana el 75%.
   - fortaleza: 11-12%, gana el 82%.
   - Las fortalezas neutrales (10 de guarnición con +75% de defensa) piden unas 22 tropas, y con 5 o más casas el mapa se llena pronto.
3. **edificios_nivel_3 es casi regalado** (96-97%).
4. **La obra maestra no compensa.** Solo la consigue el 9% de quien la persigue, y de ellos gana el 12%. Los niveles 4 y 5 cuestan 305 recursos por +2 de producción y +2 de Prestigio.
5. **Sobra Oro** (unos 200) **y Piedra** (60-75) al final. El Oro tendrá salida en la versión 1.

### Propuestas (sin aplicar)

| Problema | Cambio posible |
| --- | --- |
| Comercio saturado | Esperar a la piloto. Si las personas comercian tanto: socio válido con 15 por lado (ahora 10) y objetivos comercio_con_cuatro y quince_tratos. |
| Objetivos de territorio | seis_casillas → cinco_casillas; fortaleza: guarnición neutral de 10 → 8 |
| edificios_nivel_3 regalado | Cuatro edificios a nivel 4 |
| Obra maestra sin premio | Nivel 5 más barato (60 Madera + 35 Piedra + 30 Hierro + 30 Oro) o +3 de Prestigio por edificio a nivel 5 |
| Piedra sobrante | Fortificar con 8 de Piedra (ahora 10) o que dure 3 resoluciones |

## Ajuste del 16 de octubre de 2026 (aplicado)

### Cambios en rules.ts

| Valor | Antes | Ahora |
| --- | --- | --- |
| Coste de una tropa | 2 Hierro + 1 Pan | 2 Hierro + 2 Pan |
| Mantenimiento | 1 Pan cada 4 tropas | 1 Pan cada 3 tropas |
| Mejoras (Madera + Piedra) | 12+12, 25+25, 40+40, 60+60 | 15+10, 30+20, 50+30, 75+45 |
| Objetivos | oro_100, tropas_30, casilla_ajena (1), dos_puertos, comercio_con_todas | oro_200, tropas_40, casillas_ajenas (3), puerto_y_fortaleza, comercio_con_tres |
| Partida piloto | 2 semanas | 4 semanas |

Para el coste de las tropas se probaron seis combinaciones (800 partidas mezcladas y 800 en espejo cada una):

| Tropa | Mantenimiento | Pan sobrante | Hierro sobrante | Casas con deserciones | Peor especialidad |
| --- | --- | --- | --- | --- | --- |
| 2 Hierro + 1 Pan (antes) | 1 / 4 tropas | ~100 | ~1 | 0% | 0,9 |
| 1 Hierro + 2 Pan | 1 / 2 tropas | ~6 | ~125 | 7% | 0,8 |
| 2 Hierro + 1 Pan | 1 / 2 tropas | ~55 | ~4 | 1% | 0,8 |
| 2 Hierro + 1 Pan | 1 / 3 tropas | ~80 | ~1 | 0% | 0,8 |
| 1 Hierro + 1 Pan | 1 / 2 tropas | ~15 | ~90 | 5% | 0,7 |
| **2 Hierro + 2 Pan** | **1 / 3 tropas** | **~13** | **~18** | **4%** | **0,9 (0,8 con 2000 partidas)** |

### Antes y después (1000 partidas mezcladas de 6 semanas; 2000 en espejo)

| Dato | Antes | Después |
| --- | --- | --- |
| Pan / Madera / Hierro sin gastar (bot equilibrado) | 101 / 150 / 1 | 15 / 89 / 18 |
| Casas con deserciones | 0% | 3% |
| Especialidades (x lo esperado, en espejo) | 0,9-1,1 | 0,8-1,1 |
| oro (100 → 200) cumplido | 96% | 33% |
| tropas (30 → 40) cumplido | 61% | 44% |
| casillas ajenas (1 → 3) cumplido | 55% | 39% |
| puertos (2 puertos → puerto y fortaleza) cumplido | 2% | 9% |
| comercio (todas → 3 casas) cumplido | 4% | 27% |
| El líder de la semana 2 gana (6 semanas) | 48% | 50% |

### Lo que queda

- **La Madera aún sobra** (unos 60-90 al final) y **el Oro se acumula** (casi 200). El Oro tendrá salida en la versión 1 (Gran Subasta y sobornos); la Madera habrá que mirarla después.
- **Atacar sigue rindiendo poco** con los bots (la conquistadora gana 0,3 veces lo esperado). En parte es el bot, que nunca construye; la partida piloto dirá si a las personas les pasa lo mismo.
- **obra_maestra no se cumple nunca** con los bots, que no se especializan. Una persona sí puede; conviene vigilarlo en la piloto.
- **Mina + Mercado es la especialidad algo más floja** (0,8 en espejo): produce los dos recursos que más sobran (Hierro y Oro). Mejorará cuando el Oro tenga uso en la versión 1.
- **Las partidas de 2 semanas se deciden pronto** (el líder de la semana 2 gana el 88%), por eso la piloto pasa a 4 semanas y la de 2 queda como prueba rápida.
- Con todas las casas iguales (espejo), las casillas cambian de dueño una y otra vez entre bots: casillas_ajenas se cumple el 95% de las veces. En partidas mezcladas, el 39%.

## Resultados anteriores al ajuste

### Estrategias (1000 partidas de 6 semanas)

| Estrategia | Gana | x lo esperado | Prestigio medio |
| --- | --- | --- | --- |
| comerciante | 45% | 2,7 | 41,7 |
| equilibrada | 30% | 1,8 | 35,8 |
| constructora | 14% | 0,9 | 32,0 |
| conquistadora | 8% | 0,5 | 25,1 |
| ausente | 0% | 0 | 18,8 |
| pasiva | 0% | 0 | 7,7 |

«x lo esperado»: 1,0 es lo que ganaría por puro azar.

### Lo que estaba bien

- **Las especialidades iniciales son justas.** Con todas las casas iguales (2000 partidas), cada pareja gana entre 0,9 y 1,1 veces lo esperado.
- **Comerciar compensa.** La comerciante gana casi el triple de lo esperado. El comercio es central en el diseño y los números lo respaldan.
- **La partida de 6 semanas no se decide pronto.** El líder tras la semana 2 gana entre el 20% (casas iguales) y el 49% (estrategias mezcladas).
- **El piloto automático sostiene a quien se ausenta** (19 de Prestigio frente a 8 sin piloto), pero nunca le hace ganar.

### Lo que estaba desequilibrado

1. **El Hierro es el único recurso escaso.** Al final quedan de media unos 100 de Pan, 130-150 de Madera y 135-220 de Oro sin gastar, y casi 0 de Hierro. Cada tropa cuesta 2 de Hierro y la mina a nivel 1 da 2 al día. Como a nadie le sobra Hierro, el comercio no puede resolver esa escasez.
2. **El mantenimiento no se nota.** Ninguna casa sufre deserciones, porque el Pan siempre sobra.
3. **El Oro se acumula sin uso** hasta la versión 1, cuando llegarán la subasta y los sobornos. La Riqueza toca techo en 250 de Oro.
4. **Atacar sale caro.** La conquistadora gana la mitad de lo esperado. Además, con casas iguales las casillas cambian de dueño una y otra vez: de 20 a 56 casillas robadas por partida.
5. **Los objetivos secretos son muy desiguales.**
   - Casi regalados: oro_100 (96-100%), tropas_30 (61-75%) y casilla_ajena (55-100%).
   - Casi imposibles: dos_puertos (2%), comercio_con_todas (0-4%) y obra_maestra (0%). En obra_maestra influye que los bots no se especializan; una persona sí lo haría.
6. **La partida de 2 semanas es una carrera corta.** El líder tras la semana 2 gana el 84% de las veces, el 14% se decide por desempate y el ganador acaba con unos 20 de Prestigio.

### Propuestas que salieron de aquí

| Problema | Cambio propuesto en rules.ts |
| --- | --- |
| Hierro escaso y Pan sobrante | Tropa: 1 de Hierro + 2 de Pan (ahora 2 + 1) |
| Mantenimiento sin efecto | 1 de Pan por cada 2 tropas (ahora por cada 4) |
| Madera sobrante y Piedra justa | Mejoras con más Madera que Piedra, por ejemplo 15/10, 30/20, 50/30, 75/45 |
| Objetivos regalados | oro_100 → oro_200; tropas_30 → tropas_40; casilla_ajena → quitar 3 casillas a otras casas |
| Objetivos imposibles | dos_puertos → un puerto y una fortaleza; comercio_con_todas → comerciar con 3 casas distintas |
| Piloto demasiado corto | Hacer la partida piloto de 4 semanas |

Se aplicaron todas; el coste de las tropas acabó en 2 Hierro + 2 Pan y el mantenimiento en 1 Pan cada 3 tropas (ver arriba).
