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

## Mapa con geografía y Prado (21 de octubre de 2026, fase 1 del bloque 1, aplicado)

Generador nuevo (`generateGeographicMap`, valores en `MAP_GEN`): altura y humedad con ruido, costa en dos lados opuestos, ajuste de salida y pulido de justicia. El de antes se compara con `--geografia no`.

**Mapas** (40 por número de casas, hexágonos). «Vecinas iguales»: parte de las parejas de neutrales vecinas del mismo tipo. «Diferencia de entorno»: valor de alrededor del castillo mejor situado menos el del peor (mediana y máximo).

| Casas | Vecinas iguales (antes → ahora) | Diferencia de entorno (antes → ahora) | Recursos básicos que faltan a 2 pasos por castillo |
| --- | --- | --- | --- |
| 4 | 11% → 22% | 0,7 (1,2) → 0,4 (1,2) | 0,03 → 0,03 |
| 5 | 11% → 21% | 1,1 (1,6) → 0,4 (0,7) | 0,12 → 0,01 |
| 6 | 12% → 20% | 0,7 (1,1) → 0,4 (0,8) | 0,13 → 0 |
| 7 | 14% → 22% | 0,9 (1,4) → 0,5 (1,0) | 0,20 → 0,01 |
| 8 | 14% → 25% | 1,0 (1,8) → 0,6 (1,4) | 0,13 → 0,01 |

Cumple las dos condiciones de la fase: entre un 60% y un 100% más de vecinas del mismo terreno, y castillos más igualados que antes. Elegir el mapa solo por justicia deshacía la geografía (13-18% de vecinas iguales), así que el generador premia también lo agrupado (`clusterWeight` 20) con manchas de ruido de 3,5 casillas.

**Partidas** (1.500 mezcladas de 6 semanas, 4-8 casas, mismas semillas):

| Dato | Mapa de antes | Con geografía |
| --- | --- | --- |
| El líder de la semana 2 gana | 29% | 30% |
| Casas con deserciones | 15% | 12% |
| Prestigio medio del ganador | 64,7 | 64,6 |
| Diferencia media 1.º - 2.º | 8,0 | 8,5 |
| Combates entre casas (6 casas) | 65,9 | 72,8 |
| Gana la guerrera / la arquitecta | 22% / 10% | 20% / 10% |
| Objetivo «puerto y montaña» cumplido | 36% | 28% |

- **Campos y Prado.** Con los campos al 15% y ese 5% hecho Prado, las deserciones subían del 15% al 19% (500 partidas): falta Pan. Se quedan al 20% y el Prado sale solo de la mitad de los páramos.
- **Objetivo «puerto y fortaleza».** Con la geografía, los puertos quedan en la costa y las fortalezas tierra adentro: bajó del 16% al 13% (500 partidas). Se cambia por «puerto y montaña», que se cumple un 28-29%, como «fortaleza» (31%).
- Las travesías por mar bajan (0,5 → 0,1 por partida): con los puertos en dos costas, casi nunca se tienen dos a la vez.

## Prestigio por casilla de 3 a 2 (21 de octubre de 2026, fase 0 del bloque 1, aplicado)

`PRESTIGE.perTile` pasa de 3 a 2 (fortaleza 5 y páramo 1, igual). 500 partidas mezcladas de 6 semanas, de 4 a 8 casas, antes y después con las mismas semillas:

| Dato | Con 3 | Con 2 |
| --- | --- | --- |
| Prestigio medio del ganador | 71,8 | 64,6 |
| Territorio medio por casa | 15,7-19,4 | 11,3-13,8 |
| Diferencia media 1.º - 2.º | 9,3 | 8,1 |
| Partidas decididas por desempate | 4% | 7% |
| El líder de la semana 2 gana | 31% | 31% |
| Casas con deserciones | 14% | 15% |
| Gana la guerrera / la arquitecta | 20% / 12% | 19% / 12% |
| Combates entre casas (6 casas) | 73,1 | 72,7 |

El ganador baja unos 7 puntos y el territorio deja de pesar tanto frente a edificios, riqueza y comercio, sin que cambie cuánto se combate ni quién gana. La arquitecta sigue floja (0,7 veces lo esperado): no era cosa del territorio. Deja margen para que la geografía (fase 1) y el Prado no inflen el Prestigio.

## Recursos y usos del Oro (20 de octubre de 2026, bloque 5, sin aplicar)

300 partidas por variante, de 4 a 8 casas y 6 semanas. Todas las variantes con algo nuevo llevan el Oro en las mejoras (`--oro-mejora 5,10,20,0`, que suma Oro a los niveles 2, 3 y 4; el 5 ya pedía 30).

| Variante | Oro sin gastar (por casa) | Oro en la subasta (por partida) | Casas con deserciones | Mesnada reclutada | Guerrero / arquitecta (x esperado) |
| --- | --- | --- | --- | --- | --- |
| Hoy | 170 | 388 | 14% | 648 | 1,3 / 0,7 |
| **Oro en las mejoras 5/10/20/30** | 116 | 264 | 13% | 646 | 1,5 / 0,6 |
| Oro en las mejoras 10/20/30/40 | 78 | 165 | 13% | 637 | 1,4 / 0,6 |
| + Corona que compra y vende, precio frente al Oro | 83 | 55 | 32% | 570 | 1,0 / 0,7 |
| + Corona que compra y vende, precio ×2 | 240 | 789 | 4% | 383 | 1,4 / 0,4 |
| + Corona, precio frente a la media ×2, compra a 0,4 | 157 | 271 | 32% | 580 | 1,6 / 0,4 |
| **+ Corona que solo vende, precio frente a la media ×2** | 106 | 224 | 14% | 647 | 1,5 / 0,6 |
| **+ Mercenarios de alquiler** | 85 | 245 | 11% | 644 | 1,3 / 0,7 |
| + Mercenarios con soldada | 73 | 230 | 11% | 644 | 1,5 / 0,7 |
| + Corona (frente al Oro) y alquiler, Riqueza hasta 10 / hasta 5 | 68 / 67 | 43 / 43 | 31% | 571 | 0,9 / 0,7 |

- Si la Corona compra, los bots le venden el Pan y el Hierro para juntar Oro y no pueden mantener las tropas; con precios altos, venderle es una fábrica de Oro (2.173 por partida). **Elegido: la Corona solo vende.** Se gastan unos 106 de Oro por partida en ella, sobre todo en Madera.
- Mercenarios: 34 por partida (203 de Oro) de alquiler y 41 (293 de Oro) con soldada; ninguno cambia el equilibrio. **Elegido: alquiler.**
- Riqueza: con los usos nuevos nadie llega al tope, así que bajarlo no cambia nada. **Se queda como hoy.**

Madera y Piedra (con el Oro en las mejoras, la fortificación hasta que la atacan y 2 de Piedra de mantenimiento):

| Variante | Madera / Piedra sin gastar | Prestigio por edificios | «niveles 17» cumplido | Guerrero / arquitecta |
| --- | --- | --- | --- | --- |
| Mejoras como hoy | 96 / 77 | 10,5 | 26% | 1,5 / 0,6 |
| **+15% de Madera y Piedra** | 73 / 58 | 10,3 | 12% | 1,6 / 0,6 |
| +30% | 56 / 42 | 9,9 | 7% | 1,8 / 0,6 |

- **Elegido: +15%**, con el objetivo «niveles 17» a 16 (sin simular todavía).

## Mantenimiento de fortificaciones (19 de octubre de 2026, bloque 4, sin aplicar)

La fortificación que dura hasta que atacan la casilla necesita un freno. Se probó un mantenimiento cada domingo por casilla fortificada (`FORTIFY_UPKEEP`; las casas pagan las de frontera y quitan las demás; si no llega, se desmantelan). 300 partidas por variante, con `--fortificar-hasta-ataque si --mantener-fortificacion piedra:N`. Las variantes «atrincheradas» (`--atrincherar pares`) hacen que las casas pares fortifiquen toda su frontera cada día, como haría una persona que se encierra.

| Variante | Casillas-noche fortificadas | Mantenimiento pagado / desmanteladas | Piedra sin gastar (arquitecta) | Atrincheradas: pagado / desmanteladas | Casas pares atrincheradas (x esperado) |
| --- | --- | --- | --- | --- | --- |
| Hoy (4 noches) | 155 | — | 82 | — | 0,3 |
| Hasta que la atacan, gratis | 261 | 0 / 0 | 97 | 0 / 0 | 0,3 |
| 1 Piedra | 244 | 37 / 2 | 90 | 42 / 15 | 0,4 |
| **2 Piedra** | 242 | 73 / 3 | 81 | 68 / 21 | 0,4 |
| 3 Piedra | 238 | 105 / 3 | 75 | 83 / 26 | 0,4 |
| 4 Piedra | 236 | 138 / 4 | 71 | 96 / 30 | 0,4 |
| 2 Oro | 247 | 75 / 2 | 95 | 108 / 5 | 0,3 |
| 4 Oro | 246 | 150 / 2 | 99 | 216 / 5 | 0,3 |

- Atrincherarse no compensa a los bots ni gratis: las casas que fortifican toda la frontera ganan 0,3 veces lo esperado frente a 1,6 las demás. Se gastan la Piedra y dejan de construir.
- El Oro no frena: sobra tanto que casi nadie desmantela (5 por partida con las casas atrincheradas). La Piedra sí: con 2 se desmantelan 21 por partida.
- Con 2 de Piedra, la Piedra sin gastar vuelve a la de hoy (81 frente a 82) y las fortificaciones siguen durando un 55% más que hoy. Ninguna variante cambia el equilibrio entre personalidades ni la bola de nieve.
- **Elegido: 2 de Piedra por casilla fortificada cada domingo.**

## Repetición, avisos y órdenes en cola (18 de octubre de 2026, fase 5 del sistema de guerra v3, aplicado)

No cambia valores del juego: añade la repetición de la noche, los avisos y las órdenes en cola. La única regla nueva es que una orden sale con las tropas que queden en su casilla. El simulador la aplica igual que el servidor (`fitOrders` antes de `resolveCampaign`). Con 100 partidas de 6 semanas las cifras siguen en la línea de la fase 4: 6,1 Capitanes capturados por partida, el líder de la semana 2 gana el 21% y el Prestigio medio del ganador es 72,5. Los bots no usan la cola; lo que aporte se verá en la partida piloto.

## Capitán y Gloria (18 de octubre de 2026, fase 4 del sistema de guerra v3, aplicado)

600 partidas de 6 semanas con hexágonos, resolución diaria, terreno, tipos de tropa y asedios en ambas columnas (`npm run simular -- --partidas 600`, `--capitan no` para comparar).

| Dato (por partida) | Sin Capitán ni Gloria | Con Capitán y Gloria |
| --- | --- | --- |
| Combates entre casas (4 / 8 casas) | 30,9 / 65,2 | 39,2 / 82,9 |
| Ataques que toman la casilla | 79% | 72% |
| Capitanes capturados | — | 6,4 |
| Arquitecta (veces lo esperado) | 0,5 | 0,7 |
| Guerrero (veces lo esperado) | 1,3 | 1,3 |
| El líder de la semana 2 gana | 29% | 27% |
| Prestigio medio del ganador | 64,8 | 72,3 |

Lo que sale: la Gloria empuja a pelear (un 25% más de batallas) sin que gane siempre el más agresivo, porque el +2 del Capitán también defiende y el honor premia a quien cae ante una fuerza muy superior. La arquitecta mejora porque su Capitán defiende el castillo. El Prestigio del ganador sube unos 7 puntos: hay que vigilar la inflación del marcador.

Veteranos (tropas que ganan experiencia) quedan aplazados: las tropas de una casilla se juntan en un solo número, así que no hay "grupo" que recuerde sus batallas. Hace falta otro modelo de datos.

## Asedios (18 de octubre de 2026, fase 3b del sistema de guerra v3, aplicado)

600 partidas de 6 semanas con hexágonos, resolución diaria, terreno y tipos de tropa en ambas columnas (`npm run simular -- --partidas 600`, `--asedios no` para comparar).

| Dato (por partida) | Sin asedios | Con asedios |
| --- | --- | --- |
| Órdenes de asedio | — | 124,7 |
| Noches de asedio (a castillos) | — | 86,9 (4,5) |
| Ataques que toman la casilla | 78% | 79% |
| Combates entre casas (4 / 6 / 8 casas) | 31,1 / 57,6 / 65,6 | 30,9 / 59,3 / 65,2 |
| Objetivo fortaleza / puerto y fortaleza | 29% / 15% | 30% / 17% |
| Casas con deserciones | 13% | 14% |
| El líder de la semana 2 gana | 30% | 29% |
| Prestigio medio del ganador | 62,6 | 64,8 |

Variantes probadas y descartadas:

- **Sitiar también casillas fortificadas, y que dejen de producir** (la propuesta original): la arquitecta, que se defiende fortificando, bajaba de 0,7 a 0,5 veces lo esperado y el guerrero subía a 1,4-1,5. Las deserciones subían del 13% al 16%.
- **Murallas que caen más despacio** (12,5% por noche): el mismo desequilibrio. El problema era qué se podía sitiar, no la velocidad.
- **Sin asedio a castillos:** apenas cambia nada (los bots rodean castillos 4,5 noches por partida). Se mantiene porque es lo que más presión pone entre personas.

Lo que queda: la arquitecta sigue algo por debajo (0,5-0,6 frente a 0,7 sin asedios) y el guerrero ronda 1,3. Son bots con reglas sencillas; lo veremos en la partida piloto.

## Tipos de tropa (18 de octubre de 2026, fase 3 del sistema de guerra v3, aplicado)

Con hexágonos, resolución diaria y terreno en las dos columnas; la segunda añade Jinetes y Catapultas (`UNITS` en `rules.ts`). Se lanza con `npm run simular -- --partidas 300` y `--tropas no` para comparar.

| Dato (por partida) | Solo Mesnada | Con tipos de tropa |
| --- | --- | --- |
| Reclutadas: Mesnada / Jinetes / Catapultas | 738 / 0 / 0 | 649 / 67 / 15 |
| Combates entre casas (4 / 6 / 8 casas) | 35,4 / 54,6 / 58,9 | 37,8 / 58,1 / 65,8 |
| Ataques que toman la casilla | 80% | 77% |
| Guerrero, veces lo esperado | 1,4 | 1,3 |
| Casas con deserciones | 11% | 13% |
| Prestigio medio del ganador | 63,9 | 62,4 |

- **Los bots reclutan pocos jinetes y catapultas** (9% y 2% de las tropas): eligen por reglas sencillas. Lo que importa es que ningún tipo desequilibre la partida, y no lo hace. En una primera prueba con la mitad de jinetes el resultado fue el mismo.
- **Hay algo más de guerra entre casas** (+6%), sobre todo con 8 casas, porque los jinetes hacen rentables ataques que antes no salían.
- **Las catapultas abren las fortalezas:** el objetivo "puerto y fortaleza" se cumple un poco más (15% → 18%).
- Las deserciones suben un poco (11% → 13%) porque las catapultas comen doble.

## Terreno que cuenta (17 de octubre de 2026, fase 2 del sistema de guerra v3, aplicado)

Hexágonos y resolución diaria en las dos columnas; la segunda añade el terreno (`TERRAIN` en `rules.ts`): bosque y cantera +25% de defensa, montaña +50%, emboscada en el bosque, atalaya en la montaña, caminos de dos casillas por noche y travesía de puerto a puerto. Se lanza con `npm run simular -- --partidas 300` y `--terreno no` para comparar.

| Dato (por partida) | Sin terreno | Con terreno |
| --- | --- | --- |
| Combates entre casas (4 / 6 / 8 casas) | 38,0 / 68,9 / 66,6 | 35,3 / 54,6 / 58,9 |
| Casillas robadas (4 / 6 / 8 casas) | 23,5 / 44,3 / 44,5 | 24,2 / 36,6 / 41,2 |
| Ataques que toman la casilla | 77% | 80% |
| Marchas por camino / travesías por mar | — | 21,4 / 0,6 |
| Casas con deserciones | 20% | 11% |
| El líder de la semana 2 gana | 34% | 35% |
| Guerrero, veces lo esperado | 1,6 | 1,4 |
| Objetivo fortaleza / puerto y fortaleza cumplidos | 18% / 13% | 25% / 15% |
| Prestigio medio del ganador | 64,7 | 63,8 |

- **Las deserciones vuelven a niveles razonables.** El terreno defensivo hace que las fronteras cambien menos de manos y que nadie pierda de golpe la tierra que da el Pan.
- **Algo menos de guerra, pero mejor escogida:** se ataca menos lo bien defendido y los ataques que salen ganan más a menudo.
- **El guerrero sigue ganando más de lo que le toca** (1,4 veces), pero menos que antes. Las tropas nuevas (fase 3) volverán a tocar esto.
- **Los bots casi no cruzan el mar**: solo lo hacen si tienen tropas libres en un puerto. Para las personas será una sorpresa táctica; no hace falta que los bots la usen más.

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
