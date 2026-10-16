// Simulador de partidas entre bots, para equilibrar los números de rules.ts.
// Reproduce en memoria el calendario del servidor (apps/server/src/jobs.ts):
// producción diaria, acciones del día, comercio, resoluciones el miércoles y el
// domingo, mantenimiento, ayuda al último, Prestigio y final con objetivos.
// Es puro y determinista: misma semilla y estrategias, misma partida.
//
// Si cambia el orden de las tareas en jobs.ts, hay que cambiarlo aquí también.

import { applyUpkeep, lastPlace } from "./actions";
import { planAutopilot, type AutopilotPlan, type AutopilotTemplate } from "./autopilot";
import { botAcceptsOffer, planBotOrders } from "./bots";
import { dailyProduction } from "./economy";
import { generateMap } from "./mapgen";
import { dealObjectives, objectiveMet, type ObjectiveKey } from "./objectives";
import { computePrestige, isValidTrade, type AchievementKey, type PrestigeBreakdown } from "./prestige";
import { resolveCampaign } from "./combat";
import { PRESTIGE, SPECIALTY_PAIRS, STARTING_RESOURCES } from "./rules";
import { totalOf } from "./trade";
import { BUILDINGS, RESOURCES, type BuildingKind, type HouseId, type Order, type Resource, type Resources, type Tile } from "./types";
import {
  PERSONALITIES,
  PERSONALITY_NAMES,
  chooseObjective,
  offerGain,
  planDay,
  planOrders,
  proposeOffer,
  situation,
  type AiView,
  type PersonalityName,
} from "./ai";

/**
 * Cómo juega cada casa simulada.
 * Bots con personalidad (ai/): estratega, mercader, guerrero, arquitecta y
 * oportunista. Valoran recursos, objetivos y amenazas, atacan con apoyos,
 * defienden y comercian entre ellos.
 * Bots clásicos, más simples (sirven de referencia):
 * - equilibrada: el bot de las partidas de prueba (piloto equilibrado + ataques).
 * - constructora: sube edificios siempre que puede; solo ataca neutrales con mucho margen.
 * - conquistadora: recluta todo lo que puede y ataca con poco margen, también a otras casas.
 * - comerciante: como la equilibrada, pero cada día cambia lo que le sobra por lo que le falta.
 * - ausente: solo el piloto automático (nunca ataca, defiende con +25%).
 * - pasiva: no hace nada (como quien se apunta y no vuelve a entrar sin piloto).
 */
export const CLASSIC_STRATEGIES = ["equilibrada", "constructora", "conquistadora", "comerciante", "ausente", "pasiva"] as const;
export type ClassicStrategy = (typeof CLASSIC_STRATEGIES)[number];
export type Strategy = ClassicStrategy | PersonalityName;
export const STRATEGIES: Strategy[] = [...PERSONALITY_NAMES, ...CLASSIC_STRATEGIES];

function isSmart(s: Strategy): s is PersonalityName {
  return s in PERSONALITIES;
}

const ORDERS: Record<ClassicStrategy, Parameters<typeof planBotOrders>[0]["margins"] | "none" | "default"> = {
  equilibrada: "default",
  constructora: { neutral: 1.5, house: 99 },
  conquistadora: { neutral: 1.05, house: 1.15 },
  comerciante: "default",
  ausente: "none",
  pasiva: "none",
};

const PREFERRED_OBJECTIVES: Partial<Record<ClassicStrategy, ObjectiveKey[]>> = {
  constructora: ["edificios_nivel_3", "obra_maestra", "oro_200"],
  conquistadora: ["casillas_ajenas", "seis_casillas", "fortaleza", "tropas_40", "puerto_y_fortaleza"],
  comerciante: ["comercio_con_tres", "diez_tratos"],
};

export interface SimOptions {
  seed: string;
  /** Una estrategia por casa (de 4 a 8). */
  strategies: Strategy[];
  weeks: 2 | 4 | 6 | 8;
}

export interface SimHouseResult {
  house: HouseId;
  strategy: Strategy;
  /** Especialidades iniciales (los dos edificios a nivel 2). */
  specialty: string;
  rank: number;
  prestige: PrestigeBreakdown;
  objective: ObjectiveKey;
  objectiveMet: boolean;
  tiles: number;
  troops: number;
  buildingLevels: number;
  levels: Record<BuildingKind, number>;
  leftover: Resources;
  deserted: number;
  validTrades: number;
  partners: number;
  /** Semanas que recibió la ayuda al último. */
  helpWeeks: number;
  /** Puesto tras el domingo de la semana 2 (1 = primero). */
  rankWeek2: number | null;
  /** Prestigio cada domingo. */
  prestigeBySunday: number[];
}

export interface SimGameResult {
  seed: string;
  weeks: number;
  houses: SimHouseResult[];
  winner: HouseId;
  /** Diferencia de Prestigio entre el primero y el segundo. */
  margin: number;
  /** El ganador se decidió por desempate (casillas u Oro). */
  tiebreak: boolean;
  neutralTotal: number;
  neutralLeft: number;
  combatsVsNeutral: number;
  combatsVsHouse: number;
  conquestsFromHouses: number;
  bounces: number;
  /** Órdenes de ataque (a casillas ajenas) y cuántas tomaron la casilla. */
  attacks: number;
  attacksWon: number;
  /** Órdenes de apoyo (a ataques o a defensas). */
  supports: number;
  /** Tratos cerrados (válidos o no). */
  trades: number;
  /** Mapa al final de la partida. */
  finalTiles: Tile[];
}

interface HouseState {
  id: HouseId;
  strategy: Strategy;
  specialty: string;
  levels: Record<BuildingKind, number>;
  res: Resources;
  objective: ObjectiveKey;
  helpUntil: number | null;
  helpWeeks: number;
  deserted: number;
  takenFromHouses: number;
  achievements: Partial<Record<AchievementKey, number>>;
  prestigeBySunday: number[];
  /** Recurso que pide como ayuda al último. */
  helpChoice: Resource | null;
}

export function simulateGame(opts: SimOptions): SimGameResult {
  const ids = opts.strategies.map((_, i) => i + 1);
  const map = generateMap(opts.seed, ids);
  let tiles: Tile[] = map.tiles.map((t, i) => ({
    id: i + 1,
    x: t.x,
    y: t.y,
    type: t.type,
    owner: t.owner,
    troops: t.troops,
    fortifiedUntil: null,
    castleOf: t.castleOf ?? null,
  }));
  const objectives = dealObjectives(opts.seed, ids);
  const houses: HouseState[] = ids.map((id, i) => {
    const pair = SPECIALTY_PAIRS[i % SPECIALTY_PAIRS.length]!;
    const strategy = opts.strategies[i]!;
    const options = objectives.get(id)!;
    const preferred = isSmart(strategy) ? [chooseObjective(options, PERSONALITIES[strategy])] : (PREFERRED_OBJECTIVES[strategy] ?? []);
    return {
      id,
      strategy,
      specialty: pair.join("+"),
      levels: Object.fromEntries(BUILDINGS.map((b) => [b, pair.includes(b) ? 2 : 1])) as Record<BuildingKind, number>,
      res: Object.fromEntries(RESOURCES.map((r) => [r, STARTING_RESOURCES])) as Resources,
      // Quien no elige se queda con el primero (como en el servidor).
      objective: options.find((o) => preferred.includes(o)) ?? options[0],
      helpUntil: null,
      helpWeeks: 0,
      deserted: 0,
      takenFromHouses: 0,
      achievements: {},
      prestigeBySunday: [],
      helpChoice: null,
    };
  });
  const byId = new Map(houses.map((h) => [h.id, h]));
  const trades: { a: HouseId; b: HouseId; day: number; valid: boolean }[] = [];
  const absent = houses.filter((h) => h.strategy === "ausente").map((h) => h.id);
  const neutralTotal = tiles.filter((t) => t.owner == null).length;
  const totalResolutions = opts.weeks * 2;
  let resolution = 0;
  let combatsVsNeutral = 0;
  let combatsVsHouse = 0;
  let conquestsFromHouses = 0;
  let bounces = 0;
  let attacks = 0;
  let attacksWon = 0;
  let supports = 0;
  let rankWeek2: Map<HouseId, number> | null = null;

  const prestigeOf = (h: HouseState, day: number, objectiveMet?: boolean) => {
    const partners = new Set<HouseId>();
    for (const t of trades) {
      if (!t.valid || day - t.day >= PRESTIGE.tradeWindowDays) continue;
      if (t.a === h.id) partners.add(t.b);
      if (t.b === h.id) partners.add(t.a);
    }
    return computePrestige({
      house: h.id,
      tiles,
      buildings: h.levels,
      gold: h.res.oro,
      tradePartners: partners.size,
      achievements: h.achievements,
      secretObjectiveMet: objectiveMet,
    });
  };

  const totalDays = opts.weeks * 7;
  /** Lo que ve una casa con personalidad (sus casillas y vecinas, Prestigio público). */
  const viewOf = (h: HouseState, day: number, ranking: { house: HouseId; total: number }[]): AiView => ({
    house: h.id,
    tiles,
    buildings: h.levels,
    resources: { ...h.res },
    nextResolution: resolution + 1,
    day,
    totalDays,
    objective: h.objective,
    prestige: ranking,
    recentPartners: [
      ...new Set(
        trades
          .filter((t) => t.valid && day - t.day < PRESTIGE.tradeWindowDays && (t.a === h.id || t.b === h.id))
          .map((t) => (t.a === h.id ? t.b : t.a)),
      ),
    ],
    help: h.helpUntil != null && h.helpUntil > resolution ? (h.helpChoice ?? "pan") : null,
  });
  const ranking = (day: number) => houses.map((h) => ({ house: h.id, total: prestigeOf(h, day).total }));

  for (let day = 0; day < totalDays; day++) {
    // 1. Producción (y ayuda al último si está activa).
    for (const h of houses) {
      const helpActive = h.helpUntil != null && h.helpUntil > resolution;
      const help = helpActive ? (isSmart(h.strategy) ? (h.helpChoice ?? "pan") : helpResource(h.res)) : null;
      const p = dailyProduction(h.levels, tiles.filter((t) => t.owner === h.id), help);
      for (const r of RESOURCES) h.res[r] += p[r];
    }

    // 2. Acciones del día según la estrategia.
    const morning = ranking(day);
    for (const h of houses) {
      if (isSmart(h.strategy)) {
        const plan = planDay(situation(viewOf(h, day, morning), PERSONALITIES[h.strategy]));
        for (const r of RESOURCES) h.res[r] -= plan.cost[r];
        for (const b of plan.upgrades) {
          h.levels[b]++;
          if (h.levels[b] === 5 && !houses.some((o) => o.achievements.obra_maestra)) h.achievements.obra_maestra = 1;
        }
        for (const f of plan.fortify) tiles = tiles.map((t) => (t.id === f.tile ? { ...t, fortifiedUntil: f.until } : t));
        if (plan.recruit > 0) tiles = tiles.map((t) => (t.castleOf === h.id ? { ...t, troops: t.troops + plan.recruit } : t));
        h.helpChoice = plan.help;
        continue;
      }
      const plan = dailyPlan(h as HouseState & { strategy: ClassicStrategy }, day, tiles, resolution + 1);
      if (!plan) continue;
      for (const [r, v] of Object.entries(plan.cost) as [Resource, number][]) h.res[r] -= v;
      if (plan.upgrade) {
        h.levels[plan.upgrade]++;
        if (h.levels[plan.upgrade] === 5 && !houses.some((o) => o.achievements.obra_maestra)) h.achievements.obra_maestra = 1;
      }
      if (plan.fortify) tiles = tiles.map((t) => (t.id === plan.fortify!.tile ? { ...t, fortifiedUntil: plan.fortify!.until } : t));
      if (plan.recruit > 0) tiles = tiles.map((t) => (t.castleOf === h.id ? { ...t, troops: t.troops + plan.recruit } : t));
    }

    // 3. Comercio: las comerciantes cambian lo que les sobra por lo que les falta.
    for (const h of houses) {
      if (h.strategy !== "comerciante") continue;
      const trade = proposeTrade(h, houses, trades, day);
      if (!trade) continue;
      const { partner, give, want, amount } = trade;
      h.res[give] -= amount;
      h.res[want] += amount;
      partner.res[give] += amount;
      partner.res[want] -= amount;
      trades.push({ a: h.id, b: partner.id, day, valid: isValidTrade(amount, amount) });
    }

    // 3b. Mercado: cada casa con personalidad publica como mucho una oferta y
    // la acepta quien más gane con ella (las clásicas, si no pierden).
    const market = ranking(day);
    for (const h of houses.filter((x) => isSmart(x.strategy))) {
      const offer = proposeOffer(situation(viewOf(h, day, market), PERSONALITIES[h.strategy as PersonalityName]));
      if (!offer) continue;
      let best: { o: HouseState; gain: number } | null = null;
      for (const o of houses) {
        if (o.id === h.id || o.strategy === "ausente" || o.strategy === "pasiva") continue;
        const gain = isSmart(o.strategy)
          ? offerGain(situation(viewOf(o, day, market), PERSONALITIES[o.strategy]), offer.give, offer.want, h.id)
          : botAcceptsOffer(offer.give, offer.want, o.res)
            ? totalOf(offer.give) - totalOf(offer.want)
            : -Infinity;
        if (gain > 0 && (!best || gain > best.gain)) best = { o, gain };
      }
      if (!best) continue;
      if (RESOURCES.some((r) => h.res[r] < (offer.give[r] ?? 0))) continue;
      for (const r of RESOURCES) {
        const d = (offer.give[r] ?? 0) - (offer.want[r] ?? 0);
        h.res[r] -= d;
        best.o.res[r] += d;
      }
      trades.push({ a: h.id, b: best.o.id, day, valid: isValidTrade(totalOf(offer.give), totalOf(offer.want)) });
    }

    // 4. Resolución el miércoles (día 2) y el domingo (día 6).
    const weekday = day % 7;
    if (weekday !== 2 && weekday !== 6) continue;
    resolution++;
    const orders: Order[] = [];
    const evening = ranking(day);
    for (const h of houses) {
      if (isSmart(h.strategy)) {
        orders.push(...planOrders(situation(viewOf(h, day, evening), PERSONALITIES[h.strategy])));
        continue;
      }
      const margins = ORDERS[h.strategy];
      if (margins === "none") continue;
      orders.push(
        ...planBotOrders({
          house: h.id,
          tiles,
          resolution,
          absentHouses: absent,
          margins: margins === "default" ? undefined : margins,
          attackHouses: h.strategy !== "constructora",
        }),
      );
    }
    const before = new Map(tiles.map((t) => [t.id, t]));
    for (const o of orders) {
      if (o.kind === "support") supports++;
      else if (before.get(o.to)?.owner !== o.house) attacks++;
    }
    const result = resolveCampaign({ resolution, tiles, orders, absentHouses: absent });
    tiles = result.tiles;
    for (const e of result.events) {
      if (e.type === "rebote") bounces++;
      if (e.type !== "combate") continue;
      if (e.previousOwner == null) combatsVsNeutral++;
      else combatsVsHouse++;
      if (e.conquered) attacksWon++;
      if (e.conquered && e.winner != null && e.previousOwner != null) {
        conquestsFromHouses++;
        byId.get(e.winner)!.takenFromHouses++;
      }
      if (
        e.conquered &&
        e.winner != null &&
        before.get(e.tile)?.type === "fortaleza" &&
        !houses.some((h) => h.achievements.primera_fortaleza)
      ) {
        byId.get(e.winner)!.achievements.primera_fortaleza = 1;
      }
    }

    if (weekday === 6) {
      for (const h of houses) {
        const upkeep = applyUpkeep(tiles, h.id, h.res.pan);
        tiles = upkeep.tiles;
        h.res.pan -= upkeep.paid;
        h.deserted += upkeep.deserted;
      }
      const totals = houses.map((h) => ({ house: h.id, total: prestigeOf(h, day).total }));
      totals.forEach((t) => byId.get(t.house)!.prestigeBySunday.push(t.total));
      if (resolution === 4) rankWeek2 = ranks(totals);
      for (const h of houses) h.helpUntil = null;
      const last = lastPlace(totals);
      if (last != null && resolution < totalResolutions) {
        byId.get(last)!.helpUntil = resolution + 2;
        byId.get(last)!.helpWeeks++;
      }
    }
  }

  // Final: objetivos secretos y clasificación (Prestigio, casillas, Oro).
  const lastDay = opts.weeks * 7 - 1;
  const final = houses.map((h) => {
    const partners = new Set<HouseId>();
    let valid = 0;
    for (const t of trades) {
      if (!t.valid || (t.a !== h.id && t.b !== h.id)) continue;
      valid++;
      partners.add(t.a === h.id ? t.b : t.a);
    }
    const met = objectiveMet(h.objective, {
      house: h.id,
      tiles,
      buildings: h.levels,
      gold: h.res.oro,
      partnersAllGame: partners.size,
      otherHouses: houses.length - 1,
      validTradesAllGame: valid,
      tilesTakenFromHouses: h.takenFromHouses,
    });
    const own = tiles.filter((t) => t.owner === h.id);
    return {
      h,
      met,
      prestige: prestigeOf(h, lastDay, met),
      tiles: own.filter((t) => t.type !== "castillo").length,
      troops: own.reduce((a, t) => a + t.troops, 0),
      valid,
      partners: partners.size,
    };
  });
  final.sort((a, b) => b.prestige.total - a.prestige.total || b.tiles - a.tiles || b.h.res.oro - a.h.res.oro);

  return {
    seed: opts.seed,
    weeks: opts.weeks,
    winner: final[0]!.h.id,
    margin: final[0]!.prestige.total - (final[1]?.prestige.total ?? 0),
    tiebreak: final.length > 1 && final[0]!.prestige.total === final[1]!.prestige.total,
    neutralTotal,
    neutralLeft: tiles.filter((t) => t.owner == null).length,
    combatsVsNeutral,
    combatsVsHouse,
    conquestsFromHouses,
    bounces,
    attacks,
    attacksWon,
    supports,
    trades: trades.length,
    finalTiles: tiles,
    houses: final.map((f, i) => ({
      house: f.h.id,
      strategy: f.h.strategy,
      specialty: f.h.specialty,
      rank: i + 1,
      prestige: f.prestige,
      objective: f.h.objective,
      objectiveMet: f.met,
      tiles: f.tiles,
      troops: f.troops,
      buildingLevels: Object.values(f.h.levels).reduce((a, l) => a + l, 0),
      levels: { ...f.h.levels },
      leftover: { ...f.h.res },
      deserted: f.h.deserted,
      validTrades: f.valid,
      partners: f.partners,
      helpWeeks: f.h.helpWeeks,
      rankWeek2: rankWeek2?.get(f.h.id) ?? null,
      prestigeBySunday: f.h.prestigeBySunday,
    })),
  };
}

function dailyPlan(h: HouseState & { strategy: ClassicStrategy }, day: number, tiles: Tile[], nextResolution: number): AutopilotPlan | null {
  const run = (template: AutopilotTemplate) =>
    planAutopilot({ template, day, house: h.id, tiles, buildings: h.levels, resources: { ...h.res }, nextResolution });
  switch (h.strategy) {
    case "pasiva":
      return null;
    case "constructora": {
      const build = run("economica");
      return build.upgrade ? build : run("defensiva");
    }
    case "conquistadora":
      return run("defensiva");
    default:
      return run("equilibrada");
  }
}

/** La ayuda al último va al recurso del que menos tiene. */
function helpResource(res: Resources): Resource {
  return [...RESOURCES].sort((a, b) => res[a] - res[b])[0]!;
}

const TRADE_AMOUNT = 10;

function proposeTrade(
  h: HouseState,
  houses: HouseState[],
  trades: { a: HouseId; b: HouseId; day: number }[],
  day: number,
): { partner: HouseState; give: Resource; want: Resource; amount: number } | null {
  const sorted = [...RESOURCES].sort((a, b) => h.res[b] - h.res[a] || RESOURCES.indexOf(a) - RESOURCES.indexOf(b));
  const give = sorted[0]!;
  if (h.res[give] < TRADE_AMOUNT * 2) return null;
  const recent = (o: HouseState) =>
    trades.some((t) => day - t.day < PRESTIGE.tradeWindowDays && ((t.a === h.id && t.b === o.id) || (t.b === h.id && t.a === o.id)));
  // Pide lo que menos tiene entre lo que a alguien le sobre (al menos el doble de lo que entrega).
  for (const want of [...sorted].reverse()) {
    if (want === give || h.res[give] - h.res[want] < TRADE_AMOUNT) continue;
    const partner = houses
      .filter((o) => o.id !== h.id && o.strategy !== "ausente" && o.strategy !== "pasiva")
      .filter((o) => o.res[want] >= TRADE_AMOUNT * 2)
      .filter((o) => botAcceptsOffer({ [give]: TRADE_AMOUNT }, { [want]: TRADE_AMOUNT }, o.res))
      .sort((a, b) => Number(recent(a)) - Number(recent(b)) || b.res[want] - a.res[want] || a.id - b.id)[0];
    if (partner) return { partner, give, want, amount: TRADE_AMOUNT };
  }
  return null;
}

function ranks(totals: { house: HouseId; total: number }[]): Map<HouseId, number> {
  const sorted = [...totals].sort((a, b) => b.total - a.total || a.house - b.house);
  return new Map(sorted.map((t, i) => [t.house, i + 1]));
}
