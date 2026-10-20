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
//   npm run simular -- --asedios no       # sin asedios, para comparar
//   npm run simular -- --capitan no       # sin Capitán ni Gloria, para comparar
//   npm run simular -- --json simulacion.json   # además, todos los datos en JSON

import { writeFileSync } from "node:fs";
import { BATTLE_TWEAKS, BOT_TWEAKS, FORTIFY_COST, FORTIFY_UPKEEP, PRESTIGE, SIEGE, UNITS, UPGRADE_COST } from "../packages/engine/src";
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
// Para probar variantes de los asedios: --asedio-produce si (la casilla sitiada sigue produciendo).
if (args.get("asedio-produce") === "si") SIEGE.stopsProduction = false;
// --muralla-noche 0.125: cuánto quita cada noche de asedio a las murallas.
if (args.has("muralla-noche")) SIEGE.wallsPerNight = Number(args.get("muralla-noche"));
// --asedio-fortificadas no: solo se sitian fortalezas y castillos.
if (args.get("asedio-fortificadas") === "no") SIEGE.fortifiedTargets = false;
// --asedio-castillo no: no se pueden rodear castillos.
if (args.get("asedio-castillo") === "no") SIEGE.castleSides = 99;
// Bloque 4 de la hoja de ruta (retoques del sistema de batalla):
//   --apoyo-libre si               apoyar un ataque sin elegir de dónde viene
//   --cruces si                    también chocan los grupos que se cruzan por el camino
//   --fortificar-hasta-ataque si   la fortificación dura hasta que atacan la casilla
//   --coste-fortificar 12          Piedra por fortificar
//   --capitan-modo avance|solo     el Capitán acompaña los avances, o además va solo al frente
//   --jinetes-pares 1 --jinetes-impares 0   parte de jinetes al reclutar según la casa (par o impar)
//   --coste-jinete hierro:3,pan:2,oro:1     --carga 2     --mantener-jinete 1
if (args.get("apoyo-libre") === "si") BATTLE_TWEAKS.supportAnyOrigin = true;
if (args.get("cruces") === "si") BATTLE_TWEAKS.crossingClash = true;
const untilAttacked = args.get("fortificar-hasta-ataque") === "si";
if (untilAttacked) BATTLE_TWEAKS.fortifyUntilAttacked = true;
if (args.has("coste-fortificar")) FORTIFY_COST.piedra = Number(args.get("coste-fortificar"));
// --mantener-fortificacion piedra:2   coste de cada casilla fortificada el domingo
if (args.has("mantener-fortificacion")) {
  for (const kv of args.get("mantener-fortificacion")!.split(",")) FORTIFY_UPKEEP[kv.split(":")[0] as "piedra"] = Number(kv.split(":")[1]);
}
const captainMode = (args.get("capitan-modo") ?? "ataques") as typeof BOT_TWEAKS.captain;
BOT_TWEAKS.captain = captainMode;
if (captainMode === "solo") BATTLE_TWEAKS.captainAlone = true;
if (args.has("jinetes-pares") || args.has("jinetes-impares")) {
  const even = args.has("jinetes-pares") ? Number(args.get("jinetes-pares")) : null;
  const odd = args.has("jinetes-impares") ? Number(args.get("jinetes-impares")) : null;
  BOT_TWEAKS.riderShare = (house) => (house % 2 === 0 ? even : odd);
}
if (args.has("coste-jinete")) {
  UNITS.jinetes.cost = Object.fromEntries(args.get("coste-jinete")!.split(",").map((kv) => [kv.split(":")[0], Number(kv.split(":")[1])]));
}
if (args.has("carga")) UNITS.jinetes.charge = Number(args.get("carga"));
// --atrincherar pares: las casas pares fortifican toda su frontera con otras casas.
if (args.get("atrincherar") === "pares") BOT_TWEAKS.fortifyFrontier = (house) => house % 2 === 0;
// Bloque 5 de la hoja de ruta (recursos):
//   --oro-mejora 5,10,20,30   Oro que se suma al coste de subir a los niveles 2, 3, 4 y 5
//   --riqueza-tope 10         Prestigio máximo por el Oro guardado
if (args.has("oro-mejora")) {
  args.get("oro-mejora")!.split(",").forEach((n, i) => {
    const cost = UPGRADE_COST[(i + 2) as 2 | 3 | 4 | 5];
    cost.oro = (cost.oro ?? 0) + Number(n);
  });
}
if (args.has("riqueza-tope")) PRESTIGE.goldMax = Number(args.get("riqueza-tope"));
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
  results.push(simulateGame({ seed: `sim-${i}`, strategies, weeks, events: args.get("eventos") !== "no", terrain: args.get("terreno") !== "no", units: args.get("tropas") !== "no", sieges: args.get("asedios") !== "no", captainGlory: args.get("capitan") !== "no", ...(untilAttacked ? { fortify: 100000 } : {}) }));
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
  `# Simulación: ${games} partidas de ${weeks} semanas, ${minPlayers}-${maxPlayers} casas, modo ${mode}${args.get("eventos") === "no" ? ", sin eventos" : ""}${args.get("terreno") === "no" ? ", sin terreno" : ""}${args.get("tropas") === "no" ? ", solo Mesnada" : ""}${args.get("asedios") === "no" ? ", sin asedios" : ""}${args.get("capitan") === "no" ? ", sin Capitán ni Gloria" : ""}`,
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
  ["Órdenes de asedio", f1(avg(results.map((r) => r.siegeOrders)))],
  ["Capitanes capturados", f1(avg(results.map((r) => r.captainsCaptured)))],
  ["Noches de asedio (a castillos)", `${f1(avg(results.map((r) => r.siegeNights)))} (${f1(avg(results.map((r) => r.castleSiegeNights)))})`],
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

// ---------------------------------------------------------------------------
// Bloque 4: retoques del sistema de batalla.
const sumB = (k: keyof SimGameResult["battle"]) => results.reduce((a, r) => a + r.battle[k], 0);
const per = (k: keyof SimGameResult["battle"]) => f1(sumB(k) / results.length);
const capN = houses.reduce(
  (a, h) => ({ castillo: a.castillo + h.captainNights.castillo, frente: a.frente + h.captainNights.frente, retaguardia: a.retaguardia + h.captainNights.retaguardia, preso: a.preso + h.captainNights.preso }),
  { castillo: 0, frente: 0, retaguardia: 0, preso: 0 },
);
const capT = capN.castillo + capN.frente + capN.retaguardia + capN.preso || 1;
const norm = (h: SimHouseResult & { players: number }) => (h.rank - 1) / Math.max(1, h.players - 1);
const fighters = houses.filter((h) => h.war.combats > 0);
const isLong = (h: SimHouseResult) => h.war.topEnemyCombats >= 10 && h.war.topEnemyCombats >= 0.8 * h.war.combats;
const longWar = houses.filter(isLong);
const rest = houses.filter((h) => !isLong(h));
table("Bloque 4: batalla (por partida)", ["dato", "valor"], [
  ["Choques frontales", per("clashes")],
  ["Cruces por el camino (sin choque si no se activa)", per("crossings")],
  ["Ataques con jinetes / a la carga", `${per("riderAttacks")} / ${per("chargeAttacks")}`],
  ["Fortificaciones / casillas-noche fortificadas", `${per("fortifies")} / ${per("fortifiedNights")}`],
  ["Mantenimiento de fortificaciones pagado / desmanteladas", `${per("fortifyUpkeep")} / ${per("fortifyDropped")}`],
  ["Ataques a casillas fortificadas (los toman)", `${per("attacksOnFortified")} (${pct(sumB("attacksOnFortifiedWon") / Math.max(1, sumB("attacksOnFortified")))})`],
  ["Capitán: castillo / frente / retaguardia / preso", `${pct(capN.castillo / capT)} / ${pct(capN.frente / capT)} / ${pct(capN.retaguardia / capT)} / ${pct(capN.preso / capT)}`],
  ["Ataques con el Capitán (por casa)", f1(avg(houses.map((h) => h.captainAttacks)))],
]);
table("Bloque 4: guerras (por casa)", ["dato", "valor"], [
  ["Casas enemigas con las que combate", f1(avg(houses.map((h) => h.war.enemies)))],
  ["Combates contra casas", f1(avg(houses.map((h) => h.war.combats)))],
  ["Parte de esos combates contra la misma casa", pct(avg(fighters.map((h) => h.war.topEnemyCombats / h.war.combats)))],
  ["Duración de la guerra principal (resoluciones)", f1(avg(fighters.map((h) => h.war.topEnemySpan)))],
  ["Noches con dos frentes", f1(avg(houses.map((h) => h.war.twoFrontNights)))],
  ["Casas encerradas en una guerra (10+ combates, 80% con la misma)", pct(longWar.length / houses.length)],
  ["Puesto relativo en guerra larga / resto (0 = 1.º)", `${avg(longWar.map(norm)).toFixed(2)} / ${avg(rest.map(norm)).toFixed(2)}`],
  ["Ganan en guerra larga / resto (x esperado)", `${f1(winStats(longWar).ratio)} / ${f1(winStats(rest).ratio)}`],
]);
if (BOT_TWEAKS.riderShare || BOT_TWEAKS.fortifyFrontier) {
  table(
    "Bloque 4: casas pares frente a impares",
    ["casas", "n", "gana", "x esperado", "puesto medio", "Prestigio", "territorio", "Mesnada", "Jinetes"],
    [0, 1].map((par) => {
      const g = houses.filter((h) => h.house % 2 === par);
      const w = winStats(g);
      return [par === 0 ? "pares" : "impares", g.length, pct(w.rate), f1(w.ratio), avg(g.map(norm)).toFixed(2), f1(avg(g.map((h) => h.prestige.total))), f1(avg(g.map((h) => h.prestige.territorio))), f1(avg(g.map((h) => h.recruitedHouse.mesnada))), f1(avg(g.map((h) => h.recruitedHouse.jinetes)))];
    }),
  );
}

const json = args.get("json");
if (json) {
  writeFileSync(json, JSON.stringify({ games, weeks, mode, results }, null, 0));
  console.log(`\nDatos completos en ${json}`);
}
