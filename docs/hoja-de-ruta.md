# Reyes de Pacotilla: hoja de ruta

Actualizada el 20 de octubre de 2026 · copia del documento «Reyes de Pacotilla: hoja de ruta» (claude.ai)

Primero se definen todos los bloques; después se hacen uno a uno, en el orden de la tabla. Cada bloque conserva su número aunque cambie de puesto, porque los documentos y el código lo citan así (`docs/bloque4.md`, «bloque 4» en `rules.ts`). Se pueden añadir o mover bloques sobre la marcha.

| Orden | Bloque | Estado | Qué entra |
| --- | --- | --- | --- |
| 1.º | 1. Mapa y losetas | Decidido, siguiente en hacerse | Geografía, ríos, Prado, Aldea, Ruinas y marco de mar y montañas |
| 2.º | 4. Retoques sistema de batalla | Decidido | Apoyo sin origen, jinete más caro, Capitán libre, choques en el camino y fortificación con mantenimiento |
| 3.º | 5. Retoques recursos | Decidido | Oro en todas las mejoras, cambio con la Corona, mercenarios de alquiler y mejoras con algo más de Madera y Piedra |
| 4.º | 8. Alianzas | Decidido | Alianzas formales: paso por las casillas del aliado, ruptura con aviso de tres días y ataques conjuntos |
| 5.º | 6. Optimización y controles en móvil | Decidido | Mapa guardado y dibujado en segundo plano, zoom con pinza, ficha que sube desde abajo, órdenes arrastrando, botones de 48 y juego sin conexión |
| 6.º | 9. Diseño de la sección Mapa | Decidido | Capas (con Alcance automático), escudos y nombres, tropas por color y tipo, niebla con recuerdo, botones de salto, barra de avisos y leyenda |
| 7.º | 12. Diseño de la sección Órdenes | Decidido | Verbo según el destino, botones de tropas, cambiar órdenes, tarjetas agrupadas, simulación con «¿Y si atacan?», repetir asedios y aviso 1 hora antes del cierre |
| 8.º | 2. Vista del castillo y construcciones | Decidido | Escena del castillo en pixel art, un dibujo por nivel de cada edificio y castillo que crece |
| 9.º | 10. Diseño de la sección Comercio | Decidido | Lo urgente arriba, oferta en dos líneas con «Precio justo», valor en Oro de la Corona, aceptar en gris, ofertas que caducan, Corona en Comercio e hilo del trato con frase |
| 10.º | 3. Mejora del cronista | Decidido | Fray Abundio: dos boletines por semana, repetición narrada, frases nuevas, memoria, proclamas y dibujo nuevo |
| 11.º | 11. Diseño de la sección Reino | Decidido | Clasificación con podio y flechas arriba, gráfica de la carrera, boletín en tarjeta, crónica por noches, ficha de casa, tira de diplomacia y pantalla de coronación |
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

## Bloque 6: optimización y controles en móvil **(decidido, pendiente de hacer)**

Decidido el 20 de octubre de 2026. Las medidas, las decisiones y los pasos están en `docs/bloque6.md`. No cambia reglas.

**Decisiones:**

1. **Dibujo del mapa:** se guarda en el móvil y se prepara en segundo plano, con una vista previa mientras tanto.
2. **Zoom:** pinza y doble toque en 3 niveles; el botón se queda.
3. **Ficha de la casilla:** hoja que sube desde abajo, sin tapar la casilla.
4. **Mapa a toda pantalla** con una barra fina de recursos; reloj y evento en una etiqueta.
5. **Todo lo que se toca, de 48x48** como mínimo.
6. **Órdenes con el dedo:** arrastrar de una casilla a otra (con confirmación) y mantener pulsado para la información rápida.
7. **Sin conexión:** abre al instante y enseña lo último visto; letras más ligeras y cada pestaña al abrirla.
8. **Detalles:** muesca y bordes, sin zoom de página con la pinza ni el doble toque (solo el mapa), ayudas al tocar, altura correcta, vibración opcional y repetición más ligera.

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

## Bloque 9: diseño de la sección Mapa **(decidido, pendiente de hacer)**

Decidido el 20 de octubre de 2026. Las decisiones y los pasos están en `docs/bloque9.md`. No cambia reglas.

**Decisiones:**

1. **Capas:** Territorio, Recursos, Defensa y Alcance; la de Alcance sale sola al elegir una casilla tuya (a prueba).
2. **Nombres y casas:** nombres de casa con todo el reino y de casilla de cerca; escudo en lugar del banderín.
3. **Tropas:** etiqueta del color de la casa, iconos de Jinetes y Catapultas, y «6 → 2» en la noche planeada.
4. **Niebla:** dos niveles y recuerdo de las últimas tropas vistas, guardado por casa.
5. **Orientarse:** botones «Mi castillo» y «Siguiente ejército», sin minimapa.
6. **Avisos:** barra fina sobre las pestañas y marcas en las casillas, con flecha en el borde.
7. **Noches en cola:** etiqueta «Planeando: …» en la esquina.
8. **Leyenda:** botón «?», sin primeros pasos.

## Bloque 10: diseño de la sección Comercio **(decidido, pendiente de hacer)**

Decidido el 20 de octubre de 2026. Las decisiones y los pasos están en `docs/bloque10.md`. Solo cambia una regla: las ofertas caducan.

**Decisiones:**

1. **Orden:** Para ti, Mercado y Tus ofertas arriba; la subasta en una línea si está cerrada.
2. **Hacer una oferta:** dos líneas Das y Pides, con «Precio justo».
3. **Precio:** valor en Oro con los precios de la Corona, sin etiquetas.
4. **Aceptar:** en gris si falta algo, con filtro «solo las que puedo aceptar».
5. **Caducidad:** a las 3 resoluciones.
6. **Qué busca cada casa:** nada nuevo; se publica una oferta.
7. **Corona y mercenarios:** la Corona en Comercio; los mercenarios en Castillo.
8. **Contraofertas:** hilo en una tarjeta y frase corta.

## Bloque 11: diseño de la sección Reino **(decidido, pendiente de hacer)**

Decidido el 20 de octubre de 2026. Las decisiones y los pasos están en `docs/bloque11.md`; la maqueta, en el documento del bloque. No cambia reglas.

**Decisiones:**

1. **Orden:** clasificación, gráfica, boletín, crónica y diplomacia.
2. **Clasificación:** podio, flechas desde la noche anterior, barras y tu casa resaltada.
3. **Gráfica:** Prestigio por semana, tu línea gruesa.
4. **Boletín:** tarjeta con Fray Abundio, titular, «Leer el boletín» y «Sobornar».
5. **Crónica:** esta semana por noches, con filtros.
6. **Ficha de casa:** hoja inferior con escudo, cifras, Prestigio y relación contigo.
7. **Diplomacia:** tira con lo pendiente y «Proponer alianza» en la ficha.
8. **Final:** pantalla «La coronación».
9. **Movimiento:** ligero, respeta «reducir movimiento».

## Bloque 12: diseño de la sección Órdenes **(decidido, pendiente de hacer)**

Decidido el 20 de octubre de 2026. Las decisiones y los pasos están en `docs/bloque12.md`. No cambia reglas de combate.

**Decisiones:**

1. **Cuántas tropas:** botones «−» y «+», con «Todas» y «La mitad».
2. **Tipo de orden:** el destino propone el verbo (Mover, Atacar, Entrar, Apoyar, Sitiar) y se puede cambiar.
3. **Cambiar una orden:** tocar su flecha o su línea la abre.
4. **Dónde se repasan:** pestaña Órdenes rediseñada y etiqueta en el mapa con la lista rápida.
5. **Avisos:** notificación diaria 1 hora antes del cierre, que pide dar órdenes a quien no las ha dado.
6. **Lista:** tarjetas agrupadas por objetivo, con la cuenta de fuerza.
7. **Simulación:** resultado en cada orden y botón «¿Y si atacan?».
8. **Repetir:** «Repetir cada noche» en asedios y apoyos a la defensa.
9. **Quitar:** papelera de 48x48 con «Deshacer».

## Bloque 13: historia y cinemáticas **(por definir)**

Por definir. Lo hablaremos y lo decidiremos todo antes de empezar.
