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

| Punto | Decisión |
| --- | --- |
| 1. Capas del mapa | Selector en una esquina con cuatro capas: Territorio (como hoy), Recursos (qué da cada casilla), Defensa (terreno, murallas y ríos) y Alcance (adonde llegan tus tropas esta noche). Al elegir una casilla tuya con tropas sale sola la capa de Alcance y, al cerrar la ficha, vuelve la que tenías. **A prueba:** si en el móvil molesta, se queda solo el selector |
| 2. Nombres y casas | Con todo el reino, el nombre de cada casa en grande sobre su territorio; de cerca, el nombre de cada casilla al pie. El escudo de la casa sustituye al banderín de color |
| 3. Tropas | Etiqueta del color de la casa, con borde dorado si son tuyas, y un iconito si hay Jinetes o Catapultas. En la noche que planeas, lo que queda tras tus órdenes («6 → 2») |
| 4. Niebla | Dos niveles: lo que ves esta noche, nítido; lo que no, en sepia; lo que nunca has visto, más oscuro. En la sepia, las últimas tropas que viste con su noche («4, hace 2 noches»), en gris. El servidor lo guarda por casa y nunca da más de lo que esa casa llegó a ver |
| 5. Orientarse | Botones «Mi castillo» y «Siguiente ejército» (pasa por tus casillas con tropas libres). Sin minimapa |
| 6. Parte de guerra y avisos | Una barra fina encima de las pestañas de abajo («2 batallas · Ver la noche», «3 casillas amenazadas»). Los avisos van además en las propias casillas, con una flecha en el borde de la pantalla para los que quedan fuera. Tocar el aviso de la barra lleva a la casilla |
| 7. Noches en cola | Etiqueta pequeña en la esquina («Planeando: sáb 31») que al tocarla abre las noches; lleva un número si hay órdenes en otras noches |
| 8. Leyenda | Botón «?» que abre la leyenda de cada icono y cada borde. Sin primeros pasos guiados |

## Pasos

Van después del bloque 6, porque usan el mapa a pantalla completa y la ficha que sube desde abajo.

1. **Tropas y nombres** (puntos 2 y 3): etiqueta del color de la casa, iconos de tipo, «6 → 2» en la noche planeada, escudos y nombres según el zoom. Solo cliente (`MapView.tsx`, `apps/web/src/art`).
2. **Capas** (punto 1): selector y las cuatro capas; la de Alcance sale sola al elegir una casilla tuya (a prueba). El alcance sale del motor (`marchKind`, `distance` de `map.ts`), nunca calculado a mano en el cliente.
3. **Avisos** (punto 6): barra de avisos y marcas en el borde de la pantalla.
4. **Orientarse y noches** (puntos 5 y 7): botones de salto y etiqueta de la noche planeada.
5. **Niebla con recuerdo** (punto 4): migración nueva con lo último visto por casa y casilla; se rellena en `jobs.ts` al resolver, en el mismo lote; la API lo envía solo a esa casa. Prueba de que nunca sale nada que la casa no vio.
6. **Leyenda** (punto 8): botón «?» con cada icono y cada borde.
7. **Comprobar en un móvil** de 390x844 con Playwright, de cerca y con todo el reino, con 4 y con 8 casas.
