// Simula cientos de partidas entre bots y resume los números para equilibrar
// rules.ts. Uso:
//   npm run simular                       # 500 partidas de 6 semanas, personalidades mezcladas
//   npm run simular -- --partidas 2000 --semanas 2
//   npm run simular -- --modo espejo      # todas estrategas: ¿es justo el reparto inicial?
//   npm run simular -- --modo clasico     # los bots sencillos de antes
//   npm run simular -- --modo todos       # personalidades y bots sencillos juntos
//   npm run simular -- --estrategias guerrero,mercader
//   npm run simular -- --eventos no       # sin los eventos de la semana, para comparar
//   npm run simular -- --terreno no       # sin los efectos del terreno (diseño v2), para comparar
//   npm run simular -- --tropas no        # solo Mesnada (sin Jinetes ni Catapultas), para comparar
//   npm run simular -- --json simulacion.json   # además, todos los datos en JSON

import { writeFileSync } from "node:fs";
import {
  CLASSIC_STRATEGIES,
  OBJECTIVES,
  PERSONALITY_NAMES,
  RESOURCES,
  STRATEGIES,
  seededRandom,
  simulateGame,
  type ObjectiveKey,
  type SimGameResult,
  type SimHouseResult,
  type Strategy,
} from "../packages/engine/src";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i]!.replace(/^--/, ""), process.argv[i + 1] ?? "");
const games = Number(args.get("partidas") ?? 500);
const weeks = Number(args.get("semanas") ?? 6) as 2 | 4 | 6 | 8;
const mode = args.get("modo") ?? "mezcla";
const [minPlayers, maxPlayers] = (args.get("jugadores") ?? "4-8").split("-").map(Number) as [number, number];
const pools: Record<string, Strategy[]> = {
  mezcla: [...PERSONALITY_NAMES],
  espejo: ["estratega"],
  clasico: [...CLASSIC_STRATEGIES],
  todos: [...STRATEGIES],
};
const pool = (args.get("estrategias")?.split(",") ?? pools[mode] ?? pools.mezcla!) as Strategy[];
const unknown = pool.filter((p) => !STRATEGIES.includes(p));
if (unknown.length) throw new Error(`Estrategias desconocidas: ${unknown.join(", ")}. Hay: ${STRATEGIES.join(", ")}`);

const rand = seededRandom(`simulacion-${games}-${weeks}-${mode}`);
const results: SimGameResult[] = [];
const started = Date.now();
for (let i = 0; i < games; i++) {
  const players = minPlayers + Math.floor(rand() * (maxPlayers - minPlayers + 1));
  const strategies = Array.from({ length: players }, () => pool[Math.floor(rand() * pool.length)]!);
  results.push(simulateGame({ seed: `sim-${i}`, strategies, weeks, events: args.get("eventos") !== "no", terrain: args.get("terreno") !== "no", units: args.get("tropas") !== "no" }));
}
const houses = results.flatMap((g) => g.houses.map((h) => ({ ...h, players: g.houses.length })));

// ---------------------------------------------------------------------------

const pct = (x: number) => `${(100 * x).toFixed(0)}%`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const f1 = (x: number) => x.toFixed(1);

function table(title: string, head: string[], rows: (string | number)[][]) {
  console.log(`\n## ${title}\n`);
  const all = [head, ...rows.map((r) => r.map(String))];
  const widths = head.map((_, c) => Math.max(...all.map((r) => r[c]!.length)));
  all.forEach((r, i) => {
    console.log(r.map((cell, c) => (c === 0 ? cell.padEnd(widths[c]!) : cell.padStart(widths[c]!))).join("  "));
    if (i === 0) console.log(widths.map((w) => "-".repeat(w)).join("  "));
  });
}

/** Victorias frente a lo esperado si todas fueran iguales (1 / casas). */
function winStats(group: (SimHouseResult & { players: number })[]) {
  const wins = group.filter((h) => h.rank === 1).length;
  const expected = group.reduce((a, h) => a + 1 / h.players, 0);
  return { wins, rate: wins / group.length, ratio: expected ? wins / expected : 0 };
}

console.log(
  `# Simulación: ${games} partidas de ${weeks} semanas, ${minPlayers}-${maxPlayers} casas, modo ${mode}${args.get("eventos") === "no" ? ", sin eventos" : ""}${args.get("terreno") === "no" ? ", sin terreno" : ""}${args.get("tropas") === "no" ? ", solo Mesnada" : ""}`,
);
console.log(`(${((Date.now() - started) / 1000).toFixed(1)} s)`);

table(
  "Estrategias",
  ["estrategia", "casas", "gana", "x esperado", "puesto medio", "Prestigio", "territorio", "edificios", "riqueza", "comercio", "logros", "objetivo"],
  pool
    .filter((s, i) => pool.indexOf(s) === i)
    .map((s) => {
      const g = houses.filter((h) => h.strategy === s);
      const w = winStats(g);
      const p = (k: keyof SimHouseResult["prestige"]) => f1(avg(g.map((h) => h.prestige[k])));
      return [s, g.length, pct(w.rate), f1(w.ratio), f1(avg(g.map((h) => h.rank))), p("total"), p("territorio"), p("edificios"), p("riqueza"), p("comercio"), p("logros"), p("objetivo")];
    }),
);
console.log("\n«x esperado»: 1,0 = gana lo que le toca por azar; 2,0 = el doble.");

table(
  "Especialidades iniciales",
  ["especialidad", "casas", "gana", "x esperado", "Prestigio"],
  [...new Set(houses.map((h) => h.specialty))].map((s) => {
    const g = houses.filter((h) => h.specialty === s);
    const w = winStats(g);
    return [s, g.length, pct(w.rate), f1(w.ratio), f1(avg(g.map((h) => h.prestige.total)))];
  }),
);

table(
  "Objetivos secretos",
  ["objetivo", "elegido", "cumplido", "gana si lo cumple"],
  (Object.keys(OBJECTIVES) as ObjectiveKey[]).map((o) => {
    const g = houses.filter((h) => h.objective === o);
    const met = g.filter((h) => h.objectiveMet);
    return [o, g.length, g.length ? pct(met.length / g.length) : "—", met.length ? pct(met.filter((h) => h.rank === 1).length / met.length) : "—"];
  }),
);

table(
  "Recursos sin gastar al final (media por casa)",
  ["estrategia", ...RESOURCES],
  [...new Set(houses.map((h) => h.strategy))].map((s) => {
    const g = houses.filter((h) => h.strategy === s);
    return [s, ...RESOURCES.map((r) => f1(avg(g.map((h) => h.leftover[r]))))];
  }),
);

const sizes = [...new Set(results.map((g) => g.houses.length))].sort();
table(
  "Mapa y combate (por partida)",
  ["casas", "partidas", "neutrales tomadas", "combates vs neutral", "combates entre casas", "casillas robadas", "rebotes"],
  sizes.map((n) => {
    const g = results.filter((r) => r.houses.length === n);
    return [
      n,
      g.length,
      pct(avg(g.map((r) => (r.neutralTotal - r.neutralLeft) / r.neutralTotal))),
      f1(avg(g.map((r) => r.combatsVsNeutral))),
      f1(avg(g.map((r) => r.combatsVsHouse))),
      f1(avg(g.map((r) => r.conquestsFromHouses))),
      f1(avg(g.map((r) => r.bounces))),
    ];
  }),
);

const withW2 = houses.filter((h) => h.rankWeek2 != null);
const leaders = withW2.filter((h) => h.rankWeek2 === 1);
const helped = houses.filter((h) => h.helpWeeks > 0);
table("Combate y comercio (por partida)", ["dato", "valor"], [
  ["Órdenes de ataque", f1(avg(results.map((r) => r.attacks)))],
  ["Ataques que toman la casilla", pct(results.reduce((a, r) => a + r.attacksWon, 0) / Math.max(1, results.reduce((a, r) => a + r.attacks, 0)))],
  ["Órdenes de apoyo", f1(avg(results.map((r) => r.supports)))],
  ["Marchas por camino (2 casillas)", f1(avg(results.map((r) => r.roadMoves)))],
  [
    "Reclutadas: Mesnada / Jinetes / Catapultas",
    `${f1(avg(results.map((r) => r.recruited.mesnada)))} / ${f1(avg(results.map((r) => r.recruited.jinetes)))} / ${f1(avg(results.map((r) => r.recruited.catapultas)))}`,
  ],
  ["Travesías por mar", f1(avg(results.map((r) => r.seaMoves)))],
  ["Tratos cerrados", f1(avg(results.map((r) => r.trades)))],
  ["Socios comerciales por casa (toda la partida)", f1(avg(houses.map((h) => h.partners)))],
  ["Oro gastado en la Gran Subasta", f1(avg(results.map((r) => r.auctionGold)))],
  ["Cartas usadas", f1(avg(results.map((r) => r.cardsPlayed)))],
  ["Lotes ganados por casa", f1(avg(houses.map((h) => h.auctionsWon)))],
]);

table("Forma de la partida", ["dato", "valor"], [
  ["Diferencia media 1.º - 2.º (Prestigio)", f1(avg(results.map((r) => r.margin)))],
  ["Partidas decididas por desempate", pct(results.filter((r) => r.tiebreak).length / results.length)],
  ["El líder de la semana 2 gana", leaders.length ? pct(leaders.filter((h) => h.rank === 1).length / leaders.length) : "—"],
  ["Casas con deserciones", pct(houses.filter((h) => h.deserted > 0).length / houses.length)],
  ["Tropas desertadas (media, si hubo)", f1(avg(houses.filter((h) => h.deserted > 0).map((h) => h.deserted)))],
  ["Casas que recibieron ayuda al último", pct(helped.length / houses.length)],
  ["...y acabaron últimas igualmente", helped.length ? pct(helped.filter((h) => h.rank === h.players).length / helped.length) : "—"],
  ["Prestigio medio del ganador", f1(avg(houses.filter((h) => h.rank === 1).map((h) => h.prestige.total)))],
]);

const json = args.get("json");
if (json) {
  writeFileSync(json, JSON.stringify({ games, weeks, mode, results }, null, 0));
  console.log(`\nDatos completos en ${json}`);
}
