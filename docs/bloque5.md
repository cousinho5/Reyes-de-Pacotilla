# Bloque 5: retoques de recursos

Decidido el 20 de octubre de 2026 · copia del documento «Reyes de Pacotilla: bloque 5, recursos y el Oro» (claude.ai). Los datos vienen de simulaciones de 300 partidas con bots, de 4 a 8 casas y 6 semanas (`docs/simulaciones.md`).

El Oro pasa a servir para conseguir antes, o por otra vía, lo que falta, siempre a peor precio que hacerlo por las buenas. Cada punto que cambia reglas se hace con su prueba, su simulación antes y después anotada en `docs/simulaciones.md` y la actualización de `docs/diseno.md`. El cambio con la Corona y los mercenarios ya están en el motor para el simulador, apagados (`ECONOMY_TWEAKS`, `CROWN` y `MERCENARIES` en `rules.ts`).

## Cómo es hoy

Al acabar la partida, cada casa guarda de media unos 165 de Oro, 100 de Madera y 80 de Piedra sin gastar, y casi nada de Pan ni de Hierro. Lo que frena a las casas es el Hierro y el Pan, y el Oro solo sirve para conseguirlos comerciando con otras casas, que también los necesitan.

Hoy el Oro se gasta en la Gran Subasta (unos 385 por partida entre todas las casas), en el nivel 5 de los edificios (30), en los jinetes (1; 3 con el bloque 4), en sobornos al cronista (10) y en comercio. Además, da Prestigio de Riqueza: 1 punto por cada 25 de Oro, hasta 10 puntos.

## Qué hacen otros juegos

| Juego | Para qué sirve el oro | Qué sacamos |
| --- | --- | --- |
| [Civilization VI](https://twinfinite.net/guides/civilization-vi-how-to-buy-buildings/) | Comprar al momento un edificio o una unidad | Oro para acelerar, no para sustituir |
| [Crusader Kings III](https://guildorder.com/games/ck3/wiki/mercenaries-and-holy-orders) | Mercenarios contratados por un tiempo | Tropas de alquiler que se van solas |
| [Travian: Kingdoms](https://support.kingdoms.com/en/articles/69-marketplace) | Un mercader que cambia recursos por una tarifa | Un cambio con la Corona |

## Decisiones

| Punto | Decisión |
| --- | --- |
| 1. Oro en las mejoras | 5 de Oro al nivel 2, 10 al 3, 20 al 4 y 30 al 5. El objetivo «tesoro» baja de 150 a 100 de Oro |
| 2. Cambio con la Corona | Precio dinámico según la escasez en el reino y lo que se le ha comprado en la última semana, más un 30%. La Corona solo vende. Sin tope semanal (cambiado el 22 de octubre): el límite es el Oro de cada casa |
| 3. Mercenarios | De alquiler: 6 de Oro por tropa, se van solos a los 7 días, no comen Pan. Sin tope semanal (cambiado el 22 de octubre) |
| 4. Espías | Descartado de momento |
| 5. Prestigio por el Oro (Riqueza) | Como hoy: 1 punto por cada 25 de Oro, hasta 10 |
| 6. Madera y Piedra que sobran | Las mejoras piden un 15% más de Madera y Piedra. El objetivo «niveles 17» baja a 16 |

## Punto 1: Oro en las mejoras

| Dato | Hoy | Elegido (5/10/20/30) | 10/20/30/40 |
| --- | --- | --- | --- |
| Oro sin gastar al final, por casa | 170 | 115 | 78 |
| Oro gastado en la subasta, por partida | 388 | 264 | 165 |
| Prestigio por edificios, por casa | 10,6 | 10,6 | 10,5 |
| Objetivo «tesoro» (150 de Oro) cumplido | 61% | 21% | 6% |

Los edificios se siguen subiendo igual. Los bots pujan menos en la subasta porque gastan el Oro en obras. Con el jinete a 3 de Oro del bloque 4, quedan unos 100 de Oro sin gastar por casa.

## Punto 2: cambio con la Corona

**Precio.** Para cada recurso que no sea Oro:

- escasez = raíz de (media de los cuatro recursos en el reino / ese recurso en el reino);
- demanda = 1 + 0,01 × (unidades compradas a la Corona en los últimos 7 días);
- precio en Oro de una unidad = 2 × escasez × demanda × 1,3, entre 0,25 y 10 antes del 30%.

El reino es la suma de lo que guardan todas las casas. Una casa solo ve el precio, nunca lo que guardan las demás.

**Por qué la Corona solo vende.** Con la Corona comprando y vendiendo, los bots le vendían su Pan y su Hierro para juntar Oro y luego no podían mantener las tropas. Las casas con deserciones pasaban del 13% al 32%. Con precios altos, venderle era una fábrica de Oro: 2.173 de Oro por partida, y el reclutamiento caía de 646 a 383. Si solo vende, no se desequilibra nada. Se gastan unos 106 de Oro por partida, sobre todo en Madera; el Hierro sale a unos 4 de Oro.

## Punto 3: mercenarios

| Dato, por partida | Sin mercenarios | Alquiler (elegido) | Soldada |
| --- | --- | --- | --- |
| Mercenarios contratados | — | 34 | 41 |
| Oro gastado en ellos | — | 203 | 293 |
| Oro sin gastar al final, por casa | 116 | 85 | 73 |
| Guerrero / arquitecta (x esperado) | 1,5 / 0,6 | 1,3 / 0,7 | 1,5 / 0,7 |

Aparecen en el castillo. Se van al cumplir los 7 días estén donde estén; si han muerto en combate, ya no cuentan. Su Pan lo pone la Corona.

## Punto 5: Riqueza

Con los puntos 1, 2 y 3, las casas acaban con unos 68 de Oro, por debajo del tope. Bajarlo a 5 puntos no cambiaba nada: el ganador sacaba 64,0 de Prestigio frente a 64,2.

## Punto 6: Madera y Piedra

Simulado con el punto 1 y el mantenimiento de fortificaciones del bloque 4:

| Dato | Mejoras como hoy | +15% (elegido) | +30% |
| --- | --- | --- | --- |
| Madera / Piedra sin gastar al final, por casa | 96 / 77 | 73 / 58 | 56 / 42 |
| Prestigio por edificios, por casa | 10,5 | 10,3 | 9,9 |
| Objetivo «niveles 17» cumplido | 26% | 12% | 7% |
| Guerrero / arquitecta (x esperado) | 1,5 / 0,6 | 1,6 / 0,6 | 1,8 / 0,6 |

El mantenimiento de las fortificaciones solo gasta unos 72 de Piedra por partida. Con un 30% más se gasta lo que sobra, pero se frenan las mejoras y gana ventaja el guerrero.

## Al empezar a hacerlo (22 de octubre de 2026)

- **Sin topes semanales** ni con la Corona ni con los mercenarios: el límite es el Oro de cada casa. Con 300 partidas, los bots nunca llegaban a comprar 20 de un recurso a la Corona, y los mercenarios pasan de 24 a 42 por partida sin que cambie quién gana. Como nada frena una compra grande, el precio de la Corona sube con cada unidad que se compra, también dentro de la misma compra; se cobra el total redondeado hacia arriba.
- **Los costes nuevos valen para todas las partidas**: todas las que hay son de prueba (el paso 8 queda fuera).
- **Los mercenarios** son Mesnada normal que aparece en el castillo, sin marca en el mapa. La casa lleva la cuenta de cuántos tiene y cuándo se van; al cumplir los 7 días, al amanecer, se quitan esas tropas empezando por el castillo y luego por las casillas con más tropas. Si la casa tiene menos tropas que mercenarios, se da por hecho que murieron mercenarios (como el simulador).
- **Una PR por paso**: primero las mejoras (puntos 1 y 6), luego la Corona y al final los mercenarios, cada una con su pantalla sencilla, sus bots y dos o tres frases del cronista.

## Pasos

1. **Punto 1 y punto 6 (hecho el 22 de octubre; simulación en `docs/simulaciones.md`):** cambiar `UPGRADE_COST` en `rules.ts` (Oro en todos los niveles y un 15% más de Madera y Piedra, redondeado) y `OBJECTIVE_TARGETS` (`gold` a 100, `totalLevels` a 16). Simular las dos cosas juntas antes y después (`--oro-mejora 5,10,20,0 --mejora-madera-piedra 1.15`) y revisar los objetivos.
2. **Cambio con la Corona:** pasar a `rules.ts` los valores elegidos (`reference: "media"`, `base: 2`, solo venta) y quitar la compra de `crown.ts`. Migración nueva para las compras a la Corona (casa, día, recurso, unidades). Acción en `app.ts` con el precio calculado en el servidor y el cobro en un `db.batch()`. El cliente solo recibe el precio, no lo que guarda el reino.
3. **Mercenarios:** migración nueva (casa, cuántos, día en que se van). Acción en `app.ts`; en `jobs.ts`, quitar los que cumplen y descontarlos del mantenimiento del domingo, en el mismo orden que el simulador.
4. **Cliente:** coste en Oro en las fichas de los edificios; «Cambio con la Corona» en la pestaña Comercio y «Mercenarios» en la pestaña Castillo (bloque 10), con el precio de hoy.
5. **Bots:** ya saben comprar a la Corona y contratar mercenarios (`packages/engine/src/ai/oro.ts`); las partidas de prueba (`pruebas.ts`) tienen que usarlo.
6. **Cronista:** frases para las compras a la Corona y los mercenarios que se van (encaja con el bloque 3).
7. **Diseño:** secciones de economía, objetivos y Prestigio de `docs/diseno.md`.
8. ~~**Partidas en curso:** siguen con los costes de antes.~~ Descartado: todas las partidas son de prueba.
