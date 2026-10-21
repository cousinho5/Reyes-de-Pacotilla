# Cómo se dibuja el pixel art

Desde el 21 de octubre de 2026. Todo el arte del juego sigue siendo pixel art hecho con código: rejillas de texto con paleta en `apps/web/src/art`, sin imágenes (sección 19 del diseño). Lo nuevo es el taller donde se diseña y se revisa: **pxl**.

## Qué es pxl

pxl es una herramienta de licencia MIT ([claude-pxl](https://github.com/augusto-scarvalho/claude-pxl)) que dibuja pixel art a partir de un archivo `.px.js`. Ese archivo lleva una paleta de una letra por color, rejillas, figuras, capas, luces, sombras y animación por fotogramas. Con él pxl genera PNG y GIF. Está copiada en el repositorio como skill de Claude, en `.claude/skills/pxl-pixel-art`; su origen y cómo actualizarla están en `ORIGEN.md`. Necesita Node 22.18 o posterior.

Lo que aporta frente a dibujar directamente en `apps/web/src/art`:

- **Ver lo que se dibuja.** `pxl shot` saca la imagen ampliada, con varios fotogramas o una zona en grande, y dice qué ha cambiado desde la última vez. Claude la mira y corrige antes de enseñarla.
- **Revisión automática.** `pxl check` avisa de figuras que flotan o se hunden, de luz por el lado equivocado y de figuras pegadas que se leen como una sola.
- **Escenas completas.** Capas ordenadas, sombras, luces, humo, animaciones que se repiten y variantes de color en una línea (por ejemplo, un soldado con el color de cada casa).
- **Algo que enseñar.** Un GIF o una comparación lado a lado se revisan en el móvil antes de tocar el juego.

## El proceso

1. **Encargo.** Se pide el dibujo con su tamaño en píxeles y el sitio donde va: una casilla de 64x64, un icono de 16x16, una escena de cinemática de 160x176…
2. **Diseño en pxl.** Claude escribe el `.px.js` junto al documento del bloque, en una carpeta `pxl/` (por ejemplo, `docs/maquetas/bloque13/pxl/`). Usa los colores que ya tiene el juego para esa pieza y repite `pxl shot` y `pxl check` hasta que esté bien.
3. **Revisión.** Claude enseña un PNG o un GIF, y una comparación con el dibujo anterior si lo hay. Se retoca hasta que se aprueba.
4. **Paso al juego.** Se convierte con el script:

   ```sh
   node scripts/pxl-a-juego.mjs <dibujo.px.js> <nombre> --salida apps/web/src/art/<archivo>.ts
   ```

   Genera un módulo con un `Sprite` (`{ grid, palette }`, el tipo de `apps/web/src/art/sprites.ts`). Si es una animación, genera una lista de fotogramas; con `--fotograma N` saca uno solo. Si aparecen colores que no están en la paleta (mezclas por opacidad), les da una letra libre y avisa: es mejor quitarlos en el `.px.js`.
5. **Uso en el juego.** El componente lo pinta con `Pixels`, igual que el resto del arte, y se comprueba en un móvil de 390x844.

El archivo generado no se edita a mano: los cambios se hacen en el `.px.js` y se vuelve a generar. El `.px.js` se guarda en el repositorio junto al resultado.

## Qué se queda como está

- **Escudos:** salen de las reglas de `packages/engine/src/heraldry.ts` y de `shield.ts`, porque los compone cada jugador.
- **Mapa:** `world.ts` lo pinta entero en un lienzo, con caminos y terreno calculados por el motor. Se pueden diseñar piezas sueltas en pxl, pero el mapa sigue saliendo de `world.ts`.
- **Lo que ya funciona** no se rehace salvo que se pida.

## Primera prueba

`docs/maquetas/bloque13/pxl/pregonero.px.js` rehace la viñeta del pregonero de la maqueta del bloque 13. Añade el bando en la mano, una tahona con cartel de Pan, jardineras y sombras. La campana tañe y un aldeano se balancea. Para verla:

```sh
node .claude/skills/pxl-pixel-art/bin/pxl.js build docs/maquetas/bloque13/pxl/pregonero.px.js --out /tmp/pxl
```
