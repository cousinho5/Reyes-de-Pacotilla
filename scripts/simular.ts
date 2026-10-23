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
//   npm run simular -- --geografia no     # mapa de antes del bloque 1 (sin geografía ni Prado), para comparar
//   npm run simular -- --rios no          # sin ríos ni lagos, para comparar
//   npm run simular -- --alianzas no      # sin alianzas (bloque 8), para comparar
//   npm run simular -- --json simulacion.json   # además, todos los datos en JSON

import { writeFileSync } from "node:fs";
import { TITLES, ALLIANCE, ALLIANCE_BOTS, BATTLE_TWEAKS, BOT_TWEAKS, CROWN, ECONOMY_TWEAKS, FEATURES, MERCENARIES, OBJECTIVE_TARGETS, MAP_GEN, RIVERS, FORTIFY_COST, FORTIFY_UPKEEP, PRESTIGE, SIEGE, UNITS, UPGRADE_COST } from "../packages/engine/src";
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
//   --apoyo-libre no               apoyar un ataque eligiendo de dónde viene (antes del bloque 4)
//   --cruces no                    sin el choque de los grupos que se cruzan por el camino (encendido desde el bloque 4)
//   --fortificar-hasta-ataque no   la fortificación de antes: unas noches y sin mantenimiento (encendida desde el bloque 4)
//   --coste-fortificar 12          Piedra por fortificar
//   --capitan-modo ataques|avance  el Capitán de antes: solo con los ataques, o también con los avances (por defecto, "solo": además va solo al frente, con rescates)
//   --jinetes-pares 1 --jinetes-impares 0   parte de jinetes al reclutar según la casa (par o impar)
//   --coste-jinete hierro:3,pan:2,oro:1     --carga 2     --mantener-jinete 1
if (args.get("apoyo-libre") === "no") BATTLE_TWEAKS.supportAnyOrigin = false;
else if (args.get("apoyo-libre") === "si") BATTLE_TWEAKS.supportAnyOrigin = true;
if (args.has("cruces")) BATTLE_TWEAKS.crossingClash = args.get("cruces") === "si";
// --fortificar-hasta-ataque no: la fortificación de antes (unas noches, sin mantenimiento).
if (args.get("fortificar-hasta-ataque") === "no") {
  BATTLE_TWEAKS.fortifyUntilAttacked = false;
  for (const r of Object.keys(FORTIFY_UPKEEP)) delete FORTIFY_UPKEEP[r as "piedra"];
}
if (args.has("coste-fortificar")) FORTIFY_COST.piedra = Number(args.get("coste-fortificar"));
// --mantener-fortificacion piedra:2   coste de cada casilla fortificada el domingo (piedra:0 = gratis)
if (args.has("mantener-fortificacion")) {
  for (const kv of args.get("mantener-fortificacion")!.split(",")) FORTIFY_UPKEEP[kv.split(":")[0] as "piedra"] = Number(kv.split(":")[1]);
}
// Desde el bloque 4 el Capitán va solo al frente; --capitan-modo ataques compara con el de antes (sin ir solo ni rescates).
if (args.has("capitan-modo")) {
  BOT_TWEAKS.captain = args.get("capitan-modo") as typeof BOT_TWEAKS.captain;
  BATTLE_TWEAKS.captainAlone = BOT_TWEAKS.captain === "solo";
}
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
//   --tesoro 100               Oro del objetivo «tesoro»
if (args.has("tesoro")) (OBJECTIVE_TARGETS as { gold: number }).gold = Number(args.get("tesoro"));
//   --corona no                     sin el cambio con la Corona (encendido desde el bloque 5; CROWN en rules.ts)
//   --mercenarios no|soldada        sin mercenarios, o a soldada (de alquiler desde el bloque 5; MERCENARIES en rules.ts)
//   --mejora-madera-piedra 1.3      multiplica la Madera y la Piedra de las mejoras
// Bloque 1: --geografia no usa el generador de mapas de antes (sin geografía ni Prado).
if (args.get("geografia") === "no") MAP_GEN.geography = false;
// --rios no: sin ríos ni lagos (fase 2 del bloque 1), para comparar.
if (args.get("rios") === "no") RIVERS.enabled = false;
// --aldeas no, --ruinas no: sin Aldeas o sin Ruinas (fase 3 del bloque 1), para comparar.
if (args.get("aldeas") === "no") FEATURES.villages = false;
if (args.get("ruinas") === "no") FEATURES.ruins = false;
// --campos 0.2: parte de campos en el mapa con geografía (lo que falte hasta 0,2 es Prado).
if (args.has("campos")) {
  MAP_GEN.mix.campos = Number(args.get("campos"));
  MAP_GEN.mix.prado = Math.max(0, 0.2 - MAP_GEN.mix.campos);
}
// --prado-paramos 0.5: parte de los páramos que pasan a Prado.
if (args.has("prado-paramos")) MAP_GEN.pradoShare = Number(args.get("prado-paramos"));
if (args.get("corona") === "no") ECONOMY_TWEAKS.crown = false;
// Bloque 8: --alianzas no (sin alianzas), --alianzas-tope 1 (máximo por casa), --alianzas-ganas 0.2 (umbral de los bots para proponer).
if (args.get("alianzas") === "no") ALLIANCE.enabled = false;
if (args.has("alianzas-tope")) ALLIANCE.maxPerHouse = Number(args.get("alianzas-tope"));
if (args.has("alianzas-ganas")) ALLIANCE_BOTS.proposeAbove = Number(args.get("alianzas-ganas"));
if (args.has("corona-base")) CROWN.base = Number(args.get("corona-base"));
//   --corona-referencia oro|media   --corona-recargo 1.3 (lo que carga la Corona sobre el precio)
if (args.has("corona-referencia")) CROWN.reference = args.get("corona-referencia") as "oro" | "media";
if (args.has("corona-recargo")) CROWN.markup = Number(args.get("corona-recargo"));
//   --mercenarios-tope 5 | no   mercenarios por casa y semana (no = sin tope)
if (args.has("mercenarios-tope")) MERCENARIES.weeklyCap = args.get("mercenarios-tope") === "no" ? Infinity : Number(args.get("mercenarios-tope"));
if (args.has("mercenarios")) ECONOMY_TWEAKS.mercenaries = args.get("mercenarios") === "no" ? null : (args.get("mercenarios") as "alquiler" | "soldada");
if (args.has("mejora-madera-piedra")) {
  const k = Number(args.get("mejora-madera-piedra"));
  for (const cost of Object.values(UPGRADE_COST)) {
    if (cost.madera) cost.madera = Math.round(cost.madera * k);
    if (cost.piedra) cost.piedra = Math.round(cost.piedra * k);
  }
}
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

const rand = seededRandom(`simulacion-${games}-${weeks}-${mode}${args.get("semilla") ?? ""}`);
const results: SimGameResult[] = [];
const started = Date.now();
for (let i = 0; i < games; i++) {
  const players = minPlayers + Math.floor(rand() * (maxPlayers - minPlayers + 1));
  const strategies = Array.from({ length: players }, () => pool[Math.floor(rand() * pool.length)]!);
  results.push(simulateGame({ seed: `sim-${args.get("semilla") ?? ""}${i}`, strategies, weeks, events: args.get("eventos") !== "no", terrain: args.get("terreno") !== "no", units: args.get("tropas") !== "no", sieges: args.get("asedios") !== "no", captainGlory: args.get("capitan") !== "no" }));
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
  `# Simulación: ${games} partidas de ${weeks} semanas, ${minPlayers}-${maxPlayers} casas, modo ${mode}${args.get("eventos") === "no" ? ", sin eventos" : ""}${args.get("terreno") === "no" ? ", sin terreno" : ""}${args.get("tropas") === "no" ? ", solo Mesnada" : ""}${args.get("asedios") === "no" ? ", sin asedios" : ""}${args.get("capitan") === "no" ? ", sin Capitán ni Gloria" : ""}${args.get("geografia") === "no" ? ", mapa sin geografía" : ""}${args.get("rios") === "no" ? ", sin ríos ni lagos" : ""}${ALLIANCE.enabled ? "" : ", sin alianzas"}`,
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
  ["Rescates pagados (Oro por rescate)", `${f1(avg(results.map((r) => r.ransomsPaid)))} (${f1(results.reduce((a, r) => a + r.ransomGold, 0) / Math.max(1, results.reduce((a, r) => a + r.ransomsPaid, 0)))})`],
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
  ["Bloque 1: ataques cruzando un río (los ganan)", `${per("riverAttacks")} (${pct(sumB("riverAttacksWon") / Math.max(1, sumB("riverAttacks")))})`],
  ["Bloque 1: ruinas tomadas (en la primera semana; día medio)", `${per("ruinsClaimed")} (${per("ruinsWeekOne")}; ${f1(sumB("ruinsDays") / Math.max(1, sumB("ruinsClaimed")))})`],
  ["Bloque 1: tropas reclutadas en aldeas / aldeas quitadas a otra casa", `${per("villageRecruits")} / ${per("villagesStolen")}`],
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

if (ECONOMY_TWEAKS.crown || ECONOMY_TWEAKS.mercenaries) {
  const sum = (f: (g: SimGameResult) => number) => f1(avg(results.map(f)));
  const res = (k: "crownBought") => RESOURCES.filter((r) => r !== "oro").map((r) => `${r} ${sum((g) => g.economy[k][r])}`).join(", ");
  table("Bloque 5: Oro (por partida)", ["dato", "valor"], [
    ["Comprado a la Corona", res("crownBought")],
    ["Precio medio de la Corona (Oro por unidad)", RESOURCES.filter((r) => r !== "oro").map((r) => `${r} ${avg(results.map((g) => g.economy.crownPrice[r])).toFixed(2)}`).join(", ")],
    ["Oro pagado a la Corona", sum((g) => g.economy.crownGoldPaid)],
    ["Mercenarios contratados / Oro gastado en ellos", `${sum((g) => g.economy.mercsHired)} / ${sum((g) => g.economy.mercsGold)}`],
    ["Mercenarios que desertan sin soldada", sum((g) => g.economy.mercsDeserted)],
  ]);
}

if (ALLIANCE.enabled) {
  const per = (f: (g: SimGameResult) => number) => f1(avg(results.map(f)));
  const durations = results.flatMap((g) => g.alliances.durations);
  const reasons = new Map<string, number>();
  for (const g of results) for (const [k, v] of Object.entries(g.alliances.reasons)) reasons.set(k, (reasons.get(k) ?? 0) + v);
  table("Bloque 8: alianzas (por partida)", ["dato", "valor"], [
    ["Propuestas / firmadas / rechazadas / caducadas", `${per((g) => g.alliances.proposed)} / ${per((g) => g.alliances.signed)} / ${per((g) => g.alliances.declined)} / ${per((g) => g.alliances.expired)}`],
    ["Rotas", per((g) => g.alliances.broken)],
    ["Motivos de ruptura (total)", [...reasons.entries()].map(([k, v]) => `${k} ${v}`).join(", ") || "—"],
    ["Duración media (resoluciones)", f1(avg(durations))],
    ["En vigor al final", per((g) => g.alliances.atEnd.length)],
    ["Ataques conjuntos / ganados", `${per((g) => g.alliances.jointAttacks)} / ${per((g) => g.alliances.jointWins)}`],
    ["Entradas en casillas aliadas / defensas con tropas de paso / expulsiones", `${per((g) => g.alliances.entries)} / ${per((g) => g.alliances.guestDefenses)} / ${per((g) => g.alliances.expulsions)}`],
    ["Partidas sin ninguna alianza", pct(results.filter((g) => g.alliances.signed === 0).length / results.length)],
    ["El ganador termina aliado con el segundo", pct(results.filter((g) => g.houses[0]!.alliances.atEnd.includes(g.houses[1]!.house)).length / results.length)],
    ["El ganador firmó alguna alianza", pct(results.filter((g) => g.houses[0]!.alliances.signed > 0).length / results.length)],
  ]);
  const groups: [string, (h: SimHouseResult) => boolean][] = [
    ["sin alianzas", (h) => h.alliances.signed === 0],
    ["con alguna alianza", (h) => h.alliances.signed > 0],
    ["aliada al final", (h) => h.alliances.atEnd.length > 0],
    ["rompió alguna", (h) => h.alliances.broke > 0],
  ];
  table(
    "Bloque 8: casas según sus alianzas",
    ["casas", "n", "gana", "x esperado", "puesto medio", "Prestigio", "territorio"],
    groups.map(([name, f]) => {
      const g = houses.filter(f);
      const w = winStats(g);
      return [name, g.length, pct(w.rate), f1(w.ratio), avg(g.map(norm)).toFixed(2), f1(avg(g.map((h) => h.prestige.total))), f1(avg(g.map((h) => h.prestige.territorio)))];
    }),
  );
  table(
    "Bloque 8: alianzas por personalidad",
    ["estrategia", "firmadas", "rotas", "aliada al final"],
    pool
      .filter((x, i) => pool.indexOf(x) === i)
      .map((x) => {
        const g = houses.filter((h) => h.strategy === x);
        return [x, f1(avg(g.map((h) => h.alliances.signed))), f1(avg(g.map((h) => h.alliances.broke))), pct(g.filter((h) => h.alliances.atEnd.length > 0).length / Math.max(1, g.length))];
      }),
  );
  console.log("\n«puesto medio»: 0 = primero, 1 = último.");
}

// Bloque 13: cuántas veces sale cada título de fin de partida y con qué puesto medio.
table(
  "Bloque 13: títulos de fin de partida",
  ["título", "partidas con él", "puesto medio", "lo lleva el ganador"],
  TITLES.map((t) => {
    const g = houses.filter((h) => h.title === t.key);
    return [t.name, pct(g.length / results.length), f1(avg(g.map(norm))), pct(g.filter((h) => h.rank === 1).length / results.length)];
  }),
);
console.log("\n«puesto medio»: 0 = primero, 1 = último.");

const json = args.get("json");
if (json) {
  writeFileSync(json, JSON.stringify({ games, weeks, mode, results }, null, 0));
  console.log(`\nDatos completos en ${json}`);
}
