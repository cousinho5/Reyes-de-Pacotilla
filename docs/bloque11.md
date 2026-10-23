# Bloque 11: diseño de la sección Reino

Decidido el 20 de octubre de 2026 y hecho el 23 de octubre de 2026 (PR #81 a #84) · copia del documento «Reyes de Pacotilla: bloque 11, diseño de la sección Reino» (claude.ai), que tiene además la maqueta de la pestaña y de la ficha de casa. No cambia reglas.

Este bloque decide cómo se ordena y cómo se ve la pestaña Reino. Ya está decidido en otros bloques: el boletín en ventana al abrir el juego, las proclamas, la memoria del cronista, la Crónica Definitiva y el Fray Abundio nuevo de 48x48 (bloque 3); el panel de diplomacia (bloque 8); botones de 48x48 y hojas que suben desde abajo (bloque 6).

## Cómo es hoy

La pestaña mide unas 14 pantallas de móvil: el boletín entero, la tarjeta de coronación si la partida acabó, la clasificación (tercera) y la crónica del reino como una lista plana de todos los sucesos. No hay ficha de casa: al tocar una fila se despliega el desglose del Prestigio.

## Qué hacen otros juegos

| Juego | Cómo lo hace | Qué sacamos |
| --- | --- | --- |
| Hearthstone Battlegrounds | La clasificación de los ocho jugadores, siempre a la vista junto al tablero | La clasificación arriba y fácil de leer |
| Crusader Kings II (Charlemagne) | La crónica como un libro con capítulos | La crónica completa como libro por semanas |
| Civilization (de memoria) | Gráficas de puntuación a lo largo de la partida | La gráfica de la carrera |

## Decisiones

| Punto | Decisión |
| --- | --- |
| 1. Orden de la pestaña | Clasificación, gráfica, boletín, crónica y diplomacia, en ese orden |
| 2. Clasificación | Podio con los tres primeros (escudo grande, corona en el primero) y el resto en lista con flechas de movimiento desde la noche anterior, barra de distancia al primero y tu casa resaltada. Frase «Estás a N de Prestigio del podio» |
| 3. Gráfica de Prestigio | Una línea por casa y un punto por semana, con tu línea gruesa y la del primero marcada |
| 4. Boletín y soborno | Tarjeta de pergamino con Fray Abundio, el titular de la última noche, «Leer el boletín» y «Sobornar · 10 Oro». Dentro del boletín, enlace a los anteriores |
| 5. Crónica | Esta semana agrupada por noches, la última abierta y las demás plegadas con su número de sucesos. Filtros «Todo», «Solo lo mío» y «Batallas». «Ver toda la crónica» abre las semanas anteriores |
| 6. Ficha de casa | Al tocar una casa sube una hoja desde abajo: escudo, lema, puesto, Prestigio y movimiento; cuatro cifras (Casillas, Edificios, Gloria, Asedios); de dónde sale su Prestigio en una barra de colores; qué relación tiene contigo; lo último que ha hecho; «Ver en el mapa» y «Proponer alianza». En tu ficha, también tu objetivo secreto |
| 7. Diplomacia | Una tira en Reino, solo si hay algo pendiente (propuestas recibidas, alianzas en preaviso), que abre el panel del bloque 8. «Proponer alianza» en la ficha de cada casa |
| 8. Final de la partida | La pestaña se convierte en «La coronación»: podio grande con el ganador coronado, la Crónica Definitiva del bloque 3 y la gráfica de toda la partida |
| 9. Movimiento | Detalles ligeros: las cifras suben al llegar una noche nueva, las flechas aparecen una a una y la corona brilla un momento. Nada se mueve con «reducir movimiento» (`prefers-reduced-motion`) |

## Dudas resueltas (23 de octubre de 2026)

| Duda | Respuesta de Pablo |
| --- | --- |
| La foto de Prestigio solo se guardaba el domingo | Se guarda cada noche (misma tabla `prestige_snapshots`); las flechas comparan con la de la noche anterior a la última |
| Proclama y fe de erratas (bloque 3) | «Tu proclama» en la tarjeta del boletín, junto a Sobornar, en una hoja desde abajo; la fe de erratas, en «La coronación» |
| «Leer el boletín» | Abre la misma ventana de pergamino del boletín emergente, con «Boletines anteriores» dentro; fuera las pestañas de semanas |
| Diplomacia | El panel de alianzas sale de Comercio y pasa entero a Reino (plegado, al final); la tira, arriba, solo si hay algo pendiente; en Comercio, una línea que lleva a Reino |
| «Relación contigo» | Alianza (en vigor, en aviso o propuesta), batallas entre las dos casas (ganadas y perdidas), tratos cerrados y capitanes presos. Todo público |
| Gráfica | Un punto por domingo y uno más «Hoy» (o «Final»); al tocar una semana, las cifras de cada casa |
| Podio y corona | En pixel art con pxl: podio de madera y corona de 16x16 que brilla |
| Ideas nuevas | «Te pisan los talones: X, a N» bajo la frase del podio; tocar un escudo en Mapa o Comercio abre también la ficha de casa |

## Pasos

Van después de los bloques 3 (boletín, Crónica Definitiva y Fray nuevo), 6 (hojas inferiores) y 8 (panel de diplomacia).

1. **Orden de la pestaña** (punto 1) en `apps/web/src/components/Realm.tsx`.
2. **Clasificación nueva** (punto 2): podio, flechas y barras. El movimiento sale de comparar con la foto de la noche anterior en `prestige_snapshots`, que `jobs.ts` guarda desde este bloque en cada resolución (antes, solo el domingo).
3. **Gráfica** (punto 3): Prestigio por semana desde `prestige_snapshots`, en SVG con los colores de cada casa (`ENAMEL`). El total de cada casa ya es público en la clasificación, así que no sale nada de la niebla.
4. **Tarjeta del boletín** (punto 4) con `FRAY_SPRITES`, y lista de boletines anteriores dentro del boletín.
5. **Crónica por noches** (punto 5) con filtros, y la crónica completa por semanas.
6. **Ficha de casa** (punto 6) en hoja inferior. Solo lo que tu casa puede saber de las demás: nada de tropas ni recursos ajenos; el objetivo secreto solo en la tuya.
7. **Tira de diplomacia** (punto 7) y «Proponer alianza» en la ficha.
8. **«La coronación»** (punto 8) al acabar la partida.
9. **Movimiento** (punto 9), apagado con `prefers-reduced-motion`.
10. **Comprobar en un móvil** de 390x844 con una partida de prueba de 7 casas.

## Hecho

| PR | Qué |
| --- | --- |
| #81 | Foto de Prestigio cada noche, `historia` en la API, clasificación con podio, flechas y barras, y gráfica de la carrera |
| #82 | Tarjeta del boletín (soborno y proclama en hojas), «Leer el boletín» con los anteriores, crónica por noches con filtros y `GET /cronica/:semana` |
| #83 | Ficha de casa desde Reino, Mapa y Comercio; `cifras` y `relacion` en la API; alianzas de Comercio a Reino con su tira; «Te pisan los talones» |
| #84 | Podio de madera y corona de 16x16 en pxl (`docs/maquetas/bloque11/pxl/podio.px.js` → `apps/web/src/art/podio.ts`), cifras que suben, flechas una a una y corona que brilla al llegar una noche nueva (nada con «reducir movimiento»), y «La coronación» al acabar: ganador coronado, podio final, Crónica Definitiva con la fe de erratas y la carrera entera |

Comprobado en un móvil simulado de 390x844 con partidas de prueba de 7 casas (en juego y acabada); capturas en la carpeta `bloque11/` del proyecto. Falta probarlo en un móvil de verdad.
