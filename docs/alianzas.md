# Reyes de Pacotilla: alianzas (bloque 8)

Decidido el 19 de octubre de 2026 a partir de «Reyes de Pacotilla: investigación de las alianzas». Este documento recoge las reglas y los pasos para hacerlo. La hoja de ruta (`docs/hoja-de-ruta.md`) tiene el resumen.

## Dudas resueltas al empezar (22 de octubre de 2026)

Copia del documento «Reyes de Pacotilla: bloque 8, dudas antes de empezar» (claude.ai).

1. **Orden de las solicitudes de cambios:** cuatro, una tras otra. (1) Motor, pruebas y sección 9.1 del diseño. (2) Bots en el simulador y simulación con y sin alianzas; los números se revisan antes de seguir y, si una pareja fija decide la partida, se propone un freno (`maxPerHouse: 1` o un coste de Prestigio). (3) Base de datos, servidor, API, avisos push, bots en las partidas de prueba, prueba de humo, boletín y 2 o 3 frases de Fray Abundio por tipo (el resto, en el bloque 3). (4) Pantalla sencilla (la bonita llega con los bloques 9, 11 y 12).
2. **Partidas en curso:** todas son de prueba, así que las alianzas valen en todas. No hay columna `games.alliances`; el interruptor general es `ALLIANCE.enabled`.
3. **Nombre y caducidad:** Fray Abundio pone el nombre solemne al azar y quien propone puede pedir otro antes de enviarla. La propuesta caduca a las `ALLIANCE.proposalResolutions` (3) resoluciones, quien propone puede retirarla y solo hay una pendiente entre dos casas.
4. **Cuándo empieza a valer:** si se acepta antes de la resolución de esa noche, vale esa noche. Las órdenes de ataque entre las dos casas que ya estuvieran dadas (también las de la cola) no salen: las tropas se quedan y su dueño recibe el aviso. Al romper, la noche de ese día cuenta como la primera de las tres de aviso.
5. **Tropas de paso:** pueden moverse por las casillas del aliado, volver a casa, atacar a un tercero, llevar al Capitán (también el Capitán solo), **apoyar y sitiar** desde la casilla aliada.
6. **Ataque conjunto:** también contra aldeas, ruinas y guarniciones neutrales. El premio de las ruinas es de quien se queda la casilla. Si ganan a otra casa, los dos suman Gloria. Un apoyo «al primer ataque» (bloque 4) que cae en uno de los dos suma al ataque conjunto.
7. **Hambre y mercenarios:** las tropas de paso cuentan para el mantenimiento de su casa y, si falta Pan, desertan las primeras. Cuando se van los mercenarios, salen primero del castillo, luego de las casillas propias y por último de las tropas de paso.
8. **Bots y personas:** los bots proponen alianzas también a personas y contestan a las suyas con sus reglas.

**Casos raros** (aprobados como se propusieron, salvo el tercero, que cambió):

| Caso | Resultado |
| --- | --- |
| Atacan una casilla de B con tropas de paso de A y la defensa gana | Las bajas se reparten entre B y A en proporción a lo que tenía cada uno. |
| La misma casilla cae | Mueren todas, las de B y las de A. Si estaba el Capitán de A, cae preso. |
| A es aliada de B y de C, pero B y C no; C ataca una casilla de B con tropas de A dentro | Las tropas de A se quedan en la casilla, pero no luchan. Si la casilla acaba en manos de una casa que no es aliada de A, vuelven a la casilla propia más cercana. |
| A es aliada de B y de C, y los tres atacan la misma casilla de D | A hace ataque conjunto con la alianza más antigua; el tercero lucha por su cuenta. |
| B saca todas sus tropas de una casilla donde hay tropas de paso de A | La casilla sigue siendo de B y la defienden las de A. |
| Reparto de bajas que no sale exacto | Por restos mayores; en empate, pierde una más quien dio la orden más tarde (en la defensa, primero las tropas de paso, por id de casa, y el dueño el último). |
| Las dos casas de una alianza en aviso quieren volver a firmarla | No pueden hasta que termine el aviso; quien rompió espera además sus 7 días. |
| Visión compartida y emboscada del bosque | El aliado ve dentro de los bosques del otro, como con la carta Espía. |

## 1. Las reglas

### 1.1 Firmar una alianza

- Una casa propone una alianza a otra y la otra la acepta o la rechaza. La alianza vale desde la siguiente resolución que se ejecute (la de esa misma noche, si se acepta antes).
- Cada alianza es entre dos casas. Si A está aliada con B y B con C, A y C no lo están.
- No hay límite de alianzas por casa (por ahora).
- Una casa que ha roto una alianza no puede firmar otra durante una semana (7 días desde que la rompió).
- Las alianzas aprovechan el registro público de pactos: tienen nombre solemne ("la Alianza de la Roca Eterna") y Fray Abundio las cuenta en el boletín.

### 1.2 Mientras dura

- **Paso libre.** Las tropas de una casa pueden entrar en las casillas de su aliada y moverse por ellas sin combatir. Nunca en su castillo.
- **Tropas de paso.** Las tropas en una casilla aliada siguen siendo de su casa: no producen ni cuentan para el Prestigio de la casilla, pero sí para el mantenimiento de su casa (y desertan las primeras). Si atacan la casilla, suman a la defensa con el multiplicador de defensa de la casilla. Desde allí pueden moverse, atacar, apoyar, sitiar y llevar al Capitán.
- **Caminos y cargas.** Las casillas aliadas cuentan como propias para la casilla de en medio de una marcha por camino o una carga de jinetes.
- **Visión compartida.** Cada aliado ve lo mismo que el otro (como con la carta Espía, en las dos direcciones).
- **No agresión.** No se puede atacar ni sitiar una casilla del aliado, ni apoyar un ataque contra él. El servidor rechaza esas órdenes.
- **Aviso de Fray Abundio.** Si las tropas de un aliado dentro de tus casillas superan un umbral (`ALLIANCE.warnTroops`), te llega un aviso.

### 1.3 Ataque conjunto

Si dos aliados atacan la misma casilla de una tercera casa (o una casilla neutral) en la misma resolución:

- Hay una sola batalla. Las fuerzas de los dos aliados (y sus apoyos) se suman contra la defensa.
- Si ganan, la casilla es del aliado que entró con más tropas. En caso de empate, de quien dio antes la orden.
- Las bajas se reparten entre los dos en proporción a las tropas que llevó cada uno.
- Las tropas supervivientes del otro aliado se quedan en la casilla como tropas de paso.
- Si pierden, cada uno se repliega como hoy.

### 1.4 Romper una alianza

- Se puede romper en cualquier momento de la partida y no cuesta nada.
- La otra casa recibe un aviso al momento: la alianza deja de existir en tres resoluciones (`ALLIANCE.noticeResolutions`). El boletín lo anuncia a toda la mesa.
- **Durante el aviso:**
  - se corta la visión compartida;
  - ninguno puede atacar al otro;
  - no se puede entrar en casillas del otro;
  - sí se pueden mover las tropas propias que ya estén dentro, para sacarlas (o moverlas entre casillas del otro hacia la salida);
  - siguen sumando a la defensa si un tercero ataca la casilla donde están.
- **Al terminar el aviso**, las tropas que sigan en casillas de la otra casa vuelven al momento a la casilla propia más cercana (por distancia de hexágonos; en empate, la de id más bajo; si no tiene ninguna, a su castillo).
- La casa que rompe no puede firmar otra alianza durante una semana.

### 1.5 Victoria

Sigue habiendo un solo ganador. Las alianzas no suman Prestigio ni cuentan para ganar.

### 1.6 Por pensar más adelante

Una mecánica de traición propia (no entra en la primera versión). Ideas de partida: una alianza "jurada" que da Prestigio y cuesta el doble romper, una carta "Puñal" que permite un ataque sin aviso una vez por partida y una carta para ver las órdenes del aliado.

## 2. Valores ajustables (`rules.ts`)

```ts
export const ALLIANCE = {
  enabled: true,
  /** Resoluciones de aviso entre romper y que la alianza deje de existir. */
  noticeResolutions: 3,
  /** Días sin poder firmar otra alianza tras romper una. */
  cooldownDays: 7,
  /** Resoluciones que dura una propuesta sin contestar. */
  proposalResolutions: 3,
  /** Tropas de un aliado dentro de tus casillas a partir de las que avisa Fray Abundio. */
  warnTroops: 10,
  /** Máximo de alianzas por casa (null = sin límite). */
  maxPerHouse: null as number | null,
};
```

## 3. Pasos para hacerlo

Cada fase se prueba y se simula antes y después (`npm run simular`, con `--alianzas no` para comparar) y se anota en `docs/simulaciones.md`. Vale para todas las partidas (todas son de prueba). Las fases se agrupan en cuatro solicitudes de cambios (ver «Dudas resueltas»): fase 1; fases 5 y 6 en el simulador; fase 2, bots en las partidas de prueba y fase 4; fase 3.

### Fase 1: motor (`packages/engine`)

**Hecho** el 22 de octubre de 2026. `Alliance` (con `since`, la resolución en que empezó, para elegir la alianza más antigua) y `Tile.guests` en `types.ts`; `guest` en las tres clases de orden. `alliances.ts`: `allied` (en vigor), `bound` (en vigor o en aviso: no agresión), `alliesOf`, `attackSides` (bandos del ataque conjunto), `shareKept` (reparto de bajas), `expelGuests`, `nearestOwnTile`, `noticeEnd` y `takeGuests`. `resolveCampaign` y `checkOrders` reciben `alliances`; `marchKind`/`marchPath` reciben los aliados en vigor (`friends`) para la casilla de en medio y los puertos. Eventos nuevos: `movimiento` con `guest`, `expulsion`, y en `combate`, `allies`, `kept`, `aside` y `joint` en los bandos. `applyUpkeep`, `dismissTroops`, el objetivo de 40 tropas y el Torneo Real cuentan las tropas de paso; `projectForHouse` las muestra solo si se ve la casilla. Pruebas en `test/alianzas.test.ts`; sección 9.1 del diseño.

**Para la fase 2:** el motor no distingue una orden de ataque de una de entrar: una marcha a una casilla aliada siempre es una entrada. Por eso, al aceptar una alianza el servidor debe anular las órdenes (también las de la cola) de cada casa hacia casillas de la otra y avisar a su dueño (duda 4).

1. **Tipos** (`types.ts`):
   - `Alliance { a: HouseId; b: HouseId; status: "active" | "breaking"; endsAt: number | null }`. `endsAt` es la resolución en la que deja de existir.
   - `Tile.guests?: { house: HouseId; troops: number; jinetes?: number; catapultas?: number }[]` para las tropas de paso.
2. **`alliances.ts`** (nuevo): `allied(alliances, a, b)`, `breaking(...)`, `canEnter(tile, house, alliances)` y `expelGuests(tiles, alliances, resolution)`, que devuelve las casillas con las tropas de paso ya devueltas a la casilla propia más cercana (con `distance` de `map.ts`).
3. **Órdenes** (`combat.ts`, `checkOrders`):
   - Una orden de mover a una casilla aliada (no castillo) es válida y no es un ataque.
   - Las tropas de paso pueden recibir órdenes desde la casilla donde están (`from` = casilla aliada). Hace falta saber de quién son las tropas que salen: se añade `MoveOrder.guest?: true`.
   - Se rechazan los ataques, asedios y apoyos contra el aliado. Durante el aviso, también la entrada en sus casillas.
   - `marchKind` acepta casillas aliadas como casilla de en medio (solo con la alianza activa).
4. **Resolución** (`resolveCampaign`):
   - Recibe `alliances` en `CampaignInput`.
   - Las entradas en casillas aliadas se tratan como refuerzos, pero se guardan en `guests`.
   - En la defensa de una casilla se suman las tropas de paso.
   - **Ataque conjunto**: los atacantes aliados entre sí se agrupan en un solo bando; la fuerza es la suma; si ganan, el dueño se elige como en 1.3; las bajas, en proporción con `survivors` y `keepUnits` para cada uno.
   - Al final de la resolución, `expelGuests` para las alianzas cuyo `endsAt` sea esta resolución.
   - Los choques frontales y los cruces nunca ocurren entre aliados.
5. **Niebla** (`fog.ts`): la visión compartida se pasa como `spied`. `projectForHouse` muestra las tropas de paso propias y las del aliado.
6. **Mantenimiento y Capitán**: las tropas de paso cuentan en `weeklyUpkeep` de su casa; el Capitán puede ir con ellas y, si la casilla cae, cae preso igual que hoy.
7. **Pruebas** (`test/alianzas.test.ts`): paso libre, castillo vedado, tropas de paso que defienden, ataque conjunto (reparto de bajas, quién se queda la casilla, empate por orden), órdenes rechazadas, aviso de ruptura (se puede salir, no entrar) y expulsión a la casilla más cercana.
8. **Diseño**: nueva sección 9.1 "Alianzas" en `docs/diseno.md` y ejemplos en la sección 8.

### Fase 2: base de datos y servidor (`apps/server`)

1. **Migración `0016_alianzas.sql`** (nunca editar las anteriores):
   - Ampliar `pacts` creando una tabla nueva `alliances`: `id`, `game_id`, `name`, `house_a`, `house_b`, `proposed_by`, `status` (`proposed`, `active`, `breaking`, `ended`, `declined`), `signed_resolution`, `broken_by`, `broken_at`, `ends_resolution`, con `CHECK (house_a < house_b)` y un índice único para que no haya dos activas entre las mismas casas.
   - `tile_guests`: `game_id`, `tile_id`, `house_id`, `troops`, `jinetes`, `catapultas`, con `CHECK (troops >= 0)` y clave única `(tile_id, house_id)`.
   - `orders.guest INTEGER NOT NULL DEFAULT 0`.
2. **API** (`app.ts`), todas con comprobación de que la casa es del jugador:
   - `POST /api/partidas/:id/alianzas` (proponer, con nombre).
   - `POST /api/partidas/:id/alianzas/:aid/aceptar` y `/rechazar`.
   - `POST /api/partidas/:id/alianzas/:aid/romper`: pasa a `breaking` con `ends_resolution` = próxima resolución + `noticeResolutions` - 1, en un `db.batch()` con el aviso.
   - `GET /api/partidas/:id` añade las alianzas de la casa y las tropas de paso visibles.
3. **Tareas** (`jobs.ts`): la resolución pasa las alianzas al motor, guarda `tile_guests` y cierra las alianzas que terminan (`ended`), todo en el mismo lote con su clave de `resolutions`. **El simulador debe reproducir el mismo orden**.
4. **Niebla**: el servidor nunca envía más de lo que ve la casa; con la alianza activa, ve también lo del aliado.
5. **Avisos push** (`notify.ts`): propuesta recibida, alianza aceptada, alianza rota (con la fecha en que termina) y aviso de tropas dentro.
6. **Prueba de humo** (`prueba-humo`): proponer, aceptar, mover a casilla aliada, romper y expulsión tras tres resoluciones.

### Fase 3: cliente (`apps/web`)

1. **Panel de diplomacia**: lista de casas con botón de proponer alianza, propuestas recibidas, alianzas activas y en aviso (con cuántas noches quedan) y botón de romper con confirmación.
2. **Mapa**: borde o banderín del color del aliado en sus casillas; tropas de paso dibujadas aparte; el castillo aliado, marcado como no accesible.
3. **Órdenes**: mover a casilla aliada aparece como "entrar" (no "atacar"); las tropas de paso se pueden mover desde la casilla donde están; durante el aviso, solo hacia la salida.
4. **Repetición de la noche** (`NightReplay.tsx`): ataque conjunto con las dos banderas, reparto de bajas y expulsión al terminar la alianza.
5. **Proyección** (`apps/web/src/plan.ts`): tener en cuenta las alianzas para que el botón Simular coincida con el servidor.
6. Comprobar en móvil (390x844) con Playwright.

### Fase 4: Fray Abundio y boletín

1. Frases nuevas en `docs/banco-de-frases.md` y en `packages/engine/src/texts`: alianza firmada (solemne), alianza rota (de tribunal), ataque conjunto ganado o perdido, expulsión y aviso de tropas dentro.
2. El boletín semanal lista las alianzas firmadas, las rotas y las que están en aviso.
3. El título "Traidor de la Corona" cuenta las alianzas rotas.

### Fase 5: bots (`packages/engine/src/ai`)

**Hecho en el simulador** el 22 de octubre de 2026 (las partidas de prueba, en la solicitud 3). `ai/alliances.ts` (`planDiplomacy`, `breakReason`) con los pesos de `ALLIANCE_BOTS` en `rules.ts`. Proponen a una vecina que no sea el líder (antes a la que también linda con el líder) y no insisten durante 7 días si les rechazan; aceptan si quien propone no es el líder y no les ha atacado en 7 días; rompen si el aliado pasa a ser el líder, si les adelanta (las traicioneras), si dejan de compartir frontera o si tiene demasiadas tropas dentro. En las órdenes: no atacan a los aliados, se suman a un ataque que su aliado ya ha mandado (en el simulador ven las órdenes de sus aliados, como si lo hablaran), apoyan la defensa de las casillas aliadas amenazadas y sacan las tropas de paso hacia casa. Pruebas en `test/alianzas-bots.test.ts`.

1. **Proponer**: con una casa vecina con la que no está en guerra, si comparten un enemigo (o el líder es otra casa) y según la personalidad (`trade` y `leaderHatred` altos, `houseBias` bajo).
2. **Aceptar**: si quien propone no es el líder y no le ha atacado en la última semana.
3. **Romper**: cuando el aliado pasa a ser el líder, cuando ya no comparten frontera con ningún enemigo o cuando el aliado tiene muchas tropas dentro (más la personalidad oportunista).
4. **Usarla**: atacar a la vez la misma casilla que el aliado y cruzar sus casillas para llegar al frente; sacar las tropas en cuanto empieza un aviso.
5. Solo usan lo que vería una persona (`view.ts`). Las partidas de prueba (`pruebas.ts`) las usan igual.

### Fase 6: simulación y ajuste

**Hecho** el 22 de octubre de 2026: `npm run simular -- --alianzas no` compara, `--alianzas-tope 1` prueba el límite y `--alianzas-ganas 0.2` el umbral de los bots. Resultados en `docs/simulaciones.md`: ninguna alianza decide la partida, así que no hace falta freno.

1. `npm run simular` con y sin alianzas: cuántas se firman y se rompen, cuánto duran, si sube "el líder de la semana 2 gana", si las casas aliadas ganan más de lo esperado y si una alianza fija decide la partida.
2. Si una alianza de dos domina, probar `maxPerHouse: 1` o un coste de Prestigio por alianza activa, y anotarlo en `docs/simulaciones.md`.

## 4. Casos que hay que probar

| Caso | Resultado esperado |
| --- | --- |
| A mueve a una casilla de su aliada B | Entra sin combate; sus tropas quedan de paso. |
| A intenta entrar en el castillo de B | Orden rechazada. |
| C ataca una casilla de B con tropas de paso de A | Defienden las tropas de B y las de A juntas, con el multiplicador de la casilla. |
| A (6) y B (4) atacan a C (5) | Una batalla con 10 contra 5 × defensa; si ganan, la casilla es de A; las bajas, 60% para A y 40% para B. |
| A (5) y B (5) atacan a C a la vez | Gana la casilla quien dio antes la orden. |
| A rompe con B | B recibe el aviso; durante tres resoluciones A puede sacar sus tropas pero no entrar ni atacar. |
| Termina el aviso con tropas de A dentro de B | Vuelven al momento a la casilla de A más cercana. |
| A rompe y quiere aliarse con C al día siguiente | Rechazado hasta que pasen 7 días. |
| A ataca a B sin romper | Orden rechazada. |
| Alianza A-B y B-C | A y C no son aliadas: A puede atacar a C. |
