# Bloque 3: mejora del cronista

Decidido el 20 de octubre de 2026 · copia del documento «Reyes de Pacotilla: bloque 3, mejora del cronista» (claude.ai).

Fray Abundio pasa a hablar dos veces por semana, a narrar la noche, a contar todo lo que pasa en la partida y a recordarlo. El bloque no cambia reglas, así que no hay nada que simular. Lo que cuenta respeta la niebla de guerra: cada casa solo lee lo que ve.

## Cómo es hoy

- **Dónde habla.** En el Boletín del Reino del domingo (combates de la semana, hasta 5 entre casas y 3 contra neutrales, clasificación, subasta, comercio, eventos, logros, mejoras, notas al margen y frases compradas con soborno). En la repetición de la noche solo pone cara; los textos son fijos. Los mensajes de la interfaz son frases fijas.
- **El banco.** 26 tipos y unas 190 frases en `packages/engine/src/texts/cronista.ts`. No repite una frase hasta agotar su tipo.
- **Lo que calla.** Asedios y castillos que caen, el Capitán preso y liberado, la Gloria, choques frontales, cargas, emboscadas y repliegues, deserciones, ayuda al último, treguas y Paz del Rey. Las frases de pactos están en `docs/banco-de-frases.md` pero no en el código. La Crónica Definitiva está escrita pero no se publica.
- **El ritmo.** Con una resolución al día, el boletín del domingo resume siete noches.

## Qué hacen otros juegos

| Juego | Su narrador | Qué sacamos |
| --- | --- | --- |
| [Darkest Dungeon](https://steamcommunity.com/app/262060/discussions/0/1474222595306279352) | Un narrador con voz comenta cada golpe | Gusta, pero cansa oír la misma frase muchas veces: hay que dosificar |
| [RimWorld](https://rimworldwiki.com/wiki/AI_Storytellers) | El narrador marca el ritmo de los sucesos | El cronista también puede marcar ritmo |
| [Neptune's Pride](https://bit-tech.net/reviews/gaming/pc/neptune-s-pride-war-diary-1/1/) | El juego no cuenta nada; la revista que lo jugaba sacaba un diario de guerra semanal | En una partida asíncrona entre amigos enganchan las alianzas rotas y las bravatas |

## Decisiones

| Punto | Decisión |
| --- | --- |
| 1. Cuándo habla | Dos boletines por semana: miércoles y domingo |
| 2. Repetición de la noche | Una frase del banco en cada paso (combate, choque, rebote, asedio, repliegue), corta y con las cifras exactas |
| 3. Frases nuevas | Para todo lo que hoy calla: asedios, Capitán, Gloria, batalla (choques, cruces, cargas, emboscadas, catapultas), hambre, la Corona (ayuda al último, treguas, Paz del Rey) y alianzas del bloque 8. De 6 a 8 por tipo |
| 4. Crónica Definitiva | Pergamino especial al acabar la partida, con los momentos clave contados a favor del ganador |
| 5. Memoria | Rivalidades, venganzas, récords y remontadas |
| 6. Proclamas | Cada casa puede mandar una frase propia por semana, de hasta 140 letras, que sale firmada en el boletín |
| 7. Resto del juego | Mensajes de la interfaz y notificaciones con frases variadas del banco, siempre con la información primero |
| 8. Boletín emergente | Al publicarse un boletín, sale en una ventana encima de cualquier pestaña, una vez, con una cruceta para cerrarla. Queda guardado en Reino |
| 9. Voz | Descartado de momento. Si se recupera: Cloudflare Workers AI (Aura-2 en español) tiene un cupo gratis de unos 3.600 caracteres al día, suficiente para leer los boletines |
| 10. Casas en su color | Cuando nombra una casa, el nombre sale en su color, con borde para que se lea en el pergamino, y al tocarlo se ve el escudo |
| 11. Dibujo | Fray Abundio nuevo de 48x48 con más detalle (hábito, tonsura, pluma, tintero, gafas) y animaciones cortas: parpadea, mueve la boca, moja la pluma, cabecea dormido y hace sonar las monedas |

## Dudas resueltas al empezar (23 de octubre)

| Duda | Respuesta |
| --- | --- |
| Boletín del miércoles | «Hoja volandera» corta: titular, armas, pactos y memoria. El domingo, el boletín completo con clasificación, sobornos y proclamas |
| Proclamas | Gratis, firmadas, solo en el boletín del domingo y editables hasta el cierre. Pueden nombrar a otras casas; sin enlaces |
| Memoria | Solo dentro de cada partida (nada entre partidas) |
| Repetición | Cuando el paso es de tu casa, Fray Abundio te habla de «vuestra merced». Solo en los combates |
| Crónica Definitiva | Pergamino de 8 a 12 momentos clave con letra capitular en pixel art, para compartir por WhatsApp como texto. Cada casa que pierde puede añadir una línea de «fe de erratas» al pie |
| WhatsApp | Un cuadradito de color (🟥🟦…) delante de cada casa en el texto compartido |
| Boletín emergente | Si hay dos sin leer, sale solo el último, con enlace al anterior |
| Reino | Este bloque hace el contenido, la ventana emergente y las casas en su color; la tarjeta del boletín y el sitio de las proclamas se rediseñan en el bloque 11 |
| Hambre | Las deserciones no salen en el boletín, porque delatarían que a la casa le falta Pan: solo las ve la propia casa |
| Cargas, brechas y ríos | El combate anota en cada atacante `charge` (cargan sus jinetes) y `breach` (sus catapultas abren brecha), junto al `river` que ya había. La emboscada y el castillo que cae salen del tipo de casilla. No cambia ninguna regla |

Las frases nuevas (borrador para revisar) están en el documento aparte del proyecto, `bloque3/frases-nuevas.md`.

## Pasos

1. ✅ **Frases nuevas** (PR 1, #76) en `docs/banco-de-frases.md` y en `texts/cronista.ts`. Se escriben y se revisan antes de meterlas.
2. ✅ **Boletín del miércoles** (PR 2): `jobs.ts` publica también el miércoles, con los hechos desde el último boletín.
3. **Repetición narrada** en `NightReplay.tsx`, con frases elegidas por la semilla para que no cambien al volver a verla.
4. **Memoria del cronista** en el motor (`bulletin.ts`), a partir del registro de la partida.
5. **Crónica Definitiva** al acabar la partida.
6. ✅ **Proclamas** (PR 2): tabla nueva (migración), un campo en Reino y su sitio en el boletín.
7. **Boletín emergente** y **casas en su color** en el cliente.
8. **Fray Abundio nuevo** en `apps/web/src/art/sprites.ts`, con sus animaciones (respetando «reducir movimiento»).
9. **Mensajes y notificaciones** con frases variadas.
10. **Pruebas** del boletín con partidas simuladas y capturas a 390x844.
