// Lo que un bot sabe de la partida (lo mismo que vería una persona) y las
// estimaciones que comparten todas sus decisiones: amenazas y valor de cada recurso.

import { defenseMultiplier } from "../combat";
import { dailyProduction, upgradeCost, weeklyUpkeep } from "../economy";
import { ambushed, visibleTileIds } from "../fog";
import { upkeepTroops } from "../units";
import { areAdjacent } from "../map";
import type { ObjectiveKey } from "../objectives";
import { FORTIFY_COST, PRESTIGE, SPECIALTY_PAIRS, TROOP_COST, TROOPS_PER_PAN } from "../rules";
import { BUILDINGS, RESOURCES, type Alliance, type BuildingKind, type HouseId, type Resource, type Resources, type Tile } from "../types";
import { alliesOf, bound, guestStacks, inForce } from "../alliances";
import type { Personality } from "./personality";

/** Cuántos recursos "vale" un punto de Prestigio para un bot. */
export const PRESTIGE_UNIT = 15;

export interface AiView {
  house: HouseId;
  /** Todas las casillas; el bot solo mira las que ve (las suyas y las vecinas). */
  tiles: Tile[];
  buildings: Record<BuildingKind, number>;
  resources: Resources;
  /** Próxima resolución que se va a ejecutar. */
  nextResolution: number;
  /** Casilla donde está el Capitán de la casa (null si está preso o no hay Capitán). */
  captainTile?: number | null;
  /** Día de la partida (0 = primer lunes) y total de días. */
  day: number;
  totalDays: number;
  objective: ObjectiveKey | null;
  /** Prestigio público de cada casa. */
  prestige: { house: HouseId; total: number }[];
  /** Casas con las que hubo trato válido en los últimos 7 días. */
  recentPartners: HouseId[];
  /** Con quién cerró cada trato (válido o no) de los últimos 7 días: una entrada por trato. */
  tradesWith?: HouseId[];
  /** Ayuda al último activa (recurso), si la hay. */
  help?: Resource | null;
  /** Casas que vigila con la carta Espía. */
  spied?: HouseId[];
  /** Bonificación de ataque activa para la próxima resolución (Tambores de guerra). */
  attackBonus?: number;
  /** Lotes de la Gran Subasta ganados hasta ahora. */
  auctionsWon?: number;
  /** Evento que afecta al combate de la próxima resolución. */
  combat?: { defenseBonus?: number; attackBonusAll?: number; peace?: boolean };
  /** Factor del mantenimiento del próximo domingo (evento de la semana). */
  upkeepFactor?: number;
  /** Alianzas en vigor o en aviso (el registro es público, bloque 8). */
  alliances?: Alliance[];
  /** Casas que le han atacado en los últimos días (para no aliarse con ellas). */
  attackedBy?: HouseId[];
  /** Órdenes que ya han dado sus aliados para esta noche (lo que hablarían entre ellos). */
  allyOrders?: import("../types").Order[];
}

export interface Situation {
  view: AiView;
  p: Personality;
  /** Casillas que ve el bot. */
  seen: Tile[];
  own: Tile[];
  leader: HouseId | null;
  daysLeft: number;
  /** Tropas enemigas que teme en cada casilla propia (los castillos no se pueden atacar). */
  threat: Map<number, number>;
  /** Tropas que deben quedarse en cada casilla propia para aguantar la amenaza. */
  keep: Map<number, number>;
  income: Resources;
  values: Resources;
  /** Pan que no debe gastar ni vender: lo que costará el próximo domingo. */
  panReserve: number;
  /** Tropas que puede mantener con su Pan semanal. */
  sustainableTroops: number;
  /** Bloque 8: aliados en vigor y casas con las que no puede luchar (en vigor o en aviso). */
  allies: HouseId[];
  friendly: (house: HouseId | null) => boolean;
  /** Tropas propias de paso en casillas aliadas. */
  away: number;
  /** Edificio en el que se especializa y coste de su próxima mejora, si está ahorrando para ella. */
  focus: BuildingKind;
  savingFor: Partial<Resources> | null;
}

/** Edificio en el que se especializa: el de mayor nivel (en empate, el de su especialidad inicial). */
export function focusBuilding(levels: Record<BuildingKind, number>): BuildingKind {
  const order = SPECIALTY_PAIRS.flat();
  return [...BUILDINGS].sort((a, b) => levels[b] - levels[a] || order.indexOf(a) - order.indexOf(b))[0]!;
}

export function situation(view: AiView, p: Personality): Situation {
  const alliances = inForce(view.alliances);
  const allies = alliesOf(alliances, view.house);
  const friendly = (h: HouseId | null) => h === view.house || bound(alliances, view.house, h);
  // Los aliados en vigor comparten lo que ven (como la carta Espía).
  const spied = [...(view.spied ?? []), ...allies];
  const visible = visibleTileIds(view.tiles, view.house, spied);
  // En un bosque emboscado no se ven las tropas: el bot supone tantas como la
  // media de lo que esa casa tiene a la vista (y al menos 3), como haría una persona.
  const raw = view.tiles.filter((t) => visible.has(t.id));
  const guess = (house: number) => {
    const shown = raw.filter((t) => t.owner === house && t.type !== "castillo" && !ambushed(t, view.house, spied));
    return Math.max(3, Math.round(shown.reduce((a, t) => a + t.troops, 0) / Math.max(1, shown.length)));
  };
  const seen = raw.map((t) => (ambushed(t, view.house, spied) ? { ...t, troops: guess(t.owner!) } : t));
  const own = seen.filter((t) => t.owner === view.house);
  const sorted = [...view.prestige].sort((a, b) => b.total - a.total || a.house - b.house);
  // El líder al que tener manía (ninguno si el líder es uno mismo).
  const leader = sorted[0] && sorted[0].house !== view.house ? sorted[0].house : null;
  const threat = new Map<number, number>();
  const keep = new Map<number, number>();
  for (const t of own) {
    if (t.type === "castillo") {
      threat.set(t.id, 0);
      keep.set(t.id, 0);
      continue;
    }
    // Teme al grupo vecino más grande entero y a la mitad del resto (pueden apoyarlo).
    // Los aliados no pueden atacarle; las tropas de paso de otras casas, sí.
    const enemies = seen
      .filter((o) => areAdjacent(o, t))
      .flatMap((o) => [
        ...(o.owner != null && !friendly(o.owner) ? [o.troops] : []),
        ...(o.guests ?? []).filter((g) => !friendly(g.house)).map((g) => g.troops),
      ])
      .sort((a, b) => b - a);
    const danger = ((enemies[0] ?? 0) + enemies.slice(1).reduce((a, n) => a + n, 0) * 0.5) * p.caution;
    threat.set(t.id, danger);
    const mult = defenseMultiplier(t, view.nextResolution, false);
    keep.set(t.id, Math.min(t.troops, Math.ceil(danger / mult)));
  }
  const income = dailyProduction(view.buildings, own, view.help ?? null);
  // Las tropas de paso también comen (bloque 8).
  const awayStacks = guestStacks(view.tiles, view.house).map((x) => x.guest);
  const away = awayStacks.reduce((a, g) => a + g.troops, 0);
  const troops = own.reduce((a, t) => a + t.troops, 0) + away;
  const controlled = own.filter((t) => t.type !== "castillo").length;
  const daysToSunday = 6 - (view.day % 7);
  const upkeep = weeklyUpkeep(upkeepTroops(own) + upkeepTroops(awayStacks), controlled);
  const stretch = upkeep - weeklyUpkeep(troops, 0);
  const focus = focusBuilding(view.buildings);
  // Ahorra para la mejora de su especialidad si su objetivo secreto es la obra maestra.
  const saving = view.objective === "obra_maestra" && s_daysLeft(view) > 3;
  const s: Situation = {
    view,
    p,
    seen,
    own,
    leader,
    daysLeft: Math.max(0, view.totalDays - view.day),
    threat,
    keep,
    allies,
    friendly,
    away,
    income,
    values: { pan: 1, madera: 1, piedra: 1, hierro: 1, oro: 1 },
    panReserve: Math.max(0, Math.ceil((upkeep * (view.upkeepFactor ?? 1) - income.pan * daysToSunday) * 1.2)),
    sustainableTroops: Math.max(0, Math.floor((income.pan * 7 * 0.8 - stretch) * TROOPS_PER_PAN)),
    focus,
    savingFor: saving ? upgradeCost(view.buildings[focus]) : null,
  };
  s.values = resourceValues(s);
  return s;
}

/**
 * Valor de cada recurso para el bot: alto si lo va a necesitar y le falta,
 * bajo si le sobra. Mira el gasto de la próxima semana: mantenimiento,
 * tropas que quiere, mejoras que le interesan y fortificaciones.
 */
function resourceValues(s: Situation, have: Resources = s.view.resources): Resources {
  const { view, p, own } = s;
  const demand: Resources = { pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 0 };
  const troops = own.reduce((a, t) => a + t.troops, 0) + s.away;
  const controlled = own.filter((t) => t.type !== "castillo").length;
  demand.pan += weeklyUpkeep(troops, controlled);
  const wantTroops = Math.round(8 * p.military);
  for (const [r, v] of Object.entries(TROOP_COST) as [Resource, number][]) demand[r] += v * wantTroops;
  // Las dos mejoras más baratas que podría querer.
  const next = [...BUILDINGS].sort((a, b) => view.buildings[a] - view.buildings[b]).slice(0, 2);
  for (const b of next) {
    const cost = upgradeCost(view.buildings[b]);
    if (cost) for (const [r, v] of Object.entries(cost) as [Resource, number][]) demand[r] += v * (1 - 0.4 * p.military + 0.4);
  }
  // Lo que le falta para la mejora que está ahorrando pesa el doble.
  if (s.savingFor) {
    for (const [r, v] of Object.entries(s.savingFor) as [Resource, number][]) demand[r] += 2 * Math.max(0, v - have[r]);
  }
  if ([...s.threat.values()].some((x) => x > 0)) {
    for (const [r, v] of Object.entries(FORTIFY_COST) as [Resource, number][]) demand[r] += v;
  }
  const out = {} as Resources;
  // Al final de la partida los recursos guardados no valen nada (salvo el Oro, que da Riqueza).
  const ending = clamp(s.daysLeft / 7, 0.05, 1);
  for (const r of RESOURCES) {
    const supply = have[r] + s.income[r] * 4;
    out[r] = clamp((demand[r] + 5) / (supply + 5), 0.15, 3) * ending;
  }
  // El Oro también da Prestigio de Riqueza (hasta el tope).
  const goldCap = PRESTIGE.goldPerPoint * PRESTIGE.goldMax;
  if (have.oro < goldCap) out.oro = Math.max(out.oro, PRESTIGE_UNIT / PRESTIGE.goldPerPoint);
  return out;
}

/** Valor de cada recurso si tuviera `have` en vez de lo que tiene (para comprar y vender a la Corona). */
export function valuesWith(s: Situation, have: Resources): Resources {
  return resourceValues(s, have);
}

function s_daysLeft(view: AiView): number {
  return view.totalDays - view.day;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function valueOf(values: Resources, bundle: Partial<Resources>): number {
  let v = 0;
  for (const [r, n] of Object.entries(bundle) as [Resource, number][]) v += values[r] * n;
  return v;
}
