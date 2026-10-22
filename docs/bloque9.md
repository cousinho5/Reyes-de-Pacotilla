# Bloque 9: diseño de la sección Mapa

Decidido el 20 de octubre de 2026 · copia del documento «Reyes de Pacotilla: bloque 9, diseño de la sección Mapa» (claude.ai). No cambia reglas.

Este bloque decide qué información enseña el mapa y cómo se lee. Lo demás ya está decidido en otros bloques y no se toca aquí: el dibujo de las losetas, ríos, aldeas y ruinas (bloque 1); el mapa a pantalla completa, el zoom con pinza, la ficha que sube desde abajo, las órdenes arrastrando y el tamaño de los botones (bloque 6). Cómo se compone una orden y la lista de órdenes van en el bloque 12.

## Cómo es hoy

El mapa enseña bien el terreno y tus tropas, pero casi todo lo demás hay que adivinarlo o buscarlo fuera del mapa:

- Las casas solo se distinguen por el color del borde y un banderín pequeño, y en la niebla los colores casi no se ven.
- La etiqueta de tropas es igual para las tuyas y las del enemigo, y no dice si hay Jinetes o Catapultas.
- De cerca caben unas 3 casillas de ancho y no hay forma de saltar a tu castillo o a tus ejércitos.
- El parte de guerra, las amenazas y la ayuda están debajo del mapa.
- No hay leyenda de los iconos y bordes.
- La niebla no distingue lo que nunca has visto de lo que viste hace unas noches.
- Las noches en cola ocupan una fila entera encima del mapa.

## Qué hacen otros juegos

| Juego | Cómo lo hace | Qué sacamos |
| --- | --- | --- |
| [Civilization VI](https://forums.civfanatics.com/threads/more-lenses.606150) | «Lentes» que colorean las casillas según un criterio; algunas se encienden solas al elegir una unidad | Capas del mapa que salen solas cuando tocan |
| Battle for Wesnoth ([niebla](https://wiki.wesnoth.org/Fog), [sudario](https://wiki.wesnoth.org/Shroud)) | Lo nunca visto es negro; lo visto pero sin vigilar enseña el terreno con bruma que oculta las tropas | Distinguir «nunca visto» de «visto antes» |
| [Backstabbr](https://www.backstabbr.com/how-to-play) | Órdenes tocando la unidad y el destino; botones bajo el mapa en el móvil | Ya lo cubren los bloques 6 y 12 |
| [Neptune's Pride](https://www.chromeboard.com/extension/neptunes-pride-agent-gpcdekpemhpdcacfnafnflnlakelfefh) | Los jugadores se hicieron una extensión que añade al mapa llegadas y alcance de vista | Enseñar alcance y amenazas en el propio mapa |

## Decisiones

Revisadas con Pablo el 22 de octubre de 2026, antes de empezar a programar (las de la primera versión se han ajustado al mapa que dejó el bloque 6).

| Punto | Decisión |
| --- | --- |
| 1. Capas del mapa | Botón de capas arriba a la derecha con cuatro: Territorio (como hoy), Recursos (qué da cada casilla), Defensa (terreno, murallas y ríos) y Alcance. Elegida en el botón, Alcance enseña adónde llegan esta noche todos tus ejércitos, en tu color, y adónde llegan los enemigos que ves, con el rayado de las amenazas. Al elegir una casilla tuya con tropas se marcan solos sus destinos (sin pulsar «Mover o atacar») y, al cerrar la ficha, vuelve la capa que tenías. El alcance sale del motor (`marchKind`, `distance`), nunca calculado a mano. **A prueba:** si en el móvil molesta, se queda solo el botón |
| 2. Casas | Solo en la vista más lejana (todo el reino), un escudo de la casa en el centro de cada trozo de su territorio, para indicar de quién es. Sin nombres de casa ni de casilla. En los demás zooms, la casa se reconoce por la frontera de su color y por la etiqueta de tropas; desaparece el escudito de 14 px por trozo |
| 3. Tropas | Placa oscura como hoy, con una franja del color de la casa (el Negro y el Marrón no se leerían como fondo) y un borde de latón grueso si son tuyas. Un iconito si hay Jinetes o Catapultas. En la noche que planeas, lo que queda tras tus órdenes («6 → 2») |
| 4. Niebla | Dos estados: lo que ves esta noche, nítido; lo que no, en sepia. No hay nivel «nunca visto»: el dueño, el terreno y los asedios ya son públicos, así que no escondería nada. Sin recuerdo de las últimas tropas vistas. No cambia el servidor ni la base de datos |
| 5. Orientarse | Sin botones flotantes de zoom, «Mi castillo» ni «Siguiente ejército», y sin minimapa. El zoom se cambia con la pinza y con dos toques (en el ordenador, con doble clic o con Ctrl y la rueda); al abrir, el mapa se centra en tu castillo |
| 6. Parte de guerra y avisos | La hoja asomada de abajo (bloque 6) se reduce a una línea: «2 batallas · Ver la noche», «3 casillas amenazadas ›». Al tocar el aviso lleva a la casilla y, si se vuelve a tocar, a la siguiente. Los avisos van además en las propias casillas, con una flecha en el borde de la pantalla para los que quedan fuera |
| 7. Noches en cola | Una sola etiqueta arriba a la izquierda («Sáb 31 · 3 órdenes») que sustituye a la fila de noches; al tocarla abre las noches, y lleva un número si hay órdenes en otras noches. El bloque 12 le añade «· 2 sin orden» |
| 8. Leyenda | Al final del botón de capas, la leyenda de cada icono y cada borde. Sin primeros pasos guiados |

## Pasos

Van después del bloque 6, porque usan el mapa a pantalla completa y la ficha que sube desde abajo. Solo cliente: no hay migración.

1. **PR 1, tropas y escudos** (puntos 2 y 3): placa con franja de color y borde de latón, iconos de tipo, «6 → 2» en la noche planeada y escudos en la vista lejana (`MapView.tsx`, `apps/web/src/art`).
2. **PR 2, capas** (puntos 1, 5 y 8): botón de capas con las cuatro y la leyenda, en el sitio del botón de zoom, que se va (doble clic en el ordenador); destinos marcados al elegir una casilla tuya; Alcance de tus ejércitos y de los enemigos. La capa elegida se recuerda en el navegador.
3. **PR 3, avisos y noches** (puntos 6 y 7): hoja asomada en una línea que lleva a cada aviso, marcas en las casillas y flechas en el borde, etiqueta de la noche planeada.
4. **PR 4, niebla y comprobación** (punto 4 y final): niebla en sepia y comprobación en un móvil de 390x844 con Playwright, de cerca y con todo el reino, con 4 y con 8 casas.
