# Bloque 6: optimización y controles en móvil

Decidido el 20 de octubre de 2026 · copia del documento «Reyes de Pacotilla: bloque 6, optimización y controles en móvil» (claude.ai).

Este bloque fija cómo se toca y cómo carga el juego en el móvil. No cambia reglas: no hay que simular ni tocar el motor. El aspecto de cada pestaña se decide en sus bloques (9 Mapa, 12 Órdenes, 10 Comercio, 11 Reino), que ya usarán lo que sale de aquí. Va después de los bloques 1, 4, 5 y 8, así que trabaja con el mapa nuevo.

## Cómo es hoy

Medido el 20 de octubre de 2026 con Playwright en un móvil simulado de 390x844 (escala 3, táctil), con una partida de prueba de 7 casas en la resolución 5. «Móvil flojo» es el procesador 4 veces más lento y una 4G lenta (1,6 Mbps, 150 ms).

| Qué | Móvil normal | Móvil flojo y 4G lenta |
| --- | --- | --- |
| Descarga de la primera visita | 250 KB (JS 127, letras 110, CSS 7) | 250 KB |
| Se ve la página | 0,35 s | 1,4 s |
| Se ve el mapa | 1,5 s | 4,9 s |
| Pantalla congelada mientras se dibuja el mapa | 1,0 s | 3,2 s |
| Se ve el mapa en la segunda visita | 1,1 s | 4,0 s |
| Fluidez al arrastrar el mapa | 60 imágenes/s | 60 imágenes/s |
| Fluidez de la repetición de la noche | 59 imágenes/s | 56 imágenes/s |

- **Mapa.** `renderWorld` (`apps/web/src/art/world.ts`) pinta todo el pixel art en el hilo principal cada vez que se abre la partida (`useWorld` en `WorldCanvas.tsx` lo repite si cambian sus opciones). Encima van una capa SVG (unos 420 elementos) y 63 botones de casilla. El zoom tiene dos niveles y solo cambia con el botón «Ver todo el reino»/«Acercar» (`MapView.tsx`); no hay pinza, rueda ni doble toque. Se arrastra con el desplazamiento del navegador.
- **Ficha de la casilla.** Sale debajo del mapa, casi fuera de la pantalla.
- **Espacio.** Barra de arriba 111 px y de abajo 64 px; en Mapa, el reloj, el evento y los días empujan el mapa hacia abajo.
- **Botones.** 16 cosas que se tocan miden menos de 44 px (volver 11x40, zoom, «Ver la noche», «Flechas», Mesnada/Jinetes/Catapultas, «Ver en el mapa», una casilla de marcar de 13x13). En la vista de todo el reino cada casilla mide 34x39.
- **Detalles.** Solo hay margen seguro abajo (`styles.css`, `.tabs`); nada para la muesca ni los lados. Ningún `touch-action`: la pinza y el doble toque hacen zoom a la página. Las ayudas con `title` no se ven al tocar. `min-height: 100vh` en vez de `dvh`. El service worker (`public/sw.js`) solo atiende las notificaciones: sin conexión no abre. La repetición de la noche vuelve a pintar todo en cada imagen (`NightReplay.tsx`).

### Medidas antes de empezar (22 de octubre de 2026)

Con `npm run medir-movil` (`scripts/medir-movil.mjs`, paso 1), que crea una partida de prueba de 7 casas, la avanza hasta la resolución 5 (o la primera después con una batalla a la vista, jugando como la casa que la ganó, para que salga la repetición) y la mide en los dos móviles. Los números bailan una décima de una vez a otra. Desde el 20 de octubre el JS ha crecido de 127 a 140 KB (bloques 5 y 8); las letras suben a 133 KB cuando la pantalla usa la cursiva.

| Qué | Móvil normal | Móvil flojo y 4G lenta |
| --- | --- | --- |
| Descarga de la primera visita | 281 KB (JS 140, letras 133, CSS 7) | 281 KB |
| Se ve la página | 0,15 s | 1,46 s |
| Se ve el mapa | 1,14 s | 5,59 s |
| Pantalla congelada mientras se dibuja el mapa | 0,98 s | 4,08 s |
| Se ve el mapa en la segunda visita | 1,23 s | 4,57 s |
| Fluidez al arrastrar el mapa | 61 imágenes/s | 61 imágenes/s |
| Fluidez de la repetición de la noche | 60 imágenes/s | 58 imágenes/s |
| Casilla de cerca / de todo el reino | 112x128 / 32x37 | 112x128 / 32x37 |

Lo que se toca y mide menos de 48 px (sin contar la mesa de pruebas ni las casillas del mapa): 33 cosas, 13 de ellas por debajo de 44 px. Mapa: volver (11x40), el evento, los días de la cola (38 de alto), «Ver todo el reino», «Ver la noche» y «Flechas». Castillo: Mesnada, Jinetes y Catapultas (40 de alto), «Soltar gratis» y varios botones y desplegables de 44 de alto. Órdenes: «Ver en el mapa». Comercio: «Pedir otro a Fray Abundio», las cifras de la Corona y «Aceptar»/«Contraofertar» (40). Reino: los botones del boletín y la clasificación (44).

## Decisiones

| Punto | Decisión |
| --- | --- |
| 1. Dibujo del mapa | Guardar el dibujo en el móvil y rehacerlo solo cuando cambie algo que se ve. Dibujarlo en segundo plano, con una vista previa sencilla (colores de cada casilla) mientras tanto |
| 2. Zoom | Pinza y doble toque que encajan en 3 niveles (todo el reino, normal y cerca) para que el pixel art se vea nítido. El botón se queda |
| 3. Ficha de la casilla | Hoja que sube desde abajo, encima del mapa: a media altura con lo principal (dueño, tropas, botones de orden) y se estira para ver el resto. El mapa se mueve para que la casilla quede a la vista |
| 4. Espacio para el mapa | El mapa ocupa toda la pantalla en su pestaña. Arriba, una barra fina con los recursos; el reloj y el evento, en una etiqueta que se abre al tocarla |
| 5. Tamaño de lo que se toca | Todo mide al menos 48x48. En la vista de todo el reino, tocar una casilla acerca primero el mapa |
| 6. Órdenes con el dedo | Arrastrar desde una casilla tuya a otra prepara un movimiento o ataque y abre la hoja con la orden rellena para confirmarla. Mantener pulsada una casilla enseña su información rápida (dueño, tropas, defensa) |
| 7. Carga y sin conexión | Guardar el juego para que abra al instante y, sin conexión, enseñe lo último que se vio (sin dar órdenes hasta que vuelva la red). Letras más ligeras (solo los grosores y caracteres que se usan) y cada pestaña se carga al abrirla |
| 8. Detalles | Muesca y bordes curvos; sin zoom de página con la pinza ni con dos toques, en Android y en iPhone (solo hace zoom el mapa); ayudas al tocar; altura de pantalla con `dvh`; vibración corta al confirmar una orden y al acabar la repetición (se puede apagar); repetición de la noche más ligera |

## Pasos

1. **Medidas de partida.** Guardar el script de medición (carga, primer dibujo del mapa, fluidez, tamaño de lo que se toca) en `scripts/` para repetirlo antes y después de cada paso. **Hecho:** `npm run medir-movil -- [url] [clave-admin]` con el servidor local; medidas arriba.
2. **Dibujo del mapa.** Guardar el dibujo por partida y estado (lo que cambia el dibujo: dueños, etapas de castillo, terreno) y dibujarlo en un Web Worker con `OffscreenCanvas`; mientras, una vista previa con el color de cada casilla. **Hecho:** `apps/web/src/art/world.worker.ts` dibuja en segundo plano y `art/worldStore.ts` guarda el dibujo: en memoria (los 6 últimos, para volver a la pestaña Mapa al momento) y en el móvil como PNG en IndexedDB (los 8 últimos), con una huella de las opciones del dibujo y de la versión del juego (`__BUILD__` en `vite.config.ts`: cada versión dibuja de nuevo). `WorldCanvas.tsx` pinta mientras tanto la vista previa (`PREVIEW_COLOR` de `world.ts`) solo la primera vez; si ya había un dibujo, se queda hasta que llega el nuevo, y si llegan varios encargos seguidos solo se dibuja el último. Las casillas y las flechas se colocan con `worldMeta`, sin esperar al dibujo. Sin Worker, se dibuja en el hilo principal tras la vista previa.

   | Qué | Antes (normal / flojo) | Después (normal / flojo) |
   | --- | --- | --- |
   | Se ve la vista previa del mapa | no había | 0,33 s / 2,06 s |
   | Se ve el mapa | 1,14 s / 5,59 s | 1,23 s / 3,29 s |
   | Pantalla congelada mientras se dibuja el mapa | 0,98 s / 4,08 s | 0,15 s / 0,55 s |
   | Se ve el mapa en la segunda visita | 1,23 s / 4,57 s | 0,25 s / 1,07 s |

   El dibujante es un archivo aparte de 38 KB que se descarga al abrir el mapa.
3. **Zoom** con pinza y doble toque en `MapView.tsx`, encajando en escalas enteras de pixel art. **Hecho:** `apps/web/src/components/useMapZoom.ts`. Tres niveles: todo el reino (ajustado al ancho, como antes), normal (2 px de pantalla por píxel del dibujo, como el «de cerca» de antes: casilla de 112x128) y cerca (3 px: 168x192); normal y cerca encajan en píxeles enteros de la pantalla. Con la pinza el dibujo sigue a los dedos y al soltar encaja en el nivel más cercano, sin moverse el punto entre los dedos. Dos toques seguidos acercan un nivel donde se toca, y desde cerca vuelven a todo el reino; si el primer toque ya acercó el mapa (una casilla en la vista del reino), el segundo no acerca otra vez. En el ordenador, Ctrl con la rueda (o la pinza del panel táctil). El botón se queda. El mapa lleva `touch-action: pan-x pan-y`: con un dedo se arrastra como antes y la pinza ya no agranda la página encima del mapa (en el resto de la página, en el paso 8).
4. **Hoja de la casilla** y mapa a toda pantalla con la barra fina. **Hecho:** en la pestaña Mapa la partida ocupa toda la pantalla (`.game.map-mode`, alto `100dvh`). Arriba, una barra fina con volver, el escudo, los recursos y una etiqueta con lo que falta para el cierre (y un punto rojo si hay evento); al tocarla se abren el reloj, el evento y la mesa de pruebas, y se cierran al tocar el mapa. Las demás pestañas siguen como estaban (sus bloques las rediseñan). La ficha es `apps/web/src/components/Sheet.tsx`, con tres alturas: asomada (lo último que pasó: amenazas, estandartes y batallas, o la ayuda si no hay nada), a media altura (la ficha de la casilla o la orden) y estirada; se cambia arrastrando el asa (con un tirón cambia de altura aunque se suelte cerca) o tocándola, y al bajarla del todo o con la cruz se cierra la ficha. Mientras se elige el destino de una orden, la hoja se asoma para ver el mapa, y vuelve a media altura al elegirlo. El mapa se mueve para que la casilla elegida quede por encima de la hoja, y debajo del dibujo hay sitio para que ninguna casilla se quede tapada. Durante la repetición de la noche no hay hoja.
5. **Arrastrar para dar órdenes** y mantener pulsado para la información rápida, siempre con confirmación.
6. **Tamaños de 48x48** en `styles.css` (botones, casillas de marcar, flecha de volver).
7. **Sin conexión:** caché de la aplicación en `public/sw.js` y la última respuesta de la partida guardada; letras recortadas; cada pestaña en su propio trozo de JS.
8. **Detalles:** `env(safe-area-inset-*)` arriba y a los lados, `touch-action` y el `viewport` para que solo el mapa haga zoom, ayudas al tocar, `dvh`, vibración con `navigator.vibrate` (con su ajuste) y repetición dibujada en canvas.
9. **Comprobación** con Playwright a 390x844, con el procesador lento y la 4G lenta, y en un móvil de verdad (Android e iPhone).

## Lo que queda para otros bloques

- La lista de Reino, que crece cada noche: bloque 11.
- El aspecto de cada pestaña: bloques 9, 10, 11 y 12.
