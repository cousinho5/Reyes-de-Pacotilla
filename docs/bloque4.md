# Bloque 4: retoques del sistema de batalla

Decidido el 19 de octubre de 2026 · copia del documento «Reyes de Pacotilla: bloque 4, retoques del sistema de batalla» (claude.ai). Los datos vienen de «Reyes de Pacotilla: investigación del bloque 4» y de simulaciones de 300 partidas con bots, de 4 a 8 casas y 6 semanas (`docs/simulaciones.md`).

Cada punto se hace en una solicitud de cambios propia, con su prueba, su simulación antes y después anotada en `docs/simulaciones.md` y la actualización de la sección 8 de `docs/diseno.md`. Varios ya están en el motor detrás de `BATTLE_TWEAKS` (`packages/engine/src/rules.ts`), apagados: el juego no cambia hasta encenderlos.

## Resumen

| Punto | Decisión | En el motor |
| --- | --- | --- |
| 1. Apoyo sin elegir origen | Apoyas el primer ataque que llegue a la casilla esa noche: el tuyo si atacas tú; si no, el que se ordenó antes | **Hecho** (`supportAnyOrigin` encendido, `orders.supports_any`) |
| 2. Mesnada frente a jinetes | El jinete cuesta 3 de Oro en vez de 1 | **Hecho** |
| 3. Capitán como unidad propia | Se mueve solo; cae preso si lo atacan; libre a las 7 noches o con rescate negociado | **Hecho** (`captainAlone` encendido, rescate con `RANSOM`) |
| 4. Jinetes que se cruzan | El cruce por el camino es un choque frontal | **Hecho** (`crossingClash` encendido) |
| 5. Fortificación hasta que la atacan | Mantenimiento de 2 de Piedra por casilla cada domingo | **Hecho** (`fortifyUntilAttacked` encendido, `FORTIFY_UPKEEP = { piedra: 2 }`) |
| 6. Dos guerras a la vez | Descartado | — |

## Dudas resueltas al empezar (21 de octubre de 2026)

1. **Orden de las solicitudes de cambios:** una por punto, en este orden: 4 (cruces), 2 (jinete), 5 (fortificación), 3 (Capitán) y 1 (apoyo).
2. **«La orden que se dio antes»:** cuenta la hora del último cambio de la orden (`orders.updated_at`), no la de la primera vez.
3. **Apoyar a otra casa:** el apoyo sigue saliendo de una casilla vecina a la apoyada. En la repetición, la casa apoyada ve quién la apoyó.
4. **Rescate del Capitán:** solo pide precio quien lo tiene preso, en Oro y sin límite, y puede cambiarlo cuando quiera. La otra casa acepta o rechaza, sin contraoferta. Si acepta, el Capitán vuelve a su castillo en el momento; si nadie paga, se fuga a las 7 noches.
5. **Capitán solo:** va a la misma distancia que una tropa (vecina o por camino). Necesita una migración, porque `orders.troops` no admite 0.
6. **Partidas en curso:** todas son de prueba, así que la fortificación nueva vale para todas.

## Punto 1: apoyo sin elegir origen

**Hoy.** Para apoyar un ataque hay que elegir desde qué casilla sale («Un ataque que sale de X»), y esa casilla tiene que ser vecina del objetivo. Por eso no se puede apoyar una marcha por camino ni una carga de jinetes.

**Decisión.** Eliges una casilla y marcas «apoyar ataque». Apoyas el **primer ataque que llegue a esa casilla esa noche**, sea tuyo o de otra casa; no se elige ni origen ni casa. Si esa noche atacan la casilla varias casas:

- si atacas tú, el primero es siempre el tuyo;
- si no, es el de la orden que se dio antes.

Tu apoyo puede acabar ayudando a un enemigo que se adelantó: es parte del riesgo. Si atacas desde dos sitios, el apoyo suma una sola vez.

**Datos.** Con el apoyo libre a los ataques propios no se desequilibran las personalidades. Hay un 20% más de combates entre casas, porque se pueden apoyar las marchas largas, y menos partidas decididas por desempate (del 7% al 2%).

**Pasos:**

1. Motor: el apoyo apunta a una casilla y se asigna al primer ataque según la regla de arriba (hoy `supportAnyOrigin` solo cubre los ataques de la propia casa). Hace falta la hora de cada orden en la entrada de `resolveCampaign`.
2. Migración nueva: columna `orders.supports_any`. La columna del origen apunta a una casilla y no admite «cualquiera».
3. Servidor: guardar y leer la nueva forma de apoyo en `app.ts`, `jobs.ts` y `pruebas.ts`.
4. Cliente: en «¿Qué apoyas?», la opción «El primer ataque a X»; en la pestaña Órdenes, el texto «apoyan el primer ataque sobre X». La repetición de la noche dice a quién acabó apoyando.
5. Pruebas (ya hay tres en `bloque4.test.ts`; faltan las de varias casas) y sección 8 del diseño.

**Hecho** el 21 de octubre de 2026: el motor reparte cada apoyo con `ANY_ORIGIN` al primer ataque de la casilla (`MoveOrder.at`, la hora del último cambio de la orden). Migración 0013: `orders.supports_any`. Al volver a guardar las órdenes, las que no cambian conservan su `updated_at`. En el cliente, «El primer ataque a X» en «¿Qué apoyas?» (sustituye a elegir el origen), «apoyan el primer ataque sobre X» en la pestaña Órdenes, y «+ apoyo de Casa X» en la tarjeta de la batalla y en la crónica. Simulación en `docs/simulaciones.md`.

## Punto 2: Mesnada frente a jinetes

**Hecho** el 21 de octubre de 2026: `UNITS.jinetes.cost` con 3 de Oro; el aviso al reclutar sin recursos sale de `rules.ts`. Simulación en `docs/simulaciones.md`.

**Hoy.**

|  | Coste | Fuerza |
| --- | --- | --- |
| Mesnada | 2 Hierro + 2 Pan | 1 |
| Jinete | 3 Hierro + 2 Pan + 1 Oro | 2 a la carga en llano sin murallas; 1 defendiendo; 0,5 en el bosque; no sube a la montaña; avanza dos casillas en llano |

El Oro sobra (unas 165 monedas por casa al final), así que en la práctica el jinete cuesta solo 1 Hierro más.

**Decisión.** El jinete pasa a costar 3 Hierro + 2 Pan + **3 Oro**. El freno a la carga (que la Mesnada aguante la carga, como un lancero) queda para más adelante.

**Datos.** Con los bots, las casas que solo reclutan jinetes ganan menos (0,6 a 0,8 veces lo esperado) que las que solo reclutan Mesnada (1,2 a 1,4). Pero los bots usan mal los jinetes, y una persona que elige bien las cargas les saca más.

**Pasos:**

1. Cambiar `UNITS.jinetes.cost` en `rules.ts`.
2. Simular antes y después, y anotarlo.
3. Revisar los textos del cliente que muestran el coste.

## Punto 3: el Capitán como unidad propia

**Hecho** el 21 de octubre de 2026: `captainAlone` encendido y los bots lo llevan solo al frente (`BOT_TWEAKS.captain = "solo"`). Migración 0012: `orders.troops` admite 0 en una orden de mover con el Capitán, y `houses.captain_ransom` guarda el precio. Rescate: `PUT /api/partidas/:id/capitan/:casa/rescate` (quien lo tiene pide o cambia el precio) y `POST /api/partidas/:id/capitan/rescate` (su casa paga), en un lote (`apps/server/src/rescate.ts`). Los bots piden y pagan con `botRansomPrice`/`botPaysRansom` (`RANSOM` en `rules.ts`), igual en el simulador y en las partidas de prueba. En el cliente, «Mover al Capitán solo» en la ficha de su casilla y el rescate en la tarjeta del Capitán (pestaña Castillo). Simulación en `docs/simulaciones.md`.

**Hoy.** El Capitán solo viaja con un ataque que sale de su casilla. Pasa el 15% de las noches parado en el castillo, donde no sirve de nada (los castillos no se pueden atacar).

**Decisión.**

- El Capitán se puede mover solo, sin tropas, entre casillas propias, también a una vacía. Solo no ataca.
- Si atacan la casilla donde está solo, **cae preso**.
- Se libera **a las 7 noches** o con un **rescate negociado**: quien lo tiene pide un precio en Oro y su casa acepta o no.
- Sigue sumando +2 al grupo con el que ataca o defiende.

**Datos.** Con el Capitán libre, sus ataques pasan de 3,6 a 6,2 por casa, la toma de casillas sube del 73% al 78% y hay un 17% más de combates entre casas. No ayuda al que ya va primero («el líder de la semana 2 gana» baja del 29% al 26%).

**Pasos:**

1. Encender `captainAlone` (ya probado en el motor).
2. Servidor: aceptar la orden de mover al Capitán con 0 tropas. Rescate: quien lo tiene propone un precio, la otra casa lo acepta o lo rechaza; el pago va en un `db.batch()`.
3. Cliente: botón «Mover al Capitán» en su casilla, ficha propia en el mapa y la negociación del rescate.
4. Bots: llevar al Capitán al frente (ya está en el simulador) y saber pedir y pagar rescates.
5. Diseño, sección 8.11.

## Punto 4: jinetes que se cruzan

**Hecho** el 21 de octubre de 2026: `crossingClash` encendido, el choque se dibuja en la casilla de en medio (`via` en el suceso `choque_frontal`), y la pestaña Órdenes avisa de las marchas que un enemigo a la vista podría cruzar (`crossingRisks` en `plan.ts`). Simulación en `docs/simulaciones.md`.

**Hoy.** Con las casillas A, B y C en fila, si 3 Mesnadas van de A a B y 4 jinetes cargan de C a A pasando por B, no combaten: cada uno entra en la casilla del otro.

**Decisión.** El cruce es un choque frontal: los dos grupos combaten por el camino, sin terreno ni cargas, y el ganador sigue hasta su destino.

**Datos.** Con los bots pasa poco (0,6 veces por partida) y arreglarlo no cambia el equilibrio. Las personas buscarán este hueco más que los bots.

**Pasos:**

1. Encender `crossingClash` (ya hecho y probado).
2. Repetición de la noche: el choque se dibuja en la casilla de en medio y el texto dice «chocan por el camino».
3. Proyección del cliente: los avisos de amenazas tienen en cuenta el cruce.
4. Diseño, sección 8.4 (casos especiales).

## Punto 5: fortificación hasta que la atacan

**Hecho** el 21 de octubre de 2026: fortificar (y la carta Muralla) deja `fortifiedUntil = FORTIFY_FOREVER`; el domingo, `jobs.ts` cobra el mantenimiento detrás del de las tropas, en el mismo lote, y avisa a la casa con el suceso `mantenimiento_fortificaciones`. Los bots solo conservan las que lindan con otra casa, como en el simulador. Las fortificaciones que ya existían conservan su fecha. Simulación en `docs/simulaciones.md`.

**Hoy.** Fortificar cuesta 8 de Piedra y da +25% de defensa durante 4 noches. Se pierde si la casilla cambia de manos.

**Decisión.**

- La fortificación dura hasta que atacan la casilla. El primer ataque, gane o pierda, la quita. Las catapultas y los asedios siguen desgastándola.
- Cada domingo se pagan **2 de Piedra por casilla fortificada**. Si no llega, se desmantelan las que no se pueden pagar.

**Datos.** Se simuló el mantenimiento con 1 a 4 de Piedra y con 2 o 4 de Oro, también con casas que fortifican toda su frontera:

- El Oro no frena: sobra tanto que casi nadie desmantela.
- Con 2 de Piedra, quien se atrinchera en toda la frontera pierde unas 21 fortificaciones por partida; la Piedra sin gastar vuelve a la de hoy, y las fortificaciones siguen durando un 55% más que hoy.
- Ninguna variante cambia el equilibrio entre personalidades.

**Pasos:**

1. Encender `fortifyUntilAttacked` y poner `FORTIFY_UPKEEP = { piedra: 2 }` en `rules.ts`.
2. Servidor: cobrar el mantenimiento el domingo en `jobs.ts`, con `applyFortifyUpkeep` (ya en `actions.ts`), en el mismo lote que el mantenimiento de tropas.
3. Partidas en curso: sus fortificaciones duran lo que ya decían.
4. Cliente: texto «hasta que la ataquen» y aviso del mantenimiento del domingo.
5. Bots: decidir qué fortificaciones mantener.
6. Diseño y simulación anotada.

## Punto 6: dos guerras a la vez

Descartado.

## Lo que se queda para otros bloques

- **El Oro** (bloque 5): el jinete a 3 de Oro y el rescate del Capitán son salidas para el Oro. Conviene revisarlo junto con el bloque 5.
- **Alianzas** (bloque 8): el apoyo a otras casas del punto 1 convive con el apoyo entre aliados.
