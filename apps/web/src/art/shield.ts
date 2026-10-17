// Escudos en pixel art: la forma sale de una máscara, la división reparte los
// dos colores y el símbolo se pinta encima en el metal. Todo se compone en una
// cuadrícula de letras que luego se pinta con la paleta de la casa.

import type { ShieldDivision, ShieldShape, ShieldSymbol } from "@reyes/engine";

export const SHIELD_W = 16;
export const SHIELD_H = 18;

/** ¿Está el píxel (x, y) dentro del escudo? */
function inside(shape: ShieldShape, x: number, y: number): boolean {
  const px = x + 0.5;
  const py = y + 0.5;
  const dx = Math.abs(px - 8);
  switch (shape) {
    case "espanol": {
      // Recto arriba y redondo abajo.
      if (py < 1 || py > 17 || dx > 7) return false;
      return py <= 10 || (dx / 7) ** 2 + ((py - 10) / 7) ** 2 <= 1;
    }
    case "apuntado": {
      // Recto arriba, lados que se cierran en punta.
      if (py < 1 || py > 17.2) return false;
      if (py <= 7) return dx <= 7;
      const t = (py - 7) / 10.2;
      return dx <= 7 * (1 - t * t);
    }
    case "almendrado": {
      // Redondo arriba y punta larga abajo.
      if (py < 0.6 || py > 17.4) return false;
      if (py <= 6) return dx <= 7 * Math.sqrt(Math.max(0, 1 - ((6 - py) / 5.4) ** 2));
      return dx <= 7.2 * (1 - (py - 6) / 11.4) ** 0.7;
    }
    case "rodela":
      return (px - 8) ** 2 + (py - 9) ** 2 <= 7.6 ** 2;
    case "estandarte": {
      // Rectángulo con cola de golondrina.
      if (py < 1 || py > 17 || dx > 7) return false;
      return py <= 12.6 + dx * (4.4 / 7);
    }
  }
}

function region(division: ShieldDivision, x: number, y: number): "a" | "b" {
  const px = x + 0.5;
  const py = y + 0.5;
  switch (division) {
    case "pleno":
      return "a";
    case "partido":
      return px < 8 ? "a" : "b";
    case "cortado":
      return py < 8.5 ? "a" : "b";
    case "tronchado":
      // De la esquina de arriba a la derecha a la de abajo a la izquierda.
      return px / SHIELD_W + py / SHIELD_H < 1 ? "a" : "b";
  }
}

/**
 * Símbolos: '#' metal, '+' sombra del metal, 'x' detalle oscuro.
 * Cada uno cabe en 10x10 y se centra en el escudo.
 */
export const SYMBOL_ART: Record<ShieldSymbol, string[]> = {
  leon: [
    "..+####+..",
    ".+######+.",
    "+##x##x##+",
    "+########+",
    "+###++###+",
    ".+##xx##+.",
    "..+####+..",
    "...+##+...",
  ],
  aguila: [
    "....#....",
    "...#x#...",
    "#..###..#",
    "##.###.##",
    "#########",
    ".#######.",
    "...###...",
    "..##.##..",
    "..#...#..",
  ],
  torre: [
    "#.#.#.#",
    "#######",
    ".#####.",
    ".##x##.",
    ".#####.",
    ".##x##.",
    ".#####.",
    "##xxx##",
    "##xxx##",
  ],
  espada: [
    "...#...",
    "..#+#..",
    "..#+#..",
    "..#+#..",
    "..#+#..",
    "..#+#..",
    "#######",
    "...+...",
    "...+...",
    "..###..",
  ],
  corona: [
    "#..#..#",
    "##.#.##",
    "#######",
    "#x#x#x#",
    "#######",
    "+++++++",
  ],
  llave: [
    ".###...",
    "#x.x#..",
    "#...#..",
    ".###...",
    "..#....",
    "..#....",
    "..###..",
    "..#....",
    "..##...",
  ],
  lobo: [
    "#.....#",
    "##...##",
    "#+###+#",
    "#x###x#",
    "#######",
    ".#####.",
    "..#x#..",
    "...#...",
  ],
  dragon: [
    ".....#....",
    "#...##....",
    "##.###....",
    "x#####...#",
    "#.######.#",
    "...######.",
    "...#..#...",
    "..##..##..",
  ],
  gallina: [
    "..xx.....",
    ".###.....",
    "x#x#.....",
    ".###..#..",
    "..#####..",
    "..######.",
    "...####..",
    "....#.#..",
    "...##.##.",
  ],
  cerdo: [
    "#.......#",
    "##.....##",
    ".#######.",
    "##x###x##",
    "###+++###",
    "##+x+x+##",
    ".##+++##.",
    "..#####..",
  ],
  nabo: [
    "..#.#.#..",
    "...###...",
    "....#....",
    "..#####..",
    ".###++##.",
    ".##+++##.",
    "..#####..",
    "...###...",
    "....#....",
  ],
  caracol: [
    "....####..",
    "...#++++#.",
    "..#+####+#",
    "..#+#xx#+#",
    "..#+#+##+#",
    "#.#++++++#",
    "##########",
  ],
  pato: [
    "..###....",
    ".##x#....",
    "++###....",
    "..###....",
    "..#######",
    ".########",
    "..######.",
    "...####..",
  ],
  queso: [
    "......##",
    "....####",
    "..######",
    "########",
    "#x###x##",
    "####x###",
    "#x######",
    "########",
  ],
  bota: [
    "..####..",
    "..####..",
    "..++++..",
    "..####..",
    "..####..",
    "..#####.",
    "..######",
    "########",
    "xxxxxxxx",
  ],
  cuchara: [
    "..###..",
    ".#####.",
    ".##+##.",
    ".#####.",
    "..###..",
    "...#...",
    "...#...",
    "...#...",
    "...#...",
    "..###..",
  ],
};

/** Centro vertical del símbolo en cada forma (donde hay más sitio). */
const SYMBOL_CENTER: Record<ShieldShape, number> = {
  espanol: 8.5,
  apuntado: 8,
  almendrado: 6.5,
  rodela: 9,
  estandarte: 7,
};

/**
 * Cuadrícula del escudo: 'k' borde, 'a' y 'b' los dos campos, 'm' metal,
 * 'n' sombra del metal y 'x' detalle oscuro.
 */
export function shieldGrid(shape: ShieldShape, division: ShieldDivision, symbol: ShieldSymbol): string[] {
  const cells: string[][] = [];
  for (let y = 0; y < SHIELD_H; y++) {
    const row: string[] = [];
    for (let x = 0; x < SHIELD_W; x++) {
      if (!inside(shape, x, y)) {
        row.push(".");
        continue;
      }
      const edge =
        !inside(shape, x - 1, y) || !inside(shape, x + 1, y) || !inside(shape, x, y - 1) || !inside(shape, x, y + 1);
      row.push(edge ? "k" : region(division, x, y));
    }
    cells.push(row);
  }
  const art = SYMBOL_ART[symbol];
  const w = Math.max(...art.map((r) => r.length));
  const x0 = Math.round(8 - w / 2);
  const y0 = Math.round(SYMBOL_CENTER[shape] - art.length / 2);
  art.forEach((line, dy) => {
    [...line].forEach((ch, dx) => {
      const cell = cells[y0 + dy]?.[x0 + dx];
      if (cell == null || cell === "." || cell === "k" || ch === ".") return;
      cells[y0 + dy]![x0 + dx] = ch === "#" ? "m" : ch === "+" ? "n" : "x";
    });
  });
  return cells.map((r) => r.join(""));
}
