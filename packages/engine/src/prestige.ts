import { GLORY, PRESTIGE, SIEGE } from "./rules";
import type { BuildingKind, HouseId, Tile, TileType } from "./types";

export type AchievementKey = keyof typeof PRESTIGE.achievement;

export interface PrestigeInput {
  house: HouseId;
  tiles: Pick<Tile, "type" | "owner">[];
  buildings: Record<BuildingKind, number>;
  gold: number;
  /** Casas distintas con las que hubo un trato válido en los últimos 7 días. */
  tradePartners: number;
  /** Logros conseguidos y cuántas veces (la subasta puede repetirse). */
  achievements: Partial<Record<AchievementKey, number>>;
  /** Solo al final de la partida: si se cumplió el objetivo secreto. */
  secretObjectiveMet?: boolean;
  /** Noches que esta casa ha tenido rodeado el castillo de otra (diseño v3). */
  siegeNights?: number;
  /** Puntos de Gloria: batallas ganadas a otras casas y derrotas con honor (diseño v3). */
  glory?: number;
}

export interface PrestigeBreakdown {
  territorio: number;
  edificios: number;
  riqueza: number;
  comercio: number;
  logros: number;
  /** Noches de asedio a castillos ajenos. */
  asedios: number;
  /** Batallas ganadas a otras casas (y derrotas con honor). */
  gloria: number;
  objetivo: number;
  total: number;
}

/** Prestigio de territorio de una casilla. */
export function tilePrestige(type: TileType): number {
  if (type === "lago") return 0;
  if (type === "fortaleza") return PRESTIGE.perFortress;
  if (type === "aldea") return PRESTIGE.perVillage;
  if (type === "paramo" || type === "prado" || type === "ruinas") return PRESTIGE.perWasteland;
  return PRESTIGE.perTile;
}

/** Prestigio en vivo: refleja el estado actual, no se acumula semana a semana. */
export function computePrestige(input: PrestigeInput): PrestigeBreakdown {
  const own = input.tiles.filter((t) => t.owner === input.house && t.type !== "castillo");
  const territorio = sumBy(own, (t) => tilePrestige(t.type));

  const levels = Object.values(input.buildings);
  const edificios =
    sumBy(levels, (l) => (l - 1) * PRESTIGE.perLevelAboveOne) +
    levels.filter((l) => l === 5).length * PRESTIGE.perLevelFiveBuilding;

  const riqueza = Math.min(PRESTIGE.goldMax, Math.floor(input.gold / PRESTIGE.goldPerPoint));
  const comercio = Math.min(PRESTIGE.tradeMax, input.tradePartners * PRESTIGE.perTradePartner);

  let logros = 0;
  for (const [key, times] of Object.entries(input.achievements) as [AchievementKey, number][]) {
    const capped = key === "ganador_subasta" ? Math.min(times, PRESTIGE.auctionAchievementMax) : Math.min(times, 1);
    logros += capped * PRESTIGE.achievement[key];
  }

  const asedios = Math.min(SIEGE.prestigeMax, (input.siegeNights ?? 0) * SIEGE.prestigePerNight);
  const gloria = GLORY.enabled ? Math.min(GLORY.max, input.glory ?? 0) : 0;
  const objetivo = input.secretObjectiveMet ? PRESTIGE.secretObjective : 0;
  return {
    territorio,
    edificios,
    riqueza,
    comercio,
    logros,
    asedios,
    gloria,
    objetivo,
    total: territorio + edificios + riqueza + comercio + logros + asedios + gloria + objetivo,
  };
}

/** Un trato cuenta para el Prestigio si cada lado entrega al menos 10 recursos. */
export function isValidTrade(amountA: number, amountB: number): boolean {
  return amountA >= PRESTIGE.tradeMinPerSide && amountB >= PRESTIGE.tradeMinPerSide;
}

function sumBy<T>(xs: T[], f: (x: T) => number): number {
  return xs.reduce((acc, x) => acc + f(x), 0);
}
