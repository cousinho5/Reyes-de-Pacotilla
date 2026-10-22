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

## Revisión del 22 de octubre

Antes de empezar se repasó el documento con el código y con 240 partidas simuladas. Lo que quedó decidido con Pablo:

| Punto | Decisión |
| --- | --- |
| Tamaño | Escena de 195x136 píxeles, vista al doble (390x272 en el móvil). Se pinta en un lienzo, como el mapa, porque con rectángulos SVG iría lenta en un móvil flojo |
| Sitios | Castillo en el centro, en su loma. Detrás, el Aserradero junto al bosque (izquierda) y la Cantera en la ladera de la montaña (derecha). Al pie de la montaña, la Mina. Delante, la Granja con sus campos (izquierda) y el Mercado en la plaza (derecha) |
| Etapas | Se empieza con 7 niveles sumados y el máximo es 25, pero con bots se acaba con 15 de mediana en 6 semanas (13 en 4; casi nadie pasa de 19). Por eso las etapas no se reparten a partes iguales: 1 con 7-8, 2 con 9-10, 3 con 11-13, 4 con 14-16 y 5 con 17 o más |
| Cómo es cada etapa | 1: torre con cadalso de madera y empalizada, «de pacotilla». 2: torre de piedra, muralla baja y dos torrecillas. 3: el castillo del mapa. 4: torreón con tejado, puerta entre dos torres y tapices. 5: doble muralla, más torres y estandartes |
| Mapa y niebla | El Prestigio por edificios ya es público en Reino, así que la etapa no revela nada. El servidor manda la etapa de cada casa y todos los castillos se dibujan con la suya, también bajo la niebla (cambia el punto 6) |
| Ficha | En la hoja que sube desde abajo: nivel, «+6 → +8 de Pan al día», +1 de Prestigio, coste con lo que falta en rojo y cuándo lo tendrás con tu producción. Tocar el castillo abre Reclutar en la misma hoja |
| Orden de la pestaña | Barra fina con los 5 recursos y lo del día, la escena, Edificios, Reclutar, Mercenarios, Capitán, Cartas y Objetivo secreto. Al final, plegado en «Ajustes de la casa»: Si te ausentas, Avisos y el recurso que pides a la Corona si vas último |
| Lista | Cada fila con su dibujo pequeño (el de la escena), el nivel en cinco puntos, lo que produce, el coste y Mejorar |
| Obra al mejorar | Un segundo de andamios y polvo y aparece el dibujo nuevo con un destello; sin movimiento si el móvil lo pide |
| Lo aplazado (punto 4) | Entran ya la hora del día (cielo según la hora de la partida, antorchas de noche) y el castillo rodeado (tiendas de quien te sitia). Guarnición y Capitán, más adelante |

Los dibujos se hacen en pxl, en `docs/maquetas/bloque2/pxl/castillo.px.js` (escena `escena`, las cinco etapas en `lamina`). El color de la casa son las letras 7, 8 y 9, que el juego cambia por las de cada casa. Sobra el antiguo primer paso (sacar piezas de `world.ts` a un módulo común): la escena se dibuja entera en pxl.

## Pasos

1. **Bocetos.** Escena y edificios en pixel art, diseñados en pxl (`docs/pixel-art.md`) para revisarlos como PNG o GIF antes de seguir; los aprobados pasan al juego con `scripts/pxl-a-juego.mjs`.
2. **Escena del castillo.** Componente nuevo en `apps/web/src/art` a escala de móvil (unos 390 píxeles de ancho), con los colores y el escudo de la casa.
3. **Edificios por nivel.** Los 25 dibujos.
4. **Crecimiento del castillo** (5 etapas) en la escena y en la loseta del mapa (`world.ts`). La etapa se calcula en el cliente con los niveles que ya ve cada casa; para las demás casas, el servidor envía la etapa de cada una (ya es pública por el Prestigio de edificios).
5. **Toques y lista** rehecha.
6. **Animaciones**, respetando «reducir movimiento».
7. **Comprobación** con Playwright a 390x844 y capturas de los 5 niveles de cada edificio y de las 5 etapas del castillo.
