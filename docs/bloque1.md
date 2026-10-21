# Bloque 1: mapa y losetas

Decidido el 18 de octubre de 2026 · copia del documento «Reyes de Pacotilla: evaluación del mapa y las losetas». Cada fase se simula antes y después, y solo afecta a partidas nuevas: las que están en curso conservan su mapa.

## Decisiones

- No se agranda la tierra jugable. A cambio, el tablero lleva un marco de mar y montañas que no se juega.
- No se agrandan las losetas por ahora. El detalle saldrá de variantes por tipo y de la geografía. Al final se prueba un dibujo a ×1,5 en una sola loseta.
- Los ríos tienen regla: atacar cruzando un río da +25% al defensor. Los puentes no tienen penalización.
- La Aldea permite reclutar, como el castillo.
- Las Ruinas dan recursos o una carta, al azar (sale de la semilla de la partida).
- El Prestigio por loseta baja de 3 a 2.

## Fases

0. **Prestigio por loseta de 3 a 2**, con su simulación. *Hecha el 21 de octubre de 2026 (PR #44).*
1. **Geografía y Prado.** Generador con altura, humedad, dos costas y ajuste de salida. El Prado (sin recursos, 1 de Prestigio, 2 de guarnición, llano) sustituye a parte de los páramos y los campos. Marco de mar y montañas alrededor. Se revisa el objetivo «puerto y fortaleza». *Se da por buena si* la justicia entre castillos queda como ahora (diferencia de entorno de 1,2 como mucho) y hay al menos un 50% más de vecinas del mismo terreno. *Hecha el 21 de octubre de 2026: entre un 60% y un 100% más de vecinas iguales y castillos más igualados que antes. Los campos se quedan al 20% (con el 15% subían las deserciones) y el objetivo pasa a «puerto y montaña». Datos en `docs/simulaciones.md`.*
2. **Ríos, puentes y lagos.** Se guardan como rasgos del mapa (migración nueva). *Se da por buena si* no sube «el líder de la semana 2 gana» y ningún castillo queda encerrado. *Hecha el 21 de octubre de 2026: el líder de la semana 2 gana igual que antes (31% sin ríos, 30,5% con ríos) y ningún castillo queda encerrado. Hay unos 10 combates menos entre casas por partida. Datos en `docs/simulaciones.md`.*
3. **Aldea y Ruinas.** Una aldea por casa en la tierra de en medio, donde se puede reclutar. Unas ruinas por cada dos casas, con recursos o una carta para la primera casa que entre; después quedan como Prado. *Se da por buena si* los bots toman las ruinas en la primera semana y la aldea no dispara la bola de nieve. *Hecha el 21 de octubre de 2026: la aldea no dispara la bola de nieve (el líder de la semana 2 gana el 31%, antes el 30%) y las deserciones bajan a la mitad. Las ruinas se toman casi todas, pero solo el 60% en la primera semana. Las Ruinas son una por cada dos casas sin contar dos (1, 1, 2, 2 y 3), porque con una por cada dos el mapa de 4 casas perdía la mitad de lo agrupado. La Aldea está a 2 pasos del castillo: a 3 no cabe, porque los castillos están a 3 pasos unos de otros. Datos en `docs/simulaciones.md`.*
4. **Dibujo.** Variantes por tipo de loseta, costa, ríos con puentes, aldea y ruinas. Prueba del dibujo a ×1,5 en una loseta. *Hecha el 21 de octubre de 2026: la Aldea (ermita, casas y pozo) y las Ruinas (torre partida, arco y muro) se dibujan en pxl (`apps/web/src/art/pxl/losetas.px.js`) y pasan al mapa con `--mapa`. En la prueba del ×1,5 en una loseta caben entramados, contraventanas y gente, pero el dibujo se lee peor de un vistazo en el móvil y habría que rehacer `world.ts`. Se decide dejarlo a ×1 por ahora; se retomará más adelante para ganar detalle.*

La partida piloto con amigos puede empezar tras la fase 1 o la 2.

## Evaluación

**Resumen: sí a una generación con geografía, ríos, Prado y dos losetas nuevas (Aldea y Ruinas). No a agrandar el mapa ni las losetas.** Agrandar el mapa retrasa la guerra hasta una semana y sube el Prestigio del ganador entre 11 y 19 puntos. Agrandar las losetas no añade detalle si siguen siendo iguales. Lo que hace que el mapa se vea pobre es que no tiene geografía, y eso sí se puede arreglar sin perder justicia: un prototipo lo demuestra.

| Propuesta                         | Veredicto                     | Por qué                                                                                |
|-----------------------------------|-------------------------------|----------------------------------------------------------------------------------------|
| 1\. Mapa más grande               | No, salvo un marco decorativo | Guerra más tardía, más Prestigio y más deserciones                                     |
| 2\. Losetas más grandes           | Ahora no                      | El detalle sale de la variedad; agrandar obliga a rehacer el dibujo y se ve menos mapa |
| 3\. Generación inteligente y ríos | **Sí, la primera**            | Un 50% más de terreno agrupado con la misma justicia; los ríos dan frentes             |
| 4\. Prado                         | Sí, como páramo verde         | Es el fondo que necesita la geografía; con 1 de Prestigio y sin añadir tierra          |
| 5\. Losetas con efecto            | Sí: Aldea y Ruinas            | La Aldea vale por su posición y las Ruinas animan la primera semana                    |

### Cómo es hoy el mapa

El mapa actual es justo pero no tiene geografía: cada loseta se elige al azar sin mirar a sus vecinas, y el tamaño está calibrado con simulaciones para que los castillos queden a 3 pasos.

| Casas | Rejilla | Losetas | Páramos | Primer choque (simulado) |
|-------|---------|---------|---------|--------------------------|
| 4     | 6x5     | 30      | 2       | día 9                    |
| 5     | 7x6     | 42      | 5       | día 9                    |
| 6     | 8x6     | 48      | 6       | día 6                    |
| 7     | 9x7     | 63      | 10      | día 7                    |
| 8     | 10x8    | 80      | 14      | día 6                    |

- **Tipos:** castillo, campos, bosque, cantera, montaña, puerto, fortaleza y páramo. Las neutrales productivas salen a partes iguales (20% de cada recurso básico, 10% de puertos y 10% de fortalezas).

- **Generación** (mapgen.ts): los castillos van repartidos por el borde, nunca en una esquina. Fortalezas y páramos nunca tocan un castillo. El resto se baraja y se reparte al azar. Se prueban 600 colocaciones y gana la que deja a todos los castillos con un entorno de valor parecido y con todos los recursos cerca.

- **Lo que falla:** no hay cordilleras, bosques grandes, costa ni ríos. Un puerto puede caer en mitad del continente y el dibujo lo arregla con una bahía y un canal. El objetivo secreto «puerto y fortaleza» solo se cumple el 2% de las veces porque las fortalezas quedan en el centro y los puertos donde caigan.

- **Dibujo** (world.ts, 1.316 líneas): un único lienzo de pixel art procedural. Cada hexágono mide 56 píxeles de ancho dentro de una caja de 64. Los terrenos se funden en los bordes y lo alto asoma sobre la vecina, como en Wesnoth. De cerca, el móvil muestra cada píxel del dibujo a 2 píxeles de pantalla: caben unas 3 losetas de ancho.

### Propuesta 1: mapa más grande

**Veredicto: no agrandar la tierra jugable por casa.** Que el mundo *parezca* más grande sí, con un marco de mar y montañas alrededor que no se juega. En la simulación, un mapa más grande retrasa la guerra, infla el Prestigio y no hace la partida más justa.

Simulación de 150 partidas de 6 semanas por variante, con todas las reglas de ahora (HEX=1 npm run simular-mapa):

| Variante                         | Casillas por casa | Primer choque (día) | Batallas entre casas por semana | Territorio medio | Prestigio del ganador | Casas con deserciones |
|----------------------------------|-------------------|---------------------|---------------------------------|------------------|-----------------------|-----------------------|
| 4 casas, 6x5 + 2 páramos (ahora) | 7,5               | 5                   | 6,9                             | 16,2             | 66,4                  | 14%                   |
| 4 casas, 7x6 + 2 páramos         | 10,5              | 13                  | 6,3                             | 25,1             | 77,0                  | 13%                   |
| 4 casas, 7x6 + 8 páramos         | 10,5              | 7                   | 7,8                             | 22,2             | 73,0                  | 17%                   |
| 4 casas, 8x7 + 4 páramos         | 14,0              | 15                  | 6,2                             | 31,5             | 85,2                  | 13%                   |
| 6 casas, 8x6 + 6 páramos (ahora) | 8,0               | 4                   | 11,5                            | 16,8             | 73,3                  | 12%                   |
| 6 casas, 9x7 + 6 páramos         | 10,5              | 5                   | 10,6                            | 23,1             | 81,7                  | 10%                   |
| 6 casas, 9x7 + 15 páramos        | 10,5              | 4                   | 14,3                            | 21,2             | 77,9                  | 18%                   |
| 6 casas, 10x8 + 8 páramos        | 13,3              | 11                  | 8,8                             | 27,8             | 89,9                  | 12%                   |

Lo que dicen los números:

- **La guerra llega tarde.** Con 4 casas en 7x6, el primer choque pasa del día 5 al 13: casi dos semanas de solo expandirse en una partida de seis.

- **El Prestigio se infla:** de 11 a 19 puntos más para el ganador, porque cada loseta da 3. Ya teníamos pendiente bajarlo.

- **Rellenar con páramos no lo arregla:** devuelve el choque temprano, pero sube las deserciones (17-18%). Hay más tierra que mantener y producen lo mismo.

- **Pantalla:** el reino de 6 casas ya no cabe entero en un móvil a un tamaño legible. Con 10x8, «Ver todo el reino» muestra losetas de unos 32 píxeles.

Civilization escala el mapa con el número de jugadores para mantener la misma tierra por jugador. Con menos densidad, el juego pasa a ser de expansión y no de vecinos ([CivFanatics](https://forums.civfanatics.com/threads/map-size-scaling.623497/)). Para un juego entre amigos, la fricción con el vecino es el motor de la diversión.

**Lo que sí propongo:** un borde no jugable de mar, costa y cordilleras alrededor del tablero. El reino se ve como parte de un mundo, sin más losetas que gestionar. Si aun así se quiere más espacio, como mucho una fila más rellena de Prado (propuesta 4), y medirlo con el Prestigio ya rebajado.

### Propuesta 2: losetas más grandes y más detalladas

**Veredicto: no agrandar ahora.** El detalle que falta es variedad y geografía, no píxeles: con más tamaño, la misma loseta repetida solo se ve más grande.

Hay dos formas de «agrandar», y las dos tienen un coste claro:

| Opción                                                              | Qué gana                              | Qué pierde                                                                                                                                                                                                                               |
|---------------------------------------------------------------------|---------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Misma loseta, más zoom en pantalla                                  | Nada de detalle nuevo                 | De cerca caben 1,5 losetas de ancho en vez de 3: no se ven las vecinas, que es lo que decide un ataque                                                                                                                                   |
| Dibujo de 84 píxeles en vez de 56 (×1,5) y mismo tamaño en pantalla | 2,25 veces más superficie para pintar | El pixel art se vuelve más fino y pierde el aire de juego de 16 bits. Hay que rehacer a mano world.ts (tamaños fijos de bahías, árboles, castillos y soldados). El lienzo pesa 2,25 veces más y se redibuja en cada cambio de la partida |

En un juego de estrategia de móvil manda ver la frontera entera. Into the Breach y Polytopia usan casillas pequeñas y muy legibles, con pocas cosas en cada una.

**Lo que sí recomiendo para que se vea más rico:**

- **Variantes por tipo:** 3 o 4 dibujos de bosque, campos o montaña, elegidos con la semilla. Es lo que más rompe la sensación de «loseta repetida».

- **Geografía continua** (propuesta 3): una cordillera de cuatro montañas o un río que cruza el reino dan más detalle que cualquier aumento de tamaño.

- **Detalles que cuentan la partida:** granjas que crecen con el nivel de la Granja y caminos que se marcan con el uso.

Si tras la nueva generación sigue pareciendo pobre, se prueba el ×1,5 en una sola loseta y lo comparamos en el móvil antes de rehacer nada.

### Propuesta 3: generación más inteligente, con ríos y geografía

**Veredicto: sí, es la que más aporta y la primera que haría.** Hace el mapa más bonito y más jugable a la vez. El riesgo es la justicia: si los terrenos se agrupan, a un castillo le puede tocar un bosque enorme y ninguna mina. El prototipo muestra que se puede evitar.

**Cómo se haría.** Es el método clásico de Red Blob Games ([terreno a partir de ruido](https://redblobgames.com/maps/terrain-from-noise/), [versión en hexágonos](https://www.redblobgames.com/x/2543-mapgen1-hexagons/)), adaptado a un mapa pequeño y justo:

1.  Dos campos de ruido con la semilla de la partida: **altura** y **humedad**.

2.  Se mantienen las mismas cantidades de cada tipo de ahora, así la economía no cambia; solo cambia dónde cae cada loseta.

3.  **Costa** en dos lados opuestos del mapa, con los puertos en la orilla. Las montañas van en lo más alto, las canteras en las laderas, los bosques en lo más húmedo y los campos en el resto. Las fortalezas ocupan los altos lejos de los castillos y los páramos lo más seco.

4.  **Ajuste de salida:** si a un castillo le falta un recurso básico a 2 pasos, se cambia una loseta suya repetida por la más cercana del tipo que falta. Es la misma idea que el reparto equilibrado de salidas de los generadores de Civilization.

5.  Como ahora, se prueban 600 mapas y se queda el más justo.

6.  **Ríos** después: nacen en las montañas y bajan hasta la costa por los bordes entre losetas.

**Prototipo** (40 mapas por número de casas, sin ríos todavía):

| Casas | Vecinas del mismo terreno (ahora → con geografía) | Recursos que le faltan a 2 pasos a cada castillo | Diferencia de entorno entre castillos (mediana) |
|-------|---------------------------------------------------|--------------------------------------------------|-------------------------------------------------|
| 4     | 19% → 30%                                         | 0,15 → 0,40                                      | 0,70 → 0,70                                     |
| 5     | 17% → 28%                                         | 0,35 → 0,58                                      | 1,10 → 1,00                                     |
| 6     | 18% → 28%                                         | 0,22 → 0,27                                      | 0,70 → 0,80                                     |
| 8     | 20% → 31%                                         | 0,28 → 0,18                                      | 1,00 → 1,00                                     |

Con geografía, las losetas vecinas del mismo terreno pasan de 1 de cada 5 a casi 1 de cada 3: se forman cordilleras y bosques. La justicia queda como ahora. Lo que más falta cerca es el puerto, porque la costa queda en dos lados. La primera versión, con una sola costa y sin ajuste de salida, dejaba a cada castillo sin 1 recurso cercano de media con 6 y 8 casas: el ajuste es imprescindible.

**Ríos, con regla y no solo de adorno.** Atacar cruzando un río da +25% de defensa al defensor, como en Civilization VI, donde da +5 al defensor ante un ataque cuerpo a cuerpo desde la otra orilla ([Civilization Wiki](https://civilization.fandom.com/wiki/Combat_(Civ6))). Donde un camino cruza el río hay un **puente** sin penalización. Crea líneas de frente naturales y puntos que defender, con una regla de una frase que encaja con el terreno que ya hay.

**Coste.** Generación nueva en mapgen.ts, ríos guardados como lados entre losetas (migración nueva), bonificación en defenseMultiplier, dibujo de costa y ríos en world.ts, y simulaciones antes y después. Solo afecta a partidas nuevas.

De paso arregla el objetivo «puerto y fortaleza» (2% de éxito): con puertos en la costa y fortalezas en los altos se puede revisar con sentido.

### Propuesta 4: el Prado, una loseta sin recursos

**Veredicto: sí, pero como el páramo verde, no como una regla nueva.** Ya existe una loseta que no produce: el páramo, que da 1 de Prestigio, tiene 2 de guarnición y nunca toca un castillo. Un Prado que no hace nada no da una decisión nueva al jugador. Su valor está en el mapa: es el terreno de fondo que hace falta para que la geografía de la propuesta 3 respire.

En la simulación del 17 de octubre se probaron tres valores para el páramo:

- **0 de Prestigio:** solo se tomaba el 9% de los páramos. No era tierra disputada, y la casa con mejor salida ganaba más.

- **3 de Prestigio:** se tomaban casi todos (el 70%), y el Prestigio subía.

- **1 de Prestigio:** el punto medio. Es el valor que tiene ahora el páramo y el que debería tener el Prado.

Cómo lo haría:

|                    | Páramo                       | Prado                                                                                            |
|--------------------|------------------------------|--------------------------------------------------------------------------------------------------|
| Produce            | Nada                         | Nada                                                                                             |
| Prestigio          | 1                            | 1                                                                                                |
| Guarnición neutral | 2                            | 2                                                                                                |
| Dónde sale         | Lo más seco, entre castillos | Entre los campos y los bosques, en los valles y a lo largo de los ríos                           |
| Para qué sirve     | Tierra de nadie              | Llano: los jinetes cargan y los caminos pasan por él. Hueco para la propuesta 5 (aldeas, ruinas) |
| Dibujo             | Tierra parda, rocas          | Césped, flores, algún árbol suelto                                                               |

El Catan de base tiene un solo desierto, que no produce y da forma al tablero. La expansión Navegantes añade mar y islas por la misma razón ([Wikipedia: Catan: Seafarers](https://en.wikipedia.org/wiki/Catan:_Seafarers)).

**Cuidado:** si se añaden Prados sin quitar nada, cada casa tiene más tierra que mantener, y la simulación con páramos extra subió las deserciones al 17-18%. El Prado debe sustituir a parte de los páramos y a algunos campos, no sumarse.

### Propuesta 5: nuevas losetas que hagan algo

**Veredicto: dos losetas nuevas (Aldea y Ruinas) y dos rasgos del mapa (ríos y lagos).** Una loseta nueva solo merece la pena si cambia lo que alguien decide en una frase de regla. Si solo añade otro recurso, es un número más en la hoja.

Criterios usados:

1.  **Crea una decisión o un conflicto** entre casas.

2.  **Se explica en una frase** y usa sistemas que ya existen.

3.  **No alarga la partida** ni obliga a entrar más a menudo.

4.  **Da material a Fray Abundio.**

| Idea                                | Qué haría                                                                                                  | Qué decisión crea                                                                                                                                                       | Veredicto                                                                                            |
|-------------------------------------|------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| **Aldea**                           | Se puede reclutar en ella como en el castillo. Guarnición 4 y 1 de Prestigio                               | Bases avanzadas: tomarla acerca tus refuerzos al frente, y perderla te los quita. En Wesnoth, las aldeas son lo que se disputa                                          | **Sí.** 1 por casa, a 2-3 pasos, nunca junto a un castillo                                           |
| **Ruinas**                          | La primera casa que entra se lleva un premio: recursos, una carta o 2 de Prestigio. Luego queda como Prado | Carrera de exploración en la primera semana. Es lo que hace Polytopia, donde no aparecen junto a una capital ([Polytopia Wiki](https://polytopia.fandom.com/wiki/Ruin)) | **Sí.** El premio sale de la semilla (el motor no tiene azar) y se anuncia en la crónica             |
| **Río** (en el borde entre losetas) | Atacar cruzándolo da +25% al defensor; los puentes, no                                                     | Líneas de frente y puntos que defender                                                                                                                                  | **Sí**, con la propuesta 3                                                                           |
| **Lago o mar interior**             | No se puede entrar. Cuenta como agua para los puertos                                                      | Pasos estrechos y rodeos. Ocupa sitio sin dar tierra que mantener                                                                                                       | **Sí**, con la propuesta 3. Como mucho 1 o 2, y siempre probando que ningún castillo queda encerrado |
| Santuario                           | +2 de Prestigio mientras lo tengas                                                                         | Un punto que todos quieren al final                                                                                                                                     | **Quizá más adelante.** Solo cuando el Prestigio esté rebajado, porque lo infla                      |
| Pantano                             | Sin jinetes ni catapultas; el defensor tiene −25%                                                          | Poca: se parece a la montaña al revés                                                                                                                                   | **No.** Es otra excepción que recordar                                                               |
| Mina de oro o viñedo                | Otro recurso o el doble de uno                                                                             | Ninguna nueva: más economía                                                                                                                                             | **No**                                                                                               |
| Mercado o feria                     | Mejores tratos para quien la tenga                                                                         | Interesante, pero el comercio ya tiene reglas finas                                                                                                                     | **No por ahora**                                                                                     |
| Torre de vigilancia                 | Ver más lejos                                                                                              | Ya lo hace la atalaya de la montaña                                                                                                                                     | **No**                                                                                               |

**Por qué Aldea y Ruinas.** La Aldea añade lo que el mapa no tiene: un sitio que vale por su **posición**, no por lo que produce. Las Ruinas animan la primera semana, que ahora es la más tranquila, y dan noticias para la crónica. Ninguna de las dos pide entrar más a menudo.

**Riesgos que se miden en la simulación:**

- **Aldea:** que la casa que toma primero la aldea de su vecino gane demasiado (bola de nieve). Se mira el dato «el líder de la semana 2 gana».

- **Ruinas:** que el premio decida la partida. Debe valer como un día de producción, no más.

### Fuentes

- [Red Blob Games: terreno a partir de ruido](https://redblobgames.com/maps/terrain-from-noise/)

- [Red Blob Games: generación de mapas con hexágonos](https://www.redblobgames.com/x/2543-mapgen1-hexagons/)

- [Civilization Wiki: combate en Civilization VI (ríos y terreno)](https://civilization.fandom.com/wiki/Combat_(Civ6))

- [CivFanatics: escala del mapa según los jugadores](https://forums.civfanatics.com/threads/map-size-scaling.623497/)

- [Polytopia Wiki: ruinas](https://polytopia.fandom.com/wiki/Ruin)

- [Wikipedia: Catan: Seafarers](https://en.wikipedia.org/wiki/Catan:_Seafarers)

- [Board Game Arena: ayuda de Kingdom Builder (losetas de lugar)](https://en.doc.boardgamearena.com/Gamehelpkingdombuilder)

- Simulaciones propias: HEX=1 npm run simular-mapa (150 partidas por variante) y un prototipo de generador con geografía (40 mapas por número de casas), 18 de octubre de 2026.
