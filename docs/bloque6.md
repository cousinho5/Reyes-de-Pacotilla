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

1. **Medidas de partida.** Guardar el script de medición (carga, primer dibujo del mapa, fluidez, tamaño de lo que se toca) en `scripts/` para repetirlo antes y después de cada paso.
2. **Dibujo del mapa.** Guardar el dibujo por partida y estado (lo que cambia el dibujo: dueños, etapas de castillo, terreno) y dibujarlo en un Web Worker con `OffscreenCanvas`; mientras, una vista previa con el color de cada casilla.
3. **Zoom** con pinza y doble toque en `MapView.tsx`, encajando en escalas enteras de pixel art.
4. **Hoja de la casilla** y mapa a toda pantalla con la barra fina.
5. **Arrastrar para dar órdenes** y mantener pulsado para la información rápida, siempre con confirmación.
6. **Tamaños de 48x48** en `styles.css` (botones, casillas de marcar, flecha de volver).
7. **Sin conexión:** caché de la aplicación en `public/sw.js` y la última respuesta de la partida guardada; letras recortadas; cada pestaña en su propio trozo de JS.
8. **Detalles:** `env(safe-area-inset-*)` arriba y a los lados, `touch-action` y el `viewport` para que solo el mapa haga zoom, ayudas al tocar, `dvh`, vibración con `navigator.vibrate` (con su ajuste) y repetición dibujada en canvas.
9. **Comprobación** con Playwright a 390x844, con el procesador lento y la 4G lenta, y en un móvil de verdad (Android e iPhone).

## Lo que queda para otros bloques

- La lista de Reino, que crece cada noche: bloque 11.
- El aspecto de cada pestaña: bloques 9, 10, 11 y 12.
