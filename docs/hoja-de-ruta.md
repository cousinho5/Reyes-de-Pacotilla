# Reyes de Pacotilla: hoja de ruta

Actualizada el 20 de octubre de 2026 · copia del documento «Reyes de Pacotilla: hoja de ruta» (claude.ai)

Primero se definen todos los bloques; después se hacen uno a uno, en el orden de la tabla. Cada bloque conserva su número aunque cambie de puesto, porque los documentos y el código lo citan así (`docs/bloque4.md`, «bloque 4» en `rules.ts`). Se pueden añadir o mover bloques sobre la marcha.

| Orden | Bloque | Estado | Qué entra |
| --- | --- | --- | --- |
| 1.º | 1. Mapa y losetas | Decidido, siguiente en hacerse | Geografía, ríos, Prado, Aldea, Ruinas y marco de mar y montañas |
| 2.º | 4. Retoques sistema de batalla | Decidido | Apoyo sin origen, jinete más caro, Capitán libre, choques en el camino y fortificación con mantenimiento |
| 3.º | 5. Retoques recursos | Decidido | Oro en todas las mejoras, cambio con la Corona, mercenarios de alquiler y mejoras con algo más de Madera y Piedra |
| 4.º | 8. Alianzas | Decidido | Alianzas formales: paso por las casillas del aliado, ruptura con aviso de tres días y ataques conjuntos |
| 5.º | 6. Optimización y controles en móvil | Por definir | Rendimiento y manejo con el dedo |
| 6.º | 9. Diseño de la sección Mapa | Por definir | Mejorar el diseño de la pestaña Mapa |
| 7.º | 12. Diseño de la sección Órdenes | Por definir | Mejorar el diseño de la pestaña Órdenes |
| 8.º | 2. Vista del castillo y construcciones | Decidido | Escena del castillo en pixel art, un dibujo por nivel de cada edificio y castillo que crece |
| 9.º | 10. Diseño de la sección Comercio | Por definir | Mejorar el diseño de la pestaña Comercio |
| 10.º | 3. Mejora del cronista | Decidido | Fray Abundio: dos boletines por semana, repetición narrada, frases nuevas, memoria, proclamas y dibujo nuevo |
| 11.º | 11. Diseño de la sección Reino | Por definir | Mejorar el diseño de la pestaña Reino |
| 12.º | 13. Historia y cinemáticas | Por definir | Historia del juego y cinemáticas |
| 13.º | 7. Mejorar pagina de inicio del juego | Por definir | Mejorar visualmente la pantalla de inicio al acceder al juego. |

**Por qué este orden:**

- **Primero las reglas (1, 4, 5 y 8).** Cambian lo que se puede hacer en el juego. Si se rediseñan antes las pantallas, habría que rehacerlas: el mapa nuevo, el Capitán libre, la Corona, los mercenarios y las alianzas necesitan su sitio en ellas. Batalla va antes que recursos porque el jinete a 3 de Oro cuenta para el Oro, y las alianzas van al final de las reglas porque se apoyan en el apoyo sin origen y en los ataques conjuntos.
- **Después el móvil (6).** Fija cómo se toca, se arrastra y se carga todo, para que los rediseños lo usen desde el principio.
- **Luego cada pantalla, junto a lo suyo.** Mapa y Órdenes (9 y 12) juntos, porque las órdenes se dan en el mapa. Después Castillo (2) y Comercio (10), donde van la Corona y los mercenarios.
- **El cronista (3), cuando ya existe todo lo que tiene que contar.** Sus frases nuevas cubren asedios, alianzas, la Corona y los mercenarios. Justo detrás, Reino (11), que es donde viven el boletín y las proclamas.
- **Al final, lo que presenta el juego terminado.** Historia y cinemáticas (13), que usan el arte y el Fray Abundio nuevos, y la página de inicio (7), que puede enseñarlas.

## Bloque 1: mapa y losetas

Decidido el 18 de octubre a partir de Reyes de Pacotilla: evaluación del mapa y las losetas. Cada fase se simula antes y después, y solo afecta a partidas nuevas: las que están en curso conservan su mapa.

**Decisiones:**

- No se agranda la tierra jugable. A cambio, el tablero lleva un marco de mar y montañas que no se juega.
- No se agrandan las losetas por ahora. El detalle saldrá de variantes por tipo y de la geografía. Al final se prueba un dibujo a ×1,5 en una sola loseta.
- Los ríos tienen regla: atacar cruzando un río da +25% al defensor. Los puentes no tienen penalización.
- La Aldea permite reclutar, como el castillo.
- Las Ruinas dan recursos o una carta, al azar (sale de la semilla de la partida).
- El Prestigio por loseta baja de 3 a 2.

**Fases:**

0. **Prestigio por loseta de 3 a 2**, con su simulación.
1. **Geografía y Prado.** Generador con altura, humedad, dos costas y ajuste de salida. El Prado (sin recursos, 1 de Prestigio, 2 de guarnición, llano) sustituye a parte de los páramos y los campos. Marco de mar y montañas alrededor. Se revisa el objetivo «puerto y fortaleza». *Se da por buena si* la justicia entre castillos queda como ahora (diferencia de entorno de 1,2 como mucho) y hay al menos un 50% más de vecinas del mismo terreno.
2. **Ríos, puentes y lagos.** Se guardan como rasgos del mapa (migración nueva). *Se da por buena si* no sube «el líder de la semana 2 gana» y ningún castillo queda encerrado.
3. **Aldea y Ruinas.** Una aldea por casa en la tierra de en medio, donde se puede reclutar. Unas ruinas por cada dos casas, con recursos o una carta para la primera casa que entre; después quedan como Prado. *Se da por buena si* los bots toman las ruinas en la primera semana y la aldea no dispara la bola de nieve.
4. **Dibujo.** Variantes por tipo de loseta, costa, ríos con puentes, aldea y ruinas. Prueba del dibujo a ×1,5 en una loseta.

La partida piloto con amigos puede empezar tras la fase 1 o la 2.

## Bloque 2: vista del castillo y construcciones **(decidido, pendiente de hacer)**

Decidido el 19 de octubre de 2026. Las decisiones y los pasos están en `docs/bloque2.md`. No cambia reglas.

**Decisiones:**

1. **Escena de frente** en la pestaña Castillo: tu castillo en el centro con tus banderas y tu escudo, y los cinco edificios alrededor. Pixel art muy detallado y bonito.
2. **Un dibujo por nivel** de cada edificio (25 en total).
3. **Tocar un edificio** abre su ficha y tocar el castillo abre Reclutar. Debajo, la lista de edificios, rehecha más bonita.
4. **Lo que cuenta la escena** (guarnición, Capitán, obras, hora del día…): aplazado hasta ver el espacio que queda.
5. **El castillo crece** de adorno según la suma de los niveles de tus edificios, en 5 etapas.
6. **La loseta del castillo en el mapa** también cambia con su etapa.
7. **Pequeñas animaciones**, apagadas si el móvil pide menos movimiento.

## Bloque 3: mejora del cronista **(decidido, pendiente de hacer)**

Decidido el 20 de octubre de 2026. Las decisiones y los pasos están en `docs/bloque3.md`. No cambia reglas.

**Decisiones:**

1. **Dos boletines por semana**, miércoles y domingo.
2. **Fray Abundio narra la repetición de la noche**, con una frase por paso.
3. **Frases nuevas** para asedios, Capitán, Gloria, batalla, hambre, la Corona y alianzas.
4. **Crónica Definitiva** al acabar la partida, en un pergamino especial.
5. **Memoria:** rivalidades, venganzas, récords y remontadas.
6. **Proclamas:** una frase propia por casa y semana (hasta 140 letras) en el boletín.
7. **Frases variadas** en mensajes y notificaciones.
8. **Boletín emergente** una vez al publicarse, con cruceta para cerrar.
9. ~~Voz~~: descartado de momento.
10. **Casas en su color** en los textos del cronista.
11. **Fray Abundio nuevo**, de 48x48 y animado.

## Bloque 4: retoques del sistema de batalla **(decidido, pendiente de hacer)**

Decidido el 19 de octubre de 2026 a partir de «Reyes de Pacotilla: investigación del bloque 4». Las reglas completas y los pasos para hacerlo están en `docs/bloque4.md`. Cada punto se hace con su prueba, su simulación en `docs/simulaciones.md` y la sección 8 de `docs/diseno.md`. El motor ya tiene casi todo detrás de `BATTLE_TWEAKS` (`rules.ts`), apagado.

**Decisiones:**

1. **Apoyo sin elegir origen.** Eliges una casilla y marcas «apoyar ataque»: apoyas el primer ataque que llegue a esa casilla esa noche, sea tuyo o de otra casa. Si dos casas atacan esa casilla la misma noche, el primero es siempre el tuyo si atacas tú; si no, el de la orden que se dio antes. Tu apoyo puede acabar ayudando a un enemigo que se adelantó.
2. **Mesnada frente a jinetes.** El jinete pasa a costar 3 Hierro + 2 Pan + 3 Oro (antes 1 Oro).
3. **Capitán como unidad propia.** Se puede mover solo entre casillas propias, también a una vacía, sin atacar. Si atacan la casilla donde está solo, cae preso. Se libera a las 7 noches o con un rescate negociado: quien lo tiene pide un precio y su casa acepta o no.
4. **Cruces en el camino.** Si dos grupos se cruzan por el camino (por ejemplo, Mesnada de A a B y jinetes de C a A pasando por B), combaten como en un choque frontal.
5. **Fortificación hasta que la atacan.** Dura hasta el primer ataque, gane o pierda. Cada domingo se paga un mantenimiento por casilla fortificada; si no se paga, se desmantela. Cuesta 2 de Piedra por casilla (elegido tras simular, ver `docs/simulaciones.md`).
6. ~~Dos guerras a la vez~~: descartado.

## Bloque 5: retoques de recursos **(decidido, pendiente de hacer)**

Decidido el 20 de octubre de 2026. Las decisiones, los datos y los pasos están en `docs/bloque5.md`. El cambio con la Corona y los mercenarios ya están en el motor para el simulador, apagados (`ECONOMY_TWEAKS` en `rules.ts`).

**Decisiones:**

1. **Oro en las mejoras:** 5 de Oro al nivel 2, 10 al 3, 20 al 4 y 30 al 5. El objetivo «tesoro» baja a 100 de Oro.
2. **Cambio con la Corona:** la Corona vende recursos por Oro a un precio dinámico (escasez en el reino y compras de la última semana, más un 30%). Solo vende. Tope de 20 unidades de cada recurso por casa y semana.
3. **Mercenarios de alquiler:** 6 de Oro por tropa, se van a los 7 días, no comen, como mucho 5 por semana.
4. ~~Espías~~: descartado de momento.
5. **Riqueza:** como hoy.
6. **Madera y Piedra:** las mejoras piden un 15% más. El objetivo «niveles 17» baja a 16.

## Bloque 6: optimización y controles en móvil **(por definir)**

Por definir. Lo hablaremos y lo decidiremos todo antes de empezar.

## Bloque 7: Mejorar pagina de inicio del juego **(por definir)**

## Bloque 8: Alianzas **(decidido, pendiente de hacer)**

Propuesto y decidido el 19 de octubre de 2026, a partir de Reyes de Pacotilla: investigación de las alianzas. Las reglas completas y los pasos para hacerlo están en `docs/alianzas.md`. Ya existe una base: la tabla `pacts` de la base de datos (sin uso todavía) y los apoyos entre casas distintas.

**Decisiones:**

- **Paso libre.** Si estás aliado con otra casa, puedes entrar en sus casillas sin atacarla y moverte por ellas. Las tropas aliadas no pueden entrar en el castillo del otro.
- **Tropas de paso.** Las tropas aliadas que estén en una casilla del otro suman a su defensa si la atacan.
- **Visión compartida.** Los aliados ven lo que ve el otro.
- **Aviso de Fray Abundio** cuando un aliado acumula muchas tropas dentro de tus casillas.
- **Ruptura con aviso.** Una alianza se puede romper en cualquier momento, también al final de la partida, y romperla con aviso no cuesta nada.
  - A la otra casa le sale un mensaje: la alianza deja de existir en tres días (tres resoluciones). El aviso sale también en el boletín, para toda la mesa.
  - Durante el aviso se corta la visión compartida, ninguno puede atacar al otro y no se puede entrar en casillas del otro. Sí se pueden mover las tropas propias que ya estén dentro, para sacarlas.
  - Cuando desaparece, las tropas que sigan en casillas de la otra casa vuelven al momento a la casilla propia más cercana.
  - Quien rompe no puede aliarse otra vez durante una semana.
  - Atacar a un aliado sin romper antes la alianza no es posible.
- **Ataque conjunto.** Si dos aliados entran a la vez en la casilla de una casa que no pertenece a la alianza, hay una sola batalla: se suman las tropas de los dos contra las del otro. Las bajas se reparten entre los dos en proporción a lo que llevó cada uno. Si ganan, se queda la casilla el aliado que entró con más tropas; en caso de empate, quien dio antes la orden.
- **Sin límite de alianzas** por ahora. Cada alianza es entre dos casas: si A está aliada con B y B con C, A y C no lo están.
- **Un solo ganador.** Las alianzas no cuentan para ganar.
- **Los bots** aprenden a proponer, aceptar y romper alianzas, para que las partidas de prueba se parezcan a las reales.

**Por pensar más adelante:** una mecánica de traición propia (no entra en la primera versión).

## Bloque 9: diseño de la sección Mapa **(por definir)**

Por definir. Lo hablaremos y lo decidiremos todo antes de empezar.

## Bloque 10: diseño de la sección Comercio **(por definir)**

Por definir. Lo hablaremos y lo decidiremos todo antes de empezar.

## Bloque 11: diseño de la sección Reino **(por definir)**

Por definir. Lo hablaremos y lo decidiremos todo antes de empezar.

## Bloque 12: diseño de la sección Órdenes **(por definir)**

Por definir. Lo hablaremos y lo decidiremos todo antes de empezar.

## Bloque 13: historia y cinemáticas **(por definir)**

Por definir. Lo hablaremos y lo decidiremos todo antes de empezar.
