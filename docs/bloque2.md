# Bloque 2: vista del castillo y construcciones

Decidido el 19 de octubre de 2026 · copia del documento «Reyes de Pacotilla: bloque 2, vista del castillo y construcciones» (claude.ai).

La pestaña Castillo pasa a enseñar un dibujo de tu castillo, con tus banderas y el sitio de cada edificio, y cada mejora de un edificio se ve distinta. El bloque no cambia reglas: no hace falta simular ni migrar la base de datos. Casi todo es del cliente; el servidor solo tiene que enviar la etapa de los castillos que cada casa ve en el mapa.

## Cómo es hoy

La pestaña Castillo es una columna de tarjetas sin ningún dibujo: Tesoro, Cartas de la Corona, Edificios (Granja, Aserradero, Cantera, Mina y Mercado, niveles 1 a 5, con el 5 como obra maestra), Reclutar, Capitán, Objetivo secreto, Si te ausentas y Avisos. El castillo solo se ve en el mapa, en su loseta.

El dibujo del mapa (`apps/web/src/art/world.ts`) ya pinta el castillo con torre del homenaje, muralla almenada, torres con tejado cónico, banderas con el color de la casa, puerta con rastrillo, escudo y casitas. Sus piezas (sillería, almenas, tejados, casitas, mástiles, sombras) se pueden reutilizar a mayor tamaño.

## Qué hacen otros juegos

| Juego | Cómo es la vista | Qué sacamos |
| --- | --- | --- |
| [Guerras Tribales](https://support.innogames.com/kb/TribalWars/en_DK/2960) | Aldea dibujada; cada edificio cambia de dibujo al crecer. Se puede pasar a una vista «clásica» en lista | Dibujo y lista conviven |
| [Travian: Kingdoms](https://support.kingdoms.com/en/articles/64-buildings-and-resource-fields) | Se toca un edificio para mejorarlo | El dibujo es también el menú |
| [Ikariam](https://ikariam.fandom.com/wiki/Building:Town_hall_(Pre_8.8)) | La ciudad cambia de fondo y gana calles, parques y fuentes cada pocos niveles | El crecimiento se nota en la escena entera |
| [Ikariam, extensiones de jugadores](https://chromewebstore.google.com/detail/ajadldpgpliefphimkcmoggeidkilpod) | Añaden tablas y resúmenes a la vista dibujada | Las cifras tienen que estar a mano |

## Decisiones

| Punto | Decisión |
| --- | --- |
| 1. Escena | Vista de frente: el castillo en el centro con tus banderas y tu escudo, y los cinco edificios en sitios fijos alrededor. El pixel art tiene que estar muy bien hecho, detallado y bonito: es el centro de la pestaña |
| 2. Niveles | Un dibujo distinto por cada nivel de cada edificio (25 en total) |
| 3. Toques | Escena arriba; tocar un edificio abre su ficha (nivel, producción, coste y Mejorar) y tocar el castillo abre Reclutar. Debajo, la lista de edificios, rehecha más bonita para que encaje con la escena |
| 4. Estado en la escena | Aplazado: guarnición, Capitán, obras, hora del día, amenazas, recursos o hambre se deciden al ver cómo queda el resto y el espacio que sobra |
| 5. El castillo crece | Solo de adorno: gana torres, muralla y estandartes según la suma de los niveles de tus edificios, en 5 etapas. No cambia las reglas |
| 6. En el mapa | La loseta del castillo también cambia con su etapa. Solo la ve quien ya ve esa loseta |
| 7. Movimiento | Pequeñas animaciones (banderas, humo, el molino de la granja), apagadas si el móvil pide menos movimiento |

Ideas de partida para los niveles (se afinan con los bocetos):

| Edificio | Nivel 1 | Nivel 3 | Nivel 5 (obra maestra) |
| --- | --- | --- | --- |
| Granja | Choza y un surco de trigo | Granero de piedra y campos | Molino de viento |
| Aserradero | Tronco y hacha | Sierra de agua | Gran taller con grúa |
| Cantera | Hueco en la roca | Andamios y bloques | Cantera escalonada con polea |
| Mina | Boca de mina con vagoneta | Castillete de madera | Torre de extracción con fragua |
| Mercado | Un puesto con toldo | Plaza con varios puestos | Lonja con soportales y banderolas |

## Pasos

1. **Piezas de dibujo.** Sacar de `world.ts` las piezas que se repiten a un módulo común, sin cambiar cómo se ve el mapa.
2. **Bocetos.** Escena y edificios en pixel art para revisarlos antes de seguir.
3. **Escena del castillo.** Componente nuevo en `apps/web/src/art` a escala de móvil (unos 390 píxeles de ancho), con los colores y el escudo de la casa.
4. **Edificios por nivel.** Los 25 dibujos.
5. **Crecimiento del castillo** (5 etapas) en la escena y en la loseta del mapa (`world.ts`). La etapa se calcula en el cliente con los niveles que ya ve cada casa; para la loseta ajena hace falta que el servidor envíe la etapa a quien ve esa loseta, sin enseñar los niveles.
6. **Toques y lista** rehecha.
7. **Animaciones**, respetando «reducir movimiento».
8. **Comprobación** con Playwright a 390x844 y capturas de los 5 niveles de cada edificio y de las 5 etapas del castillo.
