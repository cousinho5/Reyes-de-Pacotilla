// Compara tamaños de mapa y páramos para cada número de casas. Uso:
//   npm run simular-mapa -- [partidas por variante] [casas,separadas]   (SEMANAS=4, TODAS=1 para más variantes)
// Resume, por variante: distancia entre castillos, casillas por casa, cuándo
// llega el primer choque entre casas, cuántos hay, si el buen sitio de salida
// decide la partida y cómo queda el Prestigio.

import {
  MAP_LAYOUT,
  NEUTRAL_GARRISON,
  PERSONALITY_NAMES,
  PRESTIGE,
  generateMap,
  seededRandom,
  simulateGame,
  type MapLayoutOverride,
  type Strategy,
} from "../packages/engine/src";

const GAMES = Number(process.argv[2] ?? 300);
const COUNTS = (process.argv[3] ?? "4,5,6,7,8").split(",").map(Number) as (4 | 5 | 6 | 7 | 8)[];
const WEEKS = Number(process.env.SEMANAS ?? 6) as 2 | 4 | 6 | 8;

interface Variant {
  name: string;
  layout: MapLayoutOverride;
  /** Prestigio de un páramo y su guarnición. */
  wasteland?: { prestige: number; garrison: number };
}

// Tamaños anteriores (antes de los páramos) frente a los de MAP_LAYOUT.
const BEFORE: Record<number, [number, number]> = { 4: [5, 4], 5: [6, 4], 6: [6, 5], 7: [6, 5], 8: [6, 6] };
const VARIANTS: Record<number, Variant[]> = Object.fromEntries(
  [4, 5, 6, 7, 8].map((n) => {
    const now = MAP_LAYOUT[n as 4 | 5 | 6 | 7 | 8];
    const [c, r] = BEFORE[n]!;
    const list: Variant[] = [
      { name: `antes: ${c}x${r}`, layout: { cols: c, rows: r, paramos: 0 } },
      { name: `ahora: ${now.cols}x${now.rows} + ${now.paramos} páramos`, layout: now },
    ];
    if (process.env.TODAS) {
      list.push({ name: `${now.cols}x${now.rows} + ${now.paramos} páramos (3 PP)`, layout: now, wasteland: { prestige: 3, garrison: 2 } });
      list.push({ name: `${now.cols}x${now.rows} + ${now.paramos} páramos (0 PP)`, layout: now, wasteland: { prestige: 0, garrison: 2 } });
    }
    return [n, list];
  }),
);

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : NaN;
};
const f1 = (x: number) => x.toFixed(1);
const pct = (x: number) => `${Math.round(x * 100)}%`;

const basePrestige = PRESTIGE.perWasteland;
const baseGarrison = NEUTRAL_GARRISON.paramo;

for (const n of COUNTS) {
  console.log(`\n## ${n} casas (${GAMES} partidas de ${WEEKS} semanas por variante; ahora ${MAP_LAYOUT[n].cols}x${MAP_LAYOUT[n].rows})\n`);
  const head = [
    "variante",
    "casillas/casa",
    "productivas/casa",
    "castillos a ≤2",
    "dist. vecino",
    "1.er choque (res.)",
    "choques casa/partida",
    "robadas/casa",
    "neutrales tomadas",
    "páramos tomados",
    "Prestigio ganador",
    "territorio medio",
    "gana mejor salida",
    "gana peor salida",
    "líder sem. 2 gana",
    "deserciones",
  ];
  const rows: string[][] = [];
  for (const v of VARIANTS[n] ?? []) {
    PRESTIGE.perWasteland = v.wasteland?.prestige ?? basePrestige;
    NEUTRAL_GARRISON.paramo = v.wasteland?.garrison ?? baseGarrison;
    const rand = seededRandom(`mapa-${n}-${v.name}`);
    const near: number[] = [];
    let closePairs = 0;
    let pairs = 0;
    const first: number[] = [];
    let noContact = 0;
    const houseCombats: number[] = [];
    const stolen: number[] = [];
    const neutralTaken: number[] = [];
    const paramoTaken: number[] = [];
    const winnerPrestige: number[] = [];
    const territory: number[] = [];
    let bestWins = 0;
    let worstWins = 0;
    let leaders = 0;
    let leaderWins = 0;
    let deserting = 0;
    let housesTotal = 0;
    const { cols, rows: r } = v.layout;
    const neutrals = cols * r - n;
    for (let g = 0; g < GAMES; g++) {
      const seed = `m${n}-${g}`;
      const strategies = Array.from({ length: n }, () => PERSONALITY_NAMES[Math.floor(rand() * PERSONALITY_NAMES.length)]!) as Strategy[];
      const map = generateMap(seed, strategies.map((_, i) => i + 1), v.layout);
      const castles = map.tiles.filter((t) => t.type === "castillo");
      // Distancia (en pasos) de cada castillo al castillo más cercano.
      for (const c of castles) {
        const d = Math.min(...castles.filter((o) => o !== c).map((o) => Math.abs(o.x - c.x) + Math.abs(o.y - c.y)));
        near.push(d);
      }
      for (let i = 0; i < castles.length; i++) {
        for (let j = i + 1; j < castles.length; j++) {
          pairs++;
          if (Math.abs(castles[i]!.x - castles[j]!.x) + Math.abs(castles[i]!.y - castles[j]!.y) <= 2) closePairs++;
        }
      }
      // Valor de los alrededores de cada castillo (lo productivo a 1 o 2 pasos).
      const value = new Map<number, number>();
      for (const c of castles) {
        let val = 0;
        for (const t of map.tiles) {
          const d = Math.abs(t.x - c.x) + Math.abs(t.y - c.y);
          if (d === 0 || d > 2 || t.type === "castillo" || t.type === "paramo") continue;
          val += d === 1 ? 1 : 0.5;
        }
        value.set(c.castleOf!, val);
      }
      const res = simulateGame({ seed, strategies, weeks: WEEKS, layout: v.layout });
      if (res.firstHouseCombat == null) noContact++;
      else first.push(res.firstHouseCombat);
      houseCombats.push(res.combatsVsHouse);
      stolen.push(res.conquestsFromHouses / n);
      neutralTaken.push((res.neutralTotal - res.neutralLeft) / res.neutralTotal);
      const paramos = res.finalTiles.filter((t) => t.type === "paramo");
      if (paramos.length) paramoTaken.push(paramos.filter((t) => t.owner != null).length / paramos.length);
      winnerPrestige.push(res.houses[0]!.prestige.total);
      for (const h of res.houses) {
        territory.push(h.prestige.territorio);
        housesTotal++;
        if (h.rankWeek2 === 1) {
          leaders++;
          if (h.rank === 1) leaderWins++;
        }
        if (h.deserted > 0) deserting++;
      }
      const sorted = [...value.entries()].sort((a, b) => b[1] - a[1]);
      if (sorted[0]![0] === res.winner) bestWins++;
      if (sorted.at(-1)![0] === res.winner) worstWins++;
    }
    const expected = 1 / n;
    rows.push([
      v.name,
      f1((cols * r) / n),
      f1((neutrals - v.layout.paramos) / n),
      pct(closePairs / pairs),
      f1(avg(near)),
      `${median(first)}${noContact ? ` (${pct(noContact / GAMES)} sin)` : ""}`,
      f1(avg(houseCombats)),
      f1(avg(stolen)),
      pct(avg(neutralTaken)),
      paramoTaken.length ? pct(avg(paramoTaken)) : "—",
      f1(avg(winnerPrestige)),
      f1(avg(territory)),
      `${f1(bestWins / GAMES / expected)}x`,
      `${f1(worstWins / GAMES / expected)}x`,
      leaders ? pct(leaderWins / leaders) : "—",
      pct(deserting / housesTotal),
    ]);
  }
  PRESTIGE.perWasteland = basePrestige;
  NEUTRAL_GARRISON.paramo = baseGarrison;
  const all = [head, ...rows];
  const widths = head.map((_, c) => Math.max(...all.map((row) => row[c]!.length)));
  all.forEach((row, i) => {
    console.log("| " + row.map((cell, c) => cell.padEnd(widths[c]!)).join(" | ") + " |");
    if (i === 0) console.log("| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |");
  });
}
