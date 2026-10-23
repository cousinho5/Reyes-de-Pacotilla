# Bloque 13: historia y cinemáticas

Decidido el 20 de octubre de 2026 · copia del documento «Reyes de Pacotilla: bloque 13, historia y cinemáticas» (claude.ai), que tiene además la maqueta animada de las cinco cinemáticas. La maqueta también está en el repositorio: `docs/maquetas/bloque13-cinematicas.html` se abre en el navegador (mejor con el ancho de un móvil) y sus fuentes, con los dibujos nuevos como capas de píxeles hechas con código, están en `docs/maquetas/bloque13/` (cómo rehacerla, en `construir.mjs`). No cambia reglas.

Este bloque decide cómo se cuenta la historia que ya existe (diseño, sección 15): el rey Aldric muere atragantado con un hueso de pollo («combate singular contra un ave», según Fray Abundio), su testamento solo dice «que gobierne el más capaz», las llaves del tesoro han desaparecido y empieza el interregno. Ya está decidido en otros bloques: el Fray Abundio nuevo de 48x48, el banco de frases y la Crónica Definitiva (bloque 3), el rendimiento en móviles y «reducir movimiento» (bloque 6) y la pantalla «La coronación» de Reino (bloque 11).

## Cómo es hoy

La historia casi no se ve. Al empezar no se cuenta nada: se crea el escudo, se espera en la sala y se cae en Castillo. Los eventos de la semana son una línea en el boletín, el fantasma de Aldric solo sale en frases sueltas y al acabar hay una tarjeta de coronación en Reino. Lo único animado es la repetición de cada noche.

## Qué hacen otros juegos

| Juego | Cómo lo hace | Qué sacamos |
| --- | --- | --- |
| Stardew Valley | Una sola escena en pixel art (el abuelo y su sobre) cuenta la premisa en un minuto | Una escena corta y con gracia basta: la muerte de Aldric y el testamento |
| Reigns | Cada reinado acaba con la muerte del rey; el Espíritu del Caído vuelve tras cada muerte | El fantasma de Aldric al principio y al final de cada partida |
| Darkest Dungeon | Escena inicial con la historia del antepasado y un narrador único con frases cortas | Fray Abundio narra todo |
| Civilization VI, mod «Endgame Map Replay» | Al acabar, el territorio de la partida a lo largo del tiempo | El mapa de Aldricia semana a semana en la coronación |
| Accessible Player Experiences | Las escenas se pueden pausar y saltar | Todas se saltan con un toque y se pueden volver a ver |

## Decisiones

| Punto | Decisión |
| --- | --- |
| 1. Qué cinemáticas | Cinco: prólogo, coronación, evento de la semana, la última semana y el fantasma de Aldric. Fuera quedan «Tus grandes momentos» y «Cae la noche» |
| 2. Prólogo | 6 escenas, unos 45 segundos, con mucho detalle: título sobre Aldricia; el banquete; el ave (el rey mastica, tose y cae tras la mesa); el testamento con las llaves perdidas; los escudos y lemas de las casas de la partida; el mapa real con los castillos encendiéndose y el tuyo marcado. Acaba en «Entrar en mi castillo» |
| 3. Coronación | Completa, 60 a 90 segundos: campanas; el mapa entero semana a semana (al acabar ya no hay niebla); los objetivos secretos revelados uno a uno; un título cómico por casa; el podio; el fantasma de Aldric baja la corona sobre el escudo del ganador. Acaba en «La coronación» del bloque 11 y la Crónica Definitiva |
| 4. Títulos de fin de partida | Un título cómico por casa, calculado de lo que ha hecho, con frases del banco. Se ríen de lo que pasó, nunca de una persona |
| 5. Viñetas de los eventos | Viñeta propia para los 6 a 8 eventos más llamativos (por ejemplo, la plaga de ratas) y una común, el pregonero con el bando, para el resto. 6 a 8 segundos |
| 6. Tus grandes momentos | Descartado por el punto 1 |
| 7. Sonido | Ninguno de momento: la música ambiental del juego se añadirá más adelante |
| 8. Cómo salen | A pantalla completa la primera vez que se entra después del momento. Si hay varias pendientes, van en orden |
| 9. Volver a verlas | Lista en Reino, debajo de la crónica, con las que has visto en esta partida |
| 10. Compartir la coronación | Enlace a una página de la coronación de la partida, que solo existe cuando la partida ha acabado |
| 11. Calidad del dibujo | Al nivel del Fray Abundio de 48x48, con más fotogramas (masticar, toser, caer) |

## Las cinco cinemáticas

| Cinemática | Cuándo sale | Duración |
| --- | --- | --- |
| Prólogo: la muerte del rey | La primera vez que entras tras empezar la partida | Unos 45 segundos, 6 escenas |
| La coronación | La primera vez que entras tras la última resolución | 60 a 90 segundos |
| El evento de la semana | El martes, al anunciarse | 6 a 8 segundos |
| La última semana | Al empezar la semana 6: el reloj de arena, la clasificación y las noches que quedan | 5 segundos |
| El fantasma de Aldric | Cuando aparece en un boletín: flota, opina y Fray Abundio lo corrige | 4 segundos |

Todas salen una sola vez, se saltan con un toque y con «reducir movimiento» (`prefers-reduced-motion`) se ven como viñetas quietas.

## Cómo se hacen

- **Sin vídeo ni imágenes:** cada escena es una pila de capas (fondo, sprites en rejilla de texto con paleta en `apps/web/src/art`, texto en HTML) con animaciones sencillas. El texto nunca va dentro del dibujo.
- **Diseño en pxl:** los dibujos de cada escena se diseñan y se revisan primero en pxl (`docs/maquetas/bloque13/pxl/`). Una vez aprobados, pasan a `apps/web/src/art` con `scripts/pxl-a-juego.mjs` (proceso en `docs/pixel-art.md`). La primera prueba es el pregonero (`pxl/pregonero.px.js`).
- **Con los datos de la partida:** escudos, nombres, lemas, colores y mapa reales. Antes del final nunca enseñan nada fuera de la niebla de tu casa.
- **Un solo reproductor:** cada cinemática es una lista de escenas con su texto, su pie de Fray Abundio y su duración. Añadir una es añadir datos y dibujos.
- **Fray Abundio narra** con frases del banco: las cifras exactas y el humor en los adjetivos.

## Pasos

Van después de los bloques 3 (Fray nuevo, banco de frases y Crónica Definitiva), 6 (rendimiento en móvil) y 11 (pantalla «La coronación»).

**Hecho (PR 1):** el reproductor (`components/CinematicPlayer.tsx`, lienzo y ayudas de dibujo en `art/cinema.ts`), las cinemáticas como datos en `apps/web/src/cinematics.tsx`, la cola de las que salen solas en `cinematicQueue.ts` (como mucho 2 seguidas, más el prólogo y la coronación; las demás quedan como nuevas) y `components/CinematicQueue.tsx`, la migración 0020 (`cinematics_seen`) con la lista del servidor en `apps/server/src/cinematicas.ts` (`cinematicas` en el estado y `POST /cinematicas`), la lista de Reino (`CinematicList.tsx`) y el pregonero con el bando de cada evento (`art/pregonero.ts`, desde `pxl/pregonero.px.js`). El boletín apunta en `king` si salió el fantasma o la muerte del rey. La repetición de la noche y el boletín emergente esperan a que acabe la cinemática.

1. **Reproductor de cinemáticas** en el cliente: escenas con capas, texto y duración; tocar para avanzar, «Saltar», viñetas quietas con «reducir movimiento».
2. **Qué has visto:** una migración nueva guarda qué cinemáticas ha visto cada casa, para que salgan una sola vez en cualquier dispositivo y en orden si hay varias pendientes.
3. **Dibujos nuevos**, diseñados en pxl y pasados a `apps/web/src/art` con `scripts/pxl-a-juego.mjs`, al nivel del Fray de 48x48: rey Aldric con fotogramas (masticar, toser, caer), fantasma, corona, trono, llave, banquete y salón del trono.
4. **Prólogo** (punto 2) con los escudos, lemas y mapa de la partida.
5. **Títulos de fin de partida** (punto 4): función pura del motor que reparte un título por casa a partir del registro de la partida, con su prueba, y frases nuevas en `docs/banco-de-frases.md`.
6. **Coronación** (punto 3). `prestige_snapshots` ya guarda el Prestigio de cada resolución; falta guardar de quién era cada casilla al cerrar cada semana (migración nueva y tarea idempotente en `jobs.ts`). El mapa entero solo se envía cuando la partida ha acabado. Enlace para compartirla (punto 10).
7. **Evento de la semana** (punto 5): viñetas propias para los eventos elegidos y el pregonero para el resto.
8. **Última semana y fantasma de Aldric.**
9. **Lista para volver a verlas** en Reino (punto 9).
10. **Comprobar en un móvil** de 390x844 con una partida de prueba: que vayan fluidas, que se puedan saltar y que no enseñen nada fuera de la niebla antes del final.
