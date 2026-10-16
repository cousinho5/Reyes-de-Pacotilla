// Piloto automático (diseño, sección 13). Juega por una casa ausente una vez
// al día, tras la producción. Nunca ataca, nunca rompe pactos y nunca acepta
// tratos: solo construye, fortifica y recluta según la plantilla elegida.

import { checkFortify, checkUpgrade, recruitCost } from "./actions";
import { canAfford, upgradeCost, weeklyUpkeep } from "./economy";
import { areAdjacent } from "./map";
import { BUILDINGS, type BuildingKind, type HouseId, type Resources, type Tile, type TileId } from "./types";

export type AutopilotTemplate = "defensiva" | "economica" | "equilibrada";

export interface AutopilotPlan {
  upgrade: BuildingKind | null;
  fortify: { tile: TileId; until: number } | null;
  recruit: number;
  cost: Partial<Resources>;
}

export interface AutopilotInput {
  template: AutopilotTemplate;
  /** Número de día de la partida, para alternar en la plantilla equilibrada. */
  day: number;
  house: HouseId;
  tiles: Tile[];
  buildings: Record<BuildingKind, number>;
  resources: Resources;
  nextResolution: number;
}

const MAX_RECRUIT = 10;

export function planAutopilot(input: AutopilotInput): AutopilotPlan {
  const mode = input.template === "equilibrada" ? (input.day % 2 === 0 ? "economica" : "defensiva") : input.template;
  const plan: AutopilotPlan = { upgrade: null, fortify: null, recruit: 0, cost: {} };
  let left = { ...input.resources };
  const spend = (cost: Partial<Resources>) => {
    for (const [r, v] of Object.entries(cost) as [keyof Resources, number][]) {
      left[r] -= v;
      plan.cost[r] = (plan.cost[r] ?? 0) + v;
    }
  };

  if (mode === "economica") {
    // El edificio de menor nivel que se pueda pagar (en empate, por orden fijo).
    const candidates = [...BUILDINGS]
      .filter((b) => upgradeCost(input.buildings[b]) !== null)
      .sort((a, b) => input.buildings[a] - input.buildings[b]);
    for (const b of candidates) {
      const check = checkUpgrade(input.buildings, b, left);
      if (check.ok) {
        plan.upgrade = b;
        spend(check.value.cost);
        break;
      }
    }
    return plan;
  }

  // Defensiva: fortificar la casilla más amenazada y reclutar guardando Pan.
  const own = input.tiles.filter((t) => t.owner === input.house);
  const threat = (t: Tile) =>
    input.tiles
      .filter((o) => o.owner !== null && o.owner !== input.house && areAdjacent(o, t))
      .reduce((a, o) => a + o.troops, 0);
  const target = own
    .filter((t) => t.type !== "castillo" && threat(t) > 0)
    .sort((a, b) => threat(b) - threat(a) || a.id - b.id)[0];
  if (target) {
    const check = checkFortify(target, input.house, input.nextResolution, left);
    if (check.ok) {
      plan.fortify = { tile: target.id, until: check.value.fortifiedUntil };
      spend(check.value.cost);
    }
  }
  const troops = own.reduce((a, t) => a + t.troops, 0);
  const controlled = own.filter((t) => t.type !== "castillo").length;
  const reservePan = weeklyUpkeep(troops + MAX_RECRUIT, controlled);
  let n = Math.min(MAX_RECRUIT, Math.floor(left.hierro / 2), Math.max(0, left.pan - reservePan));
  while (n > 0 && !canAfford(left, recruitCost(n))) n--;
  if (n > 0) {
    plan.recruit = n;
    spend(recruitCost(n));
  }
  return plan;
}
