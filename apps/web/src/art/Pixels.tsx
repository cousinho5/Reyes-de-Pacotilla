// Pixel art como SVG: cada sprite es una cuadrícula de caracteres y una paleta.
// Se dibuja con rectángulos (uniendo los píxeles seguidos de una fila), así
// que se ve nítido a cualquier tamaño y se puede teñir cambiando la paleta.

import { memo, type ReactElement } from "react";

export type Palette = Record<string, string>;

interface Props {
  grid: readonly string[];
  palette: Palette;
  /** Ancho en píxeles de pantalla (el alto se ajusta a la proporción). */
  size?: number;
  title?: string;
  className?: string;
}

export const Pixels = memo(function Pixels({ grid, palette, size = 32, title, className }: Props) {
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  const rects: ReactElement[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x]!;
      const color = palette[c];
      if (!color) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === c) end++;
      rects.push(<rect key={`${x},${y}`} x={x} y={y} width={end - x} height={1} fill={color} />);
      x = end;
    }
  });
  return (
    <svg
      className={className}
      width={size}
      height={(size * h) / w}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {rects}
    </svg>
  );
});
