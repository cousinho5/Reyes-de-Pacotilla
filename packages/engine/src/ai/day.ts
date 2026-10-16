// Acciones del día de un bot: fortificar lo amenazado, y repartir el resto
// entre mejoras y reclutamiento según lo que rinde cada cosa.

import { checkFortify, recruitCost } from "../actions";
import { defenseMultiplier } from "../combat";
import { canAfford, upgradeCost, weeklyUpkeep } from "../economy";
import { BUILDING_PRODUCTION, BUILDING_RESOURCE, OBJECTIVE_TARGETS, PRESTIGE } from "../rules";
import { BUILDINGS, RESOURCES, type BuildingKind, type Resource, type Resources, type TileId } from "../types";
import { militaryNeed } from "./orders";
import { PRESTIGE_UNIT, valueOf, type Situation } from "./view";

export interface DayPlan {
  /** Mejoras en orden (puede haber varias el mismo día). */
  upgrades: BuildingKind[];
  recruit: number;
  fortify: { tile: TileId; until: number }[];
  /** Coste total de todo lo anterior. */
  cost: Resources;
  /** Recurso que pediría como ayuda al último. */
  help: Resource;
}

const MAX_ACTIONS = 12;
const RECRUIT_CHUNK = 5;

export function planDay(s: Situation): DayPlan {
  const { view, p, own } = s;
  const res = { ...view.resources };
  const levels = { ...view.buildings };
  const plan: DayPlan = { upgrades: [], recruit: 0, fortify: [], cost: { pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 0 }, help: "pan" };
  const spend = (cost: Partial<Resources>) => {
    for (const [r, v] of Object.entries(cost) as [Resource, number][]) {
      res[r] -= v;
      plan.cost[r] += v;
    }
  };

  // Pan que hay que guardar para el mantenimiento del domingo.
  const troops = own.reduce((a, t) => a + t.troops, 0);
  const controlled = own.filter((t) => t.type !== "castillo").length;
  const daysToSunday = 6 - (view.day % 7);
  const reservePan = (extra: number) =>
    Math.max(s.panReserve, Math.ceil((weeklyUpkeep(troops + extra, controlled) - s.income.pan * daysToSunday) * 1.2));

  // 1. Fortificar casillas amenazadas a las que la fortificación salva.
  for (const t of own) {
    if (t.type === "castillo") continue;
    const danger = s.threat.get(t.id) ?? 0;
    const now = t.troops * defenseMultiplier(t, view.nextResolution, false);
    const fortified = t.troops * defenseMultiplier({ ...t, fortifiedUntil: view.nextResolution }, view.nextResolution, false);
    if (danger <= now || fortified < danger * 0.9) continue;
    const check = checkFortify(t, view.house, view.nextResolution, res);
    if (!check.ok) continue;
    plan.fortify.push({ tile: t.id, until: check.value.fortifiedUntil });
    spend(check.value.cost);
  }

  // 2. Mejoras y tropas, eligiendo cada vez lo que más rinde.
  const need = militaryNeed(s);
  const urgent = [...s.threat.values()].some((x) => x > 0);
  const focus = s.focus;
  // Si ahorra para una mejora, no gasta en otra cosa los recursos que le faltan para ella
  // (salvo para defenderse de una amenaza).
  const blocked = (cost: Partial<Resources>, isGoal: boolean) => {
    if (!s.savingFor || isGoal) return false;
    return (Object.entries(cost) as [Resource, number][]).some(
      ([r, v]) => v > 0 && (s.savingFor![r] ?? 0) > 0 && res[r] - v < (s.savingFor![r] ?? 0),
    );
  };
  for (let i = 0; i < MAX_ACTIONS; i++) {
    let best: { score: number; apply: () => void } | null = null;

    for (const b of BUILDINGS) {
      const cost = upgradeCost(levels[b]);
      if (!cost || !canAfford(res, cost) || blocked(cost, b === focus)) continue;
      const level = levels[b];
      const gain = (BUILDING_PRODUCTION[level + 1]! - BUILDING_PRODUCTION[level]!) * s.daysLeft * s.values[BUILDING_RESOURCE[b]] * 0.6;
      let prestige = PRESTIGE.perLevelAboveOne + (level + 1 === 5 ? PRESTIGE.perLevelFiveBuilding : 0);
      prestige += objectiveProgress(s, levels, b, focus);
      let score = (gain + prestige * PRESTIGE_UNIT) / valueOf(s.values, cost);
      if (b === focus) score *= 1 + p.specialize;
      score *= 1.5 - p.military / 2;
      if (!best || score > best.score) {
        best = {
          score,
          apply: () => {
            spend(cost);
            levels[b]++;
            plan.upgrades.push(b);
          },
        };
      }
    }

    const missing = need - plan.recruit;
    if (missing > 0) {
      let n = Math.min(missing, RECRUIT_CHUNK);
      while (n > 0 && (!canAfford(res, recruitCost(n)) || res.pan - (recruitCost(n).pan ?? 0) < reservePan(plan.recruit + n))) n--;
      if (n > 0 && (urgent || !blocked(recruitCost(n), false))) {
        const score = p.military * (urgent ? 2.2 : 1.3);
        if (!best || score > best.score) {
          best = {
            score,
            apply: () => {
              spend(recruitCost(n));
              plan.recruit += n;
            },
          };
        }
      }
    }

    // En la última semana cualquier mejora compensa: los recursos guardados no puntúan.
    const threshold = s.daysLeft <= 7 ? 0 : 0.6;
    if (!best || best.score < threshold) break;
    best.apply();
  }

  // 3. Si fuera el último, pediría lo que más valora.
  plan.help = [...RESOURCES].sort((a, b) => s.values[b] - s.values[a])[0]!;
  return plan;
}

/** Prestigio extra (en puntos) por acercarse a un objetivo secreto de edificios. */
function objectiveProgress(s: Situation, levels: Record<BuildingKind, number>, b: BuildingKind, focus: BuildingKind): number {
  const objective = PRESTIGE.secretObjective;
  if (s.view.objective === "obra_maestra" && b === focus) return objective / Math.max(1, 5 - levels[b]);
  if (s.view.objective === "niveles_17") {
    const missing = OBJECTIVE_TARGETS.totalLevels - BUILDINGS.reduce((a, k) => a + levels[k], 0);
    return missing > 0 ? objective / missing : 0;
  }
  return 0;
}
