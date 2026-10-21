// Simulador de partidas entre bots, para equilibrar los números de rules.ts.
// Reproduce en memoria el calendario del servidor (apps/server/src/jobs.ts):
// producción diaria, acciones del día, comercio, resoluciones el miércoles y el
// domingo, mantenimiento, ayuda al último, Prestigio y final con objetivos.
// Es puro y determinista: misma semilla y estrategias, misma partida.
//
// Si cambia el orden de las tareas en jobs.ts, hay que cambiarlo aquí también.

import { addRecruits, applyFortifyUpkeep, applyUpkeep, lastPlace } from "./actions";
import { planAutopilot, type AutopilotPlan, type AutopilotTemplate } from "./autopilot";
import { botAcceptsOffer, planBotOrders } from "./bots";
import { dailyProduction } from "./economy";
import { generateMap } from "./mapgen";
import { dealObjectives, objectiveMet, type ObjectiveKey } from "./objectives";
import { computePrestige, isValidTrade, type AchievementKey, type PrestigeBreakdown } from "./prestige";
import { gloryFromEvents, resolveCampaign } from "./combat";
import { fitOrders } from "./plan";
import { marchKind, marchPath } from "./terrain";
import { claimRuins, recruitSite } from "./aldeas";
import { areAdjacent } from "./map";
import { clampUnits, isPlain, orderUnits } from "./units";
import { crownPrices } from "./crown";
import type { MapLayoutOverride } from "./mapgen";
import { CROWN, ECONOMY_TWEAKS, MERCENARIES, TROOPS_PER_PAN, GRID, PRESTIGE, RHYTHM, SPECIALTY_PAIRS, STARTING_RESOURCES, SIEGE, TERRAIN, TERRAIN_OFF, UNITS, CAPTAIN, GLORY } from "./rules";
import { totalOf } from "./trade";
import { auctionLots, doubleLot, resolveAuction, type Bid } from "./auction";
import {
  applyEventNow,
  eventCombat,
  eventDoublesAuction,
  eventOfWeek,
  eventProduction,
  eventUpkeepFactor,
  productionEventWeek,
  type EventKey,
  type WeekEvent,
} from "./events";
import { checkCard, type CardKey, type CardParams } from "./cards";
import { BUILDINGS, RESOURCES, type Captain, type BuildingKind, type HouseId, type Order, type Resource, type Resources, type Tile } from "./types";
import {
  PERSONALITIES,
  PERSONALITY_NAMES,
  chooseObjective,
  offerGain,
  planBids,
  planCards,
  planCrown,
  planDay,
  planMercenaries,
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
  constructora: ["niveles_17", "obra_maestra", "tesoro"],
  conquistadora: ["casillas_ajenas", "cinco_casillas", "fortaleza", "tropas_40", "puerto_y_montana"],
  comerciante: ["comercio_con_tres", "diez_tratos"],
};

export interface SimOptions {
  seed: string;
  /** Una estrategia por casa (de 4 a 8). */
  strategies: Strategy[];
  weeks: 2 | 4 | 6 | 8;
  /** Eventos de la semana (por defecto, sí). */
  events?: boolean;
  /** Tamaño del mapa y páramos (para probar alternativas). */
  layout?: MapLayoutOverride;
  /** Forma de las casillas (por defecto, la de GRID). */
  grid?: "square" | "hex";
  /** Días con resolución, 0 = lunes (por defecto, los de RHYTHM). */
  resolutionDays?: number[];
  /** Resoluciones que dura fortificar (por defecto, la de RHYTHM). */
  fortify?: number;
  /** Terreno que cuenta en la guerra (por defecto, sí: TERRAIN); false para el diseño v2. */
  terrain?: boolean;
  /** Tipos de tropa (por defecto, sí); false: solo Mesnada, como en el diseño v2. */
  units?: boolean;
  /** Asedios (por defecto, sí). */
  sieges?: boolean;
  /** Capitán y Gloria (por defecto, sí). */
  captainGlory?: boolean;
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
  /** Lotes de la Gran Subasta ganados. */
  auctionsWon: number;
  /** Semanas que recibió la ayuda al último. */
  helpWeeks: number;
  /** Puesto tras el domingo de la semana 2 (1 = primero). */
  rankWeek2: number | null;
  /** Prestigio cada domingo. */
  prestigeBySunday: number[];
  /** Tropas reclutadas por esta casa. */
  recruitedHouse: { mesnada: number; jinetes: number; catapultas: number };
  /** Guerras (combates contra otras casas, como atacante o defensor). */
  war: {
    /** Casas distintas con las que ha combatido. */
    enemies: number;
    /** Combates contra otras casas y contra la que más. */
    combats: number;
    topEnemyCombats: number;
    /** Resoluciones entre el primer y el último combate contra esa casa. */
    topEnemySpan: number;
    /** Resoluciones con combates contra dos o más casas a la vez (en una ventana de 3 noches). */
    twoFrontNights: number;
  };
  /** Noches del Capitán: en el castillo, en el frente, en la retaguardia, preso. */
  captainNights: { castillo: number; frente: number; retaguardia: number; preso: number };
  /** Ataques en los que fue el Capitán. */
  captainAttacks: number;
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
  /** Primera resolución con combate entre casas (null si no hubo). */
  firstHouseCombat: number | null;
  /** Día (desde 1) de ese primer combate entre casas. */
  firstHouseCombatDay: number | null;
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
  /** Tropas reclutadas de cada tipo (bots con personalidad). */
  recruited: { mesnada: number; jinetes: number; catapultas: number };
  /** Capitanes capturados en la partida. */
  captainsCaptured: number;
  /** Órdenes de asedio, noches de asedio (todas) y noches de asedio a castillos. */
  siegeOrders: number;
  siegeNights: number;
  castleSiegeNights: number;
  /** Movimientos por camino (dos casillas) y travesías por mar. */
  roadMoves: number;
  seaMoves: number;
  /** Tratos cerrados (válidos o no). */
  trades: number;
  /** Oro gastado en la Gran Subasta y cartas usadas. */
  auctionGold: number;
  /** Eventos de cada semana, en orden. */
  events: EventKey[];
  cardsPlayed: number;
  /** Mapa al final de la partida. */
  finalTiles: Tile[];
  /** Datos del bloque 4 de la hoja de ruta. */
  battle: {
    /** Choques frontales (cambio de casilla o cruce). */
    clashes: number;
    /** Cruces sin choque: marchas de dos casillas que recorren al revés un tramo de otra casa. */
    crossings: number;
    /** Ataques de jinetes a la carga (llano sin murallas) y ataques con jinetes en total. */
    chargeAttacks: number;
    riderAttacks: number;
    /** Fortificaciones hechas y casillas-noche fortificadas. */
    fortifies: number;
    fortifiedNights: number;
    /** Ataques contra casillas fortificadas y cuántos la tomaron. */
    attacksOnFortified: number;
    attacksOnFortifiedWon: number;
    /** Bloque 1: ataques que cruzan un río sin puente y cuántos toman la casilla. */
    riverAttacks: number;
    riverAttacksWon: number;
    /** Bloque 1, fase 3: ruinas tomadas (y en la primera semana), tropas reclutadas en aldeas y aldeas quitadas a otra casa. */
    ruinsClaimed: number;
    ruinsWeekOne: number;
    /** Suma de los días (desde 1) en que se tomaron, para la media. */
    ruinsDays: number;
    villageRecruits: number;
    villagesStolen: number;
    /** Piedra u Oro pagados por mantener fortificaciones y fortificaciones desmanteladas. */
    fortifyUpkeep: number;
    fortifyDropped: number;
  };
  /** Datos del bloque 5 de la hoja de ruta: cambio con la Corona y mercenarios. */
  economy: {
    crownBought: Resources;
    crownSold: Resources;
    crownGoldPaid: number;
    crownGoldReceived: number;
    mercsHired: number;
    mercsGold: number;
    mercsDeserted: number;
    /** Precio medio que cobra la Corona por cada recurso (media de los días). */
    crownPrice: Resources;
  };
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
  hand: CardKey[];
  auctionsWon: number;
  spies: { house: HouseId; until: number }[];
  truces: { tile: number; resolution: number }[];
  drums: { resolution: number; bonus: number }[];
  /** Noches que ha tenido rodeado el castillo de otra casa (Prestigio). */
  siegeNights: number;
  /** Puntos de Gloria (Prestigio) y su Capitán. */
  glory: number;
  captain: Captain;
  recruitedHouse: { mesnada: number; jinetes: number; catapultas: number };
  captainNights: { castillo: number; frente: number; retaguardia: number; preso: number };
  captainAttacks: number;
  /** Bloque 5: lo comprado y vendido a la Corona esta semana, y sus mercenarios. */
  crownWeek: { buy: Resources; sell: Resources };
  mercs: { n: number; until: number }[];
  mercsWeek: number;
}

export function simulateGame(opts: SimOptions): SimGameResult {
  // Las opciones de forma y ritmo cambian GRID y RHYTHM solo durante esta partida.
  const saved = { grid: GRID.kind, days: RHYTHM.days, fortify: RHYTHM.fortify, terrain: { ...TERRAIN }, units: UNITS.enabled };
  if (opts.units === false) UNITS.enabled = false;
  const savedSiege = SIEGE.enabled;
  if (opts.sieges === false) SIEGE.enabled = false;
  const savedCG = { captain: CAPTAIN.enabled, glory: GLORY.enabled };
  if (opts.captainGlory === false) {
    CAPTAIN.enabled = false;
    GLORY.enabled = false;
  }
  GRID.kind = opts.grid ?? GRID.kind;
  RHYTHM.days = opts.resolutionDays ?? RHYTHM.days;
  RHYTHM.fortify = opts.fortify ?? RHYTHM.fortify;
  if (opts.terrain === false) Object.assign(TERRAIN, TERRAIN_OFF);
  try {
    return runGame(opts);
  } finally {
    GRID.kind = saved.grid;
    RHYTHM.days = saved.days;
    RHYTHM.fortify = saved.fortify;
    Object.assign(TERRAIN, saved.terrain);
    UNITS.enabled = saved.units;
    SIEGE.enabled = savedSiege;
    CAPTAIN.enabled = savedCG.captain;
    GLORY.enabled = savedCG.glory;
  }
}

/** Día de la semana de la próxima resolución vista desde `day` (la de hoy cuenta). */
function nextResolutionWeekday(day: number): number {
  const w = day % 7;
  return RHYTHM.days.find((d) => d >= w) ?? RHYTHM.days[0]!;
}

function runGame(opts: SimOptions): SimGameResult {
  const ids = opts.strategies.map((_, i) => i + 1);
  const map = generateMap(opts.seed, ids, opts.layout);
  let tiles: Tile[] = map.tiles.map((t, i) => ({
    id: i + 1,
    x: t.x,
    y: t.y,
    type: t.type,
    owner: t.owner,
    troops: t.troops,
    fortifiedUntil: null,
    castleOf: t.castleOf ?? null,
    ...(t.river ? { river: t.river } : {}),
  }));
  const objectives = dealObjectives(opts.seed, ids);
  const startCastle = (id: HouseId) => tiles.find((t) => t.castleOf === id)?.id ?? null;
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
      hand: [],
      auctionsWon: 0,
      spies: [],
      truces: [],
      drums: [],
      siegeNights: 0,
      glory: 0,
      captain: { house: id, tile: startCastle(id), capturedBy: null, freeAt: null },
      recruitedHouse: { mesnada: 0, jinetes: 0, catapultas: 0 },
      captainNights: { castillo: 0, frente: 0, retaguardia: 0, preso: 0 },
      captainAttacks: 0,
      crownWeek: { buy: zeroRes(), sell: zeroRes() },
      mercs: [],
      mercsWeek: 0,
    };
  });
  const byId = new Map(houses.map((h) => [h.id, h]));
  const trades: { a: HouseId; b: HouseId; day: number; valid: boolean }[] = [];
  const absent = houses.filter((h) => h.strategy === "ausente").map((h) => h.id);
  const neutralTotal = tiles.filter((t) => t.owner == null && t.type !== "lago").length;
  const totalResolutions = opts.weeks * RHYTHM.days.length;
  let resolution = 0;
  let combatsVsNeutral = 0;
  let combatsVsHouse = 0;
  let conquestsFromHouses = 0;
  let bounces = 0;
  let attacks = 0;
  let attacksWon = 0;
  let supports = 0;
  let roadMoves = 0;
  let siegeOrders = 0;
  let captainsCaptured = 0;
  let siegeNightsTotal = 0;
  let castleSiegeNights = 0;
  const recruited = { mesnada: 0, jinetes: 0, catapultas: 0 };
  let seaMoves = 0;
  let auctionGold = 0;
  let cardsPlayed = 0;
  let rankWeek2: Map<HouseId, number> | null = null;
  let firstHouseCombat: number | null = null;
  let firstHouseCombatDay: number | null = null;
  const economy = { crownBought: zeroRes(), crownSold: zeroRes(), crownGoldPaid: 0, crownGoldReceived: 0, mercsHired: 0, mercsGold: 0, mercsDeserted: 0, crownPrice: zeroRes() };
  /** Compras (+) y ventas (-) a la Corona: [día, recurso, unidades]. */
  const crownLog: [number, Resource, number][] = [];
  /** Quita `n` tropas de una casa (mercenarios que se van): primero del castillo, luego de las casillas con más. */
  const dismiss = (h: HouseState, n: number) => {
    const own = tiles.filter((t) => t.owner === h.id).sort((a, b) => Number(b.castleOf === h.id) - Number(a.castleOf === h.id) || b.troops - a.troops);
    const cut = new Map<number, number>();
    for (const t of own) {
      if (n <= 0) break;
      const k = Math.min(t.troops, n);
      cut.set(t.id, k);
      n -= k;
    }
    tiles = tiles.map((t) => (cut.has(t.id) ? clampUnits({ ...t, troops: t.troops - cut.get(t.id)! }) : t));
  };
  const mercCount = (h: HouseState) => h.mercs.reduce((a, m) => a + m.n, 0);
  const battle = { clashes: 0, crossings: 0, chargeAttacks: 0, riderAttacks: 0, fortifies: 0, fortifiedNights: 0, attacksOnFortified: 0, attacksOnFortifiedWon: 0, riverAttacks: 0, riverAttacksWon: 0, ruinsClaimed: 0, ruinsWeekOne: 0, ruinsDays: 0, villageRecruits: 0, villagesStolen: 0, fortifyUpkeep: 0, fortifyDropped: 0 };
  /** Combates entre casas: [casa, rival, resolución]. */
  const fights: [HouseId, HouseId, number][] = [];

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
      siegeNights: h.siegeNights,
      glory: h.glory,
    });
  };

  // Un evento por semana (o ninguno si se simula sin eventos).
  const weekEvents: WeekEvent[] =
    opts.events === false ? [] : Array.from({ length: opts.weeks }, (_, w) => eventOfWeek(opts.seed, w + 1));
  const productionMods = (day: number) => {
    const w = productionEventWeek(day);
    const ev = w != null ? weekEvents[w - 1] : undefined;
    return ev && w != null ? eventProduction(ev, w, day) : null;
  };

  const totalDays = opts.weeks * 7;
  /** Lo que ve una casa con personalidad (sus casillas y vecinas, Prestigio público). */
  const viewOf = (h: HouseState, day: number, ranking: { house: HouseId; total: number }[]): AiView => ({
    house: h.id,
    tiles,
    buildings: h.levels,
    resources: { ...h.res },
    nextResolution: resolution + 1,
    captainTile: h.captain.tile,
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
    spied: h.spies.filter((x) => x.until > resolution).map((x) => x.house),
    attackBonus: h.drums.find((d) => d.resolution === resolution + 1)?.bonus ?? 0,
    auctionsWon: h.auctionsWon,
    // Lo anunciado el martes: combate del miércoles y mantenimiento del domingo.
    combat: nextResolutionWeekday(day) === 2 && day % 7 >= 1 && day % 7 <= 2 && weekEvents[Math.floor(day / 7)] ? eventCombat(weekEvents[Math.floor(day / 7)]!) : undefined,
    upkeepFactor: day % 7 >= 1 && weekEvents[Math.floor(day / 7)] ? eventUpkeepFactor(weekEvents[Math.floor(day / 7)]!) : 1,
  });

  /** Usa una carta de la mano (si es válida) y aplica su efecto. */
  const playCard = (h: HouseState, card: CardKey, params: CardParams) => {
    const i = h.hand.indexOf(card);
    if (i < 0) return;
    const check = checkCard(card, params, {
      house: h.id,
      tiles,
      buildings: h.levels,
      resources: h.res,
      houses: houses.map((o) => o.id),
      nextResolution: resolution + 1,
    });
    if (!check.ok) return;
    const e = check.effect;
    h.hand.splice(i, 1);
    cardsPlayed++;
    for (const [r, v] of Object.entries(e.resources ?? {}) as [Resource, number][]) h.res[r] += v;
    if (e.castleTroops) tiles = tiles.map((t) => (t.castleOf === h.id ? { ...t, troops: t.troops + e.castleTroops! } : t));
    if (e.fortify) tiles = tiles.map((t) => (t.id === e.fortify!.tile ? { ...t, fortifiedUntil: e.fortify!.until } : t));
    if (e.upgrade) {
      h.levels[e.upgrade]++;
      if (h.levels[e.upgrade] === 5 && !houses.some((o) => o.achievements.obra_maestra)) h.achievements.obra_maestra = 1;
    }
    if (e.spy) h.spies.push(e.spy);
    if (e.truce) h.truces.push(e.truce);
    if (e.drums) h.drums.push(e.drums);
  };
  const ranking = (day: number) => houses.map((h) => ({ house: h.id, total: prestigeOf(h, day).total }));

  for (let day = 0; day < totalDays; day++) {
    // 1. Producción (y ayuda al último si está activa).
    for (const h of houses) {
      const helpActive = h.helpUntil != null && h.helpUntil > resolution;
      const help = helpActive ? (isSmart(h.strategy) ? (h.helpChoice ?? "pan") : helpResource(h.res)) : null;
      const p = dailyProduction(h.levels, tiles.filter((t) => t.owner === h.id), help, productionMods(day));
      for (const r of RESOURCES) h.res[r] += p[r];
    }

    // 1b. Bloque 5: los mercenarios de alquiler que cumplen se van; los muertos en
    // combate dejan de contar; cada lunes se renuevan los topes de la semana.
    for (const h of houses) {
      if (day % 7 === 0) {
        h.crownWeek = { buy: zeroRes(), sell: zeroRes() };
        h.mercsWeek = 0;
      }
      const gone = h.mercs.filter((m) => m.until <= day).reduce((a, m) => a + m.n, 0);
      h.mercs = h.mercs.filter((m) => m.until > day);
      if (gone > 0) dismiss(h, gone);
      const alive = tiles.filter((t) => t.owner === h.id).reduce((a, t) => a + t.troops, 0);
      let extra = mercCount(h) - alive;
      for (const m of h.mercs) {
        if (extra <= 0) break;
        const k = Math.min(m.n, extra);
        m.n -= k;
        extra -= k;
      }
      h.mercs = h.mercs.filter((m) => m.n > 0);
    }

    // 1c. Bloque 5: cambio con la Corona, antes de gastar.
    if (ECONOMY_TWEAKS.crown) {
      const pre = ranking(day);
      {
        const realm = zeroRes();
        for (const o of houses) for (const r of RESOURCES) realm[r] += o.res[r];
        const net = zeroRes();
        for (const [d, r, n] of crownLog) if (day - d < 7) net[r] += n;
        const prices = crownPrices(realm, net);
        for (const r of RESOURCES) economy.crownPrice[r] += prices.sell[r] / totalDays;
      }
      for (const h of houses) {
        if (!isSmart(h.strategy)) continue;
        const realm = zeroRes();
        for (const o of houses) for (const r of RESOURCES) realm[r] += o.res[r];
        const net = zeroRes();
        for (const [d, r, n] of crownLog) if (day - d < 7) net[r] += n;
        const prices = crownPrices(realm, net);
        const room = { buy: zeroRes(), sell: zeroRes() };
        for (const r of RESOURCES) {
          room.buy[r] = CROWN.weeklyCap - h.crownWeek.buy[r];
          room.sell[r] = CROWN.weeklyCap - h.crownWeek.sell[r];
        }
        const plan = planCrown(situation(viewOf(h, day, pre), PERSONALITIES[h.strategy]), prices, room);
        if (h.res.oro - plan.gold < 0) continue;
        h.res.oro -= plan.gold;
        if (plan.gold > 0) economy.crownGoldPaid += plan.gold;
        else economy.crownGoldReceived -= plan.gold;
        for (const r of RESOURCES) {
          const n = plan.units[r];
          if (!n) continue;
          h.res[r] += n;
          crownLog.push([day, r, n]);
          if (n > 0) {
            h.crownWeek.buy[r] += n;
            economy.crownBought[r] += n;
          } else {
            h.crownWeek.sell[r] -= n;
            economy.crownSold[r] -= n;
          }
        }
      }
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
        battle.fortifies += plan.fortify.length;
        h.recruitedHouse.mesnada += plan.recruit;
        h.recruitedHouse.jinetes += plan.riders;
        h.recruitedHouse.catapultas += plan.engines;
        // Fase 3 del bloque 1: se recluta en una aldea del frente si la hay.
        const site = recruitSite(tiles, h.id)?.id;
        if (site != null && tiles.find((t) => t.id === site)?.type === "aldea") battle.villageRecruits += plan.recruit + plan.riders + plan.engines;
        if (plan.recruit > 0) tiles = tiles.map((t) => (t.id === site ? { ...t, troops: t.troops + plan.recruit } : t));
        if (plan.riders > 0) tiles = tiles.map((t) => (t.id === site ? addRecruits(t, plan.riders, "jinetes") : t));
        if (plan.engines > 0) tiles = tiles.map((t) => (t.id === site ? addRecruits(t, plan.engines, "catapultas") : t));
        recruited.jinetes += plan.riders;
        recruited.catapultas += plan.engines;
        recruited.mesnada += plan.recruit;
        h.helpChoice = plan.help;
        // Bloque 5: mercenarios con Oro para lo que no llega a reclutar.
        const mode = ECONOMY_TWEAKS.mercenaries;
        if (mode) {
          const hire = planMercenaries(situation(viewOf(h, day, morning), PERSONALITIES[h.strategy]), mode, plan.recruit + plan.riders, MERCENARIES.weeklyCap - h.mercsWeek);
          if (hire > 0) {
            const gold = hire * (mode === "alquiler" ? MERCENARIES.hire : MERCENARIES.signOn);
            h.res.oro -= gold;
            economy.mercsGold += gold;
            economy.mercsHired += hire;
            h.mercsWeek += hire;
            h.mercs.push({ n: hire, until: mode === "alquiler" ? day + MERCENARIES.days : Infinity });
            tiles = tiles.map((t) => (t.castleOf === h.id ? { ...t, troops: t.troops + hire } : t));
          }
        }
        // Cartas de efecto inmediato (Tregua y Tambores esperan al día de la resolución).
        const cards = planCards(situation(viewOf(h, day, morning), PERSONALITIES[h.strategy]), h.hand, false);
        for (const c of cards) playCard(h, c.card, c.params);
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

    // 4. Resolución los días de RHYTHM (miércoles y domingo, o cada día).
    // La subasta va el miércoles y el mantenimiento el domingo.
    const weekday = day % 7;
    const week0 = Math.floor(day / 7) + 1;
    if (!RHYTHM.days.includes(weekday)) continue;

    // 4a. Miércoles: Gran Subasta (antes de la campaña). Solo pujan las personalidades.
    if (weekday === 2) {
      const week = Math.floor(day / 7) + 1;
      const ev = weekEvents[week - 1];
      const lots = auctionLots(opts.seed, week).map((l) => (ev && eventDoublesAuction(ev) ? doubleLot(l) : l));
      const bids: Bid[] = [];
      const pre = ranking(day);
      for (const h of houses) {
        if (!isSmart(h.strategy)) continue;
        for (const b of planBids(situation(viewOf(h, day, pre), PERSONALITIES[h.strategy]), lots)) {
          bids.push({ slot: b.slot, house: h.id, amount: b.amount, placedAt: `${String(day).padStart(3, "0")}:${h.id}` });
        }
      }
      const results = resolveAuction(lots, bids, new Map(houses.map((h) => [h.id, h.res.oro])));
      for (const r of results) {
        if (r.winner == null) continue;
        const h = byId.get(r.winner)!;
        const lot = lots.find((l) => l.slot === r.slot)!;
        h.res.oro -= r.price;
        auctionGold += r.price;
        h.auctionsWon++;
        h.achievements.ganador_subasta = Math.min(PRESTIGE.auctionAchievementMax, (h.achievements.ganador_subasta ?? 0) + 1);
        if (lot.kind === "card") for (let k = 0; k < (lot.count ?? 1); k++) h.hand.push(lot.card);
        else for (const [res, v] of Object.entries(lot.resources) as [Resource, number][]) h.res[res] += v;
      }
    }

    resolution++;
    const orders: Order[] = [];
    const evening = ranking(day);
    for (const h of houses) {
      if (isSmart(h.strategy)) {
        // Antes de dar órdenes: Tregua y Tambores (la resolución que viene es `resolution`).
        resolution--;
        const cards = planCards(situation(viewOf(h, day, evening), PERSONALITIES[h.strategy]), h.hand, true);
        for (const c of cards) playCard(h, c.card, c.params);
        const plan = planOrders(situation(viewOf(h, day, evening), PERSONALITIES[h.strategy]));
        resolution++;
        orders.push(...plan);
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
    // Bloque 4: cruces de marchas, cargas y Capitán.
    {
      const moves = orders.filter((o) => o.kind === "move") as Extract<Order, { kind: "move" }>[];
      const paths = moves.map((o) => marchPath(before.get(o.from)!, before.get(o.to)!, tiles, o.house, orderUnits(o)).map((t) => t.id));
      for (let i = 0; i < moves.length; i++) {
        for (let j = i + 1; j < moves.length; j++) {
          if (moves[i]!.house === moves[j]!.house) continue;
          const a = paths[i]!;
          const b = paths[j]!;
          if (a.length < 3 && b.length < 3) continue;
          let cross = false;
          for (let x = 0; x + 1 < a.length; x++) for (let y = 0; y + 1 < b.length; y++) if (a[x] === b[y + 1] && a[x + 1] === b[y]) cross = true;
          if (cross) battle.crossings++;
        }
      }
      for (const o of moves) {
        const to = before.get(o.to)!;
        if (to.owner === o.house) continue;
        if (o.captain) byId.get(o.house)!.captainAttacks++;
        if ((o.jinetes ?? 0) > 0) {
          battle.riderAttacks++;
          if (isPlain(to.type) && !(to.type === "fortaleza" || (to.fortifiedUntil != null && to.fortifiedUntil >= resolution))) battle.chargeAttacks++;
        }
      }
      battle.fortifiedNights += tiles.filter((t) => t.fortifiedUntil != null && t.fortifiedUntil >= resolution).length;
      for (const h of houses) {
        const c = h.captain;
        if (c.tile == null) h.captainNights.preso++;
        else {
          const t = before.get(c.tile);
          if (!t || t.castleOf === h.id) h.captainNights.castillo++;
          else if (tiles.some((o) => o.owner !== h.id && o.type !== "castillo" && areAdjacent(o, t))) h.captainNights.frente++;
          else h.captainNights.retaguardia++;
        }
      }
    }
    for (const o of orders) {
      if (o.kind === "support") supports++;
      else if (o.kind === "siege") siegeOrders++;
      else {
        if (before.get(o.to)?.owner !== o.house) attacks++;
        const how = marchKind(before.get(o.from)!, before.get(o.to)!, tiles, o.house);
        if (how === "camino") roadMoves++;
        if (how === "mar") seaMoves++;
      }
    }
    // Como el servidor: cada orden se ajusta a las tropas que haya al salir (órdenes en cola).
    const result = resolveCampaign({
      resolution,
      tiles,
      orders: fitOrders(tiles, orders),
      captains: CAPTAIN.enabled ? houses.map((h) => h.captain) : [],
      absentHouses: absent,
      truceTiles: houses.flatMap((h) => h.truces.filter((t) => t.resolution === resolution).map((t) => t.tile)),
      attackBonus: Object.fromEntries(
        houses.flatMap((h) => h.drums.filter((d) => d.resolution === resolution).map((d) => [h.id, d.bonus] as const)),
      ),
      ...(weekday === 2 && weekEvents[week0 - 1] ? eventCombat(weekEvents[week0 - 1]!) : {}),
    });
    tiles = result.tiles;
    // Ruinas: la primera casa que entra se lleva el premio y quedan como Prado.
    const ruins = claimRuins(tiles, opts.seed);
    tiles = ruins.tiles;
    for (const c of ruins.claims) {
      const h = byId.get(c.house)!;
      if (c.prize.kind === "carta") h.hand.push(c.prize.card);
      else h.res[c.prize.resource] += c.prize.amount;
      battle.ruinsClaimed++;
      if (day < 7) battle.ruinsWeekOne++;
      battle.ruinsDays += day + 1;
    }
    for (const e of result.events) {
      if (e.type === "combate" && e.conquered && e.previousOwner != null && before.get(e.tile)?.type === "aldea") battle.villagesStolen++;
    }
    for (const c of result.captains) byId.get(c.house)!.captain = c;
    for (const [hid, g] of gloryFromEvents(result.events)) byId.get(hid)!.glory += g;
    for (const e of result.events) if (e.type === "capitan_preso") captainsCaptured++;
    // Miércoles: efectos al momento del evento de la semana (repartos, bandidos).
    if (weekday === 2 && weekEvents[week0 - 1]) {
      const outcome = applyEventNow(
        weekEvents[week0 - 1]!,
        tiles,
        houses.map((h) => ({
          house: h.id,
          resources: { ...h.res },
          prestige: prestigeOf(h, day).total,
          validTradesWeek: trades.filter((t) => t.valid && day - t.day < 7 && (t.a === h.id || t.b === h.id)).length,
        })),
        resolution,
      );
      tiles = outcome.tiles;
      for (const [hid, delta] of outcome.resources) {
        for (const [r, v] of Object.entries(delta) as [Resource, number][]) byId.get(hid)!.res[r] += v;
      }
      for (const [hid, n] of outcome.castleTroops) tiles = tiles.map((t) => (t.castleOf === hid ? { ...t, troops: t.troops + n } : t));
    }
    for (const e of result.events) {
      if (e.type === "asedio") {
        siegeNightsTotal++;
        if (e.castle) {
          castleSiegeNights++;
          byId.get(e.house)!.siegeNights++;
        }
      }
      if (e.type === "rebote") bounces++;
      if (e.type === "choque_frontal") {
        battle.clashes++;
        const [a, b] = e.sides;
        if (a && b && a.house != null && b.house != null) fights.push([a.house, b.house, resolution], [b.house, a.house, resolution]);
      }
      if (e.type !== "combate") continue;
      {
        const prev = before.get(e.tile);
        if (prev && prev.owner != null && prev.fortifiedUntil != null && prev.fortifiedUntil >= resolution) {
          battle.attacksOnFortified++;
          if (e.conquered) battle.attacksOnFortifiedWon++;
        }
        for (const side of e.sides.filter((x) => x.role === "ataque" && x.river)) {
          battle.riverAttacks++;
          if (e.conquered && e.winner === side.house) battle.riverAttacksWon++;
        }
        const hs = [...new Set(e.sides.map((x) => x.house).filter((x): x is HouseId => x != null))];
        for (const a of hs) for (const b of hs) if (a !== b) fights.push([a, b, resolution]);
      }
      if (e.previousOwner == null) combatsVsNeutral++;
      else {
        combatsVsHouse++;
        firstHouseCombat ??= resolution;
        firstHouseCombatDay ??= day + 1;
      }
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
        const ev = weekEvents[week0 - 1];
        // Los mercenarios no comen: la Corona pone su Pan (bloque 5).
        const mercPan = Math.floor(mercCount(h) / TROOPS_PER_PAN);
        const upkeep = applyUpkeep(tiles, h.id, h.res.pan + mercPan, ev ? eventUpkeepFactor(ev) : 1);
        tiles = upkeep.tiles;
        h.res.pan -= Math.max(0, upkeep.paid - mercPan);
        // Soldada: se paga en Oro; los que no cobran se van.
        if (ECONOMY_TWEAKS.mercenaries === "soldada") {
          const count = mercCount(h);
          const paid = Math.min(count, Math.floor(h.res.oro / MERCENARIES.wage));
          h.res.oro -= paid * MERCENARIES.wage;
          economy.mercsGold += paid * MERCENARIES.wage;
          if (paid < count) {
            economy.mercsDeserted += count - paid;
            dismiss(h, count - paid);
            h.mercs = paid > 0 ? [{ n: paid, until: Infinity }] : [];
          }
        }
        h.deserted += upkeep.deserted;
        // Mantenimiento de las fortificaciones: los bots conservan las que lindan con otra casa.
        const fort = applyFortifyUpkeep(tiles, h.id, h.res, resolution + 1, (t) =>
          tiles.some((o) => o.owner != null && o.owner !== h.id && areAdjacent(o, t)),
        );
        tiles = fort.tiles;
        for (const r of RESOURCES) h.res[r] -= fort.cost[r];
        battle.fortifyUpkeep += fort.cost.piedra + fort.cost.oro;
        battle.fortifyDropped += fort.dropped;
      }
      const totals = houses.map((h) => ({ house: h.id, total: prestigeOf(h, day).total }));
      totals.forEach((t) => byId.get(t.house)!.prestigeBySunday.push(t.total));
      if (day === 13) rankWeek2 = ranks(totals);
      for (const h of houses) h.helpUntil = null;
      const last = lastPlace(totals);
      if (last != null && resolution < totalResolutions) {
        byId.get(last)!.helpUntil = resolution + RHYTHM.days.length;
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
      auctionsWon: h.auctionsWon,
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
    firstHouseCombat,
    firstHouseCombatDay,
    neutralLeft: tiles.filter((t) => t.owner == null && t.type !== "lago").length,
    combatsVsNeutral,
    combatsVsHouse,
    conquestsFromHouses,
    bounces,
    attacks,
    attacksWon,
    supports,
    recruited,
    captainsCaptured,
    siegeOrders,
    siegeNights: siegeNightsTotal,
    castleSiegeNights,
    roadMoves,
    seaMoves,
    trades: trades.length,
    auctionGold,
    events: weekEvents.map((e) => e.key),
    cardsPlayed,
    finalTiles: tiles,
    battle,
    economy,
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
      auctionsWon: f.h.auctionsWon,
      partners: f.partners,
      helpWeeks: f.h.helpWeeks,
      rankWeek2: rankWeek2?.get(f.h.id) ?? null,
      prestigeBySunday: f.h.prestigeBySunday,
      recruitedHouse: f.h.recruitedHouse,
      captainNights: f.h.captainNights,
      captainAttacks: f.h.captainAttacks,
      war: warStats(f.h.id, fights),
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

function warStats(house: HouseId, fights: [HouseId, HouseId, number][]): SimHouseResult["war"] {
  const mine = fights.filter((f) => f[0] === house);
  const byEnemy = new Map<HouseId, number[]>();
  for (const [, b, r] of mine) byEnemy.set(b, [...(byEnemy.get(b) ?? []), r]);
  const top = [...byEnemy.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0])[0];
  const nights = [...new Set(mine.map((f) => f[2]))];
  const twoFront = nights.filter((r) => new Set(mine.filter((f) => Math.abs(f[2] - r) <= 1).map((f) => f[1])).size >= 2).length;
  return {
    enemies: byEnemy.size,
    combats: mine.length,
    topEnemyCombats: top ? top[1].length : 0,
    topEnemySpan: top ? Math.max(...top[1]) - Math.min(...top[1]) + 1 : 0,
    twoFrontNights: twoFront,
  };
}

function zeroRes(): Resources {
  return { pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 0 };
}
