// Eventos de la semana (diseño, sección 10). Uno por semana, anunciado el
// martes y aplicado en la resolución del miércoles. Cada evento sale una sola
// vez por partida, en un orden fijado por la semilla.
//
// Según el tipo, actúan:
// - en la producción de los 7 días siguientes (jueves a miércoles), o solo el jueves;
// - en el combate de la resolución del miércoles;
// - al momento, en la resolución del miércoles (repartos, bandidos);
// - en el mantenimiento del domingo de esa semana;
// - en la Gran Subasta de ese miércoles.

import { lastPlace } from "./actions";
import { guestTroops } from "./alliances";
import { defenseMultiplier, survivors } from "./combat";
import type { ProductionModifiers } from "./economy";
import { distance } from "./map";
import { clampUnits } from "./units";
import { seededRandom, shuffle } from "./random";
import { EVENT_VALUES as V } from "./rules";
import { RESOURCES, type BuildingKind, type HouseId, type Resource, type Resources, type Tile, type TileId } from "./types";

const PCT = (f: number) => `${Math.round(Math.abs(f - 1) * 100)}%`;
const RESOURCE_NAME: Record<Resource, string> = { pan: "Pan", madera: "Madera", piedra: "Piedra", hierro: "Hierro", oro: "Oro" };

export const EVENTS = {
  plaga_ratas: { nombre: "La Gran Plaga de Ratas", texto: `-${PCT(V.plague)} de Pan para todos durante una semana.` },
  cosecha_gloriosa: { nombre: "Cosecha Gloriosa", texto: `+${PCT(V.harvest)} de {recurso} para todos durante una semana.` },
  fiebre_oro: { nombre: "La Fiebre del Oro", texto: "Los mercados producen el doble durante una semana." },
  tormenta_costa: { nombre: "Tormenta en la Costa", texto: "Los puertos no producen durante una semana." },
  derrumbe: { nombre: "El Gran Derrumbe", texto: "Canteras y montañas no producen durante una semana." },
  fiesta_san_aldric: { nombre: "La Fiesta de San Aldric", texto: "El jueves, toda la producción es doble." },
  caminos_embarrados: { nombre: "Caminos Embarrados", texto: `En la resolución del miércoles, +${V.mud * 100}% de defensa en todas las casillas.` },
  fervor_guerrero: { nombre: "Fervor Guerrero", texto: `En la resolución del miércoles, +${V.fervor * 100}% de fuerza en todos los ataques.` },
  paz_del_rey: { nombre: "La Paz del Rey", texto: "En la resolución del miércoles nadie puede atacar casillas de otras casas (las neutrales sí)." },
  bandidos: {
    nombre: "Los Bandidos del Camino",
    texto: `${V.bandits} bandidos atacan, tras la resolución del miércoles, la casilla más alejada del castillo de la casa con más casillas.`,
  },
  tributo_rey: {
    nombre: "El Tributo del Rey",
    texto: `Las dos casas con más Oro pagan el ${V.tributeShare * 100}% de su Oro, que se reparte entre las demás.`,
  },
  llaves_rey: {
    nombre: "El Rey Ha Perdido las Llaves",
    texto: `+${V.keysGold} de Oro a quien más tratos válidos haya cerrado en los últimos 7 días.`,
  },
  torneo_real: { nombre: "El Torneo Real", texto: `+${V.tournamentGold} de Oro a la casa con más tropas.` },
  levas_reales: { nombre: "Levas Reales", texto: `+${V.levies} tropas en el castillo de cada casa.` },
  carnaval: { nombre: "Carnaval", texto: `+${V.carnivalPan} de Pan para todas las casas.` },
  limosna_real: { nombre: "La Limosna Real", texto: `+${V.almsEach} de cada recurso para la casa con menos Prestigio.` },
  paga_atrasada: { nombre: "Paga Atrasada", texto: "El mantenimiento del domingo cuesta el doble." },
  indulgencia_real: { nombre: "Indulgencia Real", texto: "El mantenimiento del domingo es gratis." },
  mercado_enloquece: { nombre: "El Mercado Enloquece", texto: "Los lotes de la Gran Subasta de este miércoles son dobles." },
  semana_tranquila: { nombre: "Semana Tranquila", texto: "No pasa nada. Fray Abundio aprovecha para dormir." },
} as const;

/** Lo que dice Fray Abundio de cada evento ({jugador}: la casa afectada, si la hay). */
export const EVENT_LINES: Record<keyof typeof EVENTS, string[]> = {
  plaga_ratas: [
    "Las ratas reclaman su parte de la cosecha.",
    "Las ratas han organizado un banquete en los graneros reales. No invitaron a nadie.",
  ],
  cosecha_gloriosa: [
    "Los campos rebosan. Los campesinos, sospechosamente contentos.",
    "El cielo sonríe al reino. El cronista no se fía.",
  ],
  fiebre_oro: [
    "Todo el reino quiere ser mercader. Los mercados no dan abasto, y el cronista tampoco.",
    "Fiebre del oro: los mercaderes sonríen y los bolsillos tintinean.",
  ],
  tormenta_costa: [
    "El mar se enfada con los puertos. Los barcos, prudentes, se quedan en casa.",
    "Tormenta en la costa: ni un barco entra, ni una moneda sale.",
  ],
  derrumbe: [
    "Las montañas se han cansado de que las piquen. Por una semana, descansan.",
    "Gran derrumbe: canteros y mineros toman un descanso forzoso y pagado por nadie.",
  ],
  fiesta_san_aldric: [
    "El reino celebra al difunto rey produciendo el doble. Sin pollo.",
    "Día de fiesta: todos trabajan el doble, que es como se celebra aquí.",
  ],
  caminos_embarrados: [
    "Llueve sobre Aldricia. Quien ataque llegará tarde y lleno de barro.",
    "Los caminos son ríos de lodo. Defender nunca fue tan cómodo.",
  ],
  fervor_guerrero: [
    "Los soldados han oído una canción épica y ahora quieren pelear con todo el mundo.",
    "Fervor guerrero: hasta los cocineros afilan los cucharones.",
  ],
  paz_del_rey: [
    "El fantasma del rey exige paz entre las casas. Por una vez, le hacen caso.",
    "Paz del Rey: las espadas descansan. Los neutrales, no tanto.",
  ],
  bandidos: [
    "Los bandidos han decidido que {jugador} tiene demasiadas tierras.",
    "Los bandidos reparten justicia, a su manera, que es a palos.",
  ],
  tributo_rey: [
    "La Corona reclama lo suyo a quien más tiene. El fantasma del rey lo aprueba.",
    "Los ricos pagan y los demás aplauden. Por una vez.",
  ],
  llaves_rey: [
    "Se buscan las llaves del tesoro. Quien más comercie, más llaveros verá.",
    "{jugador} encuentra unas llaves y 15 de Oro. No eran las del tesoro, pero el Oro sí es de verdad.",
  ],
  torneo_real: [
    "Gran torneo en la corte: gana quien más soldados trae, que es la forma moderna de ganar torneos.",
    "El torneo real premia al ejército más grande. La caballería, ofendida.",
  ],
  levas_reales: [
    "La Corona llama a filas. Los campesinos acuden, más o menos voluntarios.",
    "Levas reales: cada castillo recibe reclutas nuevos y bastante desorientados.",
  ],
  carnaval: [
    "Carnaval en Aldricia: pan para todos y disfraces para quien se atreva.",
    "El reino se disfraza y reparte pan. Fray Abundio va de fraile, como siempre.",
  ],
  limosna_real: [
    "La Corona se apiada de {jugador}. El gesto es noble; la cantidad, modesta.",
    "Limosna real para {jugador}. Nadie lo comenta. Todos lo comentan.",
  ],
  paga_atrasada: [
    "Los soldados reclaman las pagas atrasadas. Con intereses.",
    "Este domingo el ejército cobra el doble. El tesorero ya ha empezado a llorar.",
  ],
  indulgencia_real: [
    "Por decreto del fantasma del rey, este domingo los soldados comen gratis.",
    "Indulgencia real: el mantenimiento corre a cargo de la Corona, que no tiene Oro pero sí buena voluntad.",
  ],
  mercado_enloquece: [
    "La subasta de esta semana ofrece el doble. Los pujadores, el doble de nerviosos.",
    "Lotes dobles: el subastador ha perdido la cabeza, o la cuenta.",
  ],
  semana_tranquila: [
    "No pasa nada. Fray Abundio aprovecha para echarse una siesta.",
    "Semana tranquila en Aldricia. El cronista bosteza y afila la pluma por si acaso.",
  ],
};

export type EventKey = keyof typeof EVENTS;
export const EVENT_KEYS = Object.keys(EVENTS) as EventKey[];

export interface WeekEvent {
  key: EventKey;
  /** Recurso de la Cosecha Gloriosa. */
  resource?: Resource;
}

/** Evento de la semana `week`. Cada evento sale una vez por partida (hasta agotar el catálogo). */
export function eventOfWeek(seed: string, week: number): WeekEvent {
  const rand = seededRandom(`${seed}:eventos`);
  const deck = shuffle([...EVENT_KEYS], rand);
  const key = deck[(week - 1) % deck.length]!;
  if (key === "cosecha_gloriosa") {
    const r = seededRandom(`${seed}:cosecha:${week}`);
    return { key, resource: RESOURCES[Math.floor(r() * RESOURCES.length)]! };
  }
  return { key };
}

/** Línea del cronista para el evento de una semana (variante fijada por la semilla). */
export function eventLine(seed: string, week: number, e: WeekEvent, player?: string): string {
  const options = EVENT_LINES[e.key];
  const r = seededRandom(`${seed}:linea:${week}`);
  const line = options[Math.floor(r() * options.length)]!;
  return line.replace("{jugador}", player ?? "alguien");
}

export function eventText(e: WeekEvent): string {
  return EVENTS[e.key].texto.replace("{recurso}", e.resource ? RESOURCE_NAME[e.resource] : "un recurso");
}

/**
 * Cambios de producción del evento de la semana `eventWeek` en el día `day`
 * (0 = primer lunes). Actúa del jueves de esa semana al miércoles siguiente.
 */
export function eventProduction(e: WeekEvent, eventWeek: number, day: number): ProductionModifiers | null {
  const thursday = (eventWeek - 1) * 7 + 3;
  if (day < thursday || day > thursday + 6) return null;
  switch (e.key) {
    case "plaga_ratas":
      return { resourceFactor: { pan: V.plague } };
    case "cosecha_gloriosa":
      return { resourceFactor: { [e.resource ?? "pan"]: V.harvest } };
    case "fiebre_oro":
      return { buildingFactor: { mercado: V.goldFever } };
    case "tormenta_costa":
      return { tilesOff: ["puerto"] };
    case "derrumbe":
      return { tilesOff: ["cantera", "montana"] };
    case "fiesta_san_aldric":
      return day === thursday
        ? { resourceFactor: Object.fromEntries(RESOURCES.map((r) => [r, V.feast])) as Partial<Record<Resource, number>> }
        : null;
    default:
      return null;
  }
}

/** Semana cuyo evento afecta a la producción del día `day` (los efectos van de jueves a miércoles). */
export function productionEventWeek(day: number): number | null {
  return day >= 3 ? Math.floor((day - 3) / 7) + 1 : null;
}

/** Efecto en el combate de la resolución del miércoles. */
export function eventCombat(e: WeekEvent): { defenseBonus?: number; attackBonusAll?: number; peace?: boolean } {
  switch (e.key) {
    case "caminos_embarrados":
      return { defenseBonus: V.mud };
    case "fervor_guerrero":
      return { attackBonusAll: V.fervor };
    case "paz_del_rey":
      return { peace: true };
    default:
      return {};
  }
}

/** Factor del mantenimiento del domingo de la semana del evento. */
export function eventUpkeepFactor(e: WeekEvent): number {
  return e.key === "paga_atrasada" ? V.lateWages : e.key === "indulgencia_real" ? 0 : 1;
}

/** ¿Lotes dobles en la subasta de esta semana? */
export function eventDoublesAuction(e: WeekEvent): boolean {
  return e.key === "mercado_enloquece";
}

export interface EventHouse {
  house: HouseId;
  resources: Resources;
  prestige: number;
  /** Tratos válidos en los últimos 7 días. */
  validTradesWeek: number;
}

export interface EventOutcome {
  /** Cambios de recursos por casa. */
  resources: Map<HouseId, Partial<Resources>>;
  /** Tropas que se suman al castillo de cada casa. */
  castleTroops: Map<HouseId, number>;
  /** Casillas después del evento (solo cambian con los bandidos). */
  tiles: Tile[];
  /** Datos para la crónica. */
  log: Record<string, unknown>;
}

/** Efectos al momento, en la resolución del miércoles (después de la campaña). */
export function applyEventNow(e: WeekEvent, tiles: Tile[], houses: EventHouse[], resolution: number): EventOutcome {
  const out: EventOutcome = { resources: new Map(), castleTroops: new Map(), tiles, log: { key: e.key } };
  const add = (h: HouseId, r: Partial<Resources>) => {
    const cur = out.resources.get(h) ?? {};
    for (const [k, v] of Object.entries(r) as [Resource, number][]) cur[k] = (cur[k] ?? 0) + v;
    out.resources.set(h, cur);
  };
  const best = (score: (h: EventHouse) => number) => {
    const max = Math.max(...houses.map(score));
    return max > 0 ? houses.filter((h) => score(h) === max).map((h) => h.house) : [];
  };
  switch (e.key) {
    case "tributo_rey": {
      const rich = [...houses].sort((a, b) => b.resources.oro - a.resources.oro || a.house - b.house).slice(0, 2);
      const paid = rich.map((h) => ({ house: h.house, gold: Math.floor(h.resources.oro * V.tributeShare) }));
      const others = houses.filter((h) => !rich.includes(h));
      const total = paid.reduce((a, p) => a + p.gold, 0);
      const each = others.length ? Math.floor(total / others.length) : 0;
      for (const p of paid) add(p.house, { oro: -p.gold });
      for (const o of others) add(o.house, { oro: each });
      out.log = { ...out.log, paid, each };
      break;
    }
    case "llaves_rey": {
      const winners = best((h) => h.validTradesWeek);
      for (const w of winners) add(w, { oro: V.keysGold });
      out.log = { ...out.log, winners };
      break;
    }
    case "torneo_real": {
      const troops = (h: EventHouse) => tiles.filter((t) => t.owner === h.house).reduce((a, t) => a + t.troops, 0) + guestTroops(tiles, h.house);
      const winners = best(troops);
      for (const w of winners) add(w, { oro: V.tournamentGold });
      out.log = { ...out.log, winners };
      break;
    }
    case "levas_reales":
      for (const h of houses) out.castleTroops.set(h.house, V.levies);
      break;
    case "carnaval":
      for (const h of houses) add(h.house, { pan: V.carnivalPan });
      break;
    case "limosna_real": {
      const last = lastPlace(houses.map((h) => ({ house: h.house, total: h.prestige })));
      if (last != null) add(last, Object.fromEntries(RESOURCES.map((r) => [r, V.almsEach])) as Partial<Resources>);
      out.log = { ...out.log, house: last };
      break;
    }
    case "bandidos": {
      const counts = houses.map((h) => ({
        house: h.house,
        n: tiles.filter((t) => t.owner === h.house && t.type !== "castillo").length,
      }));
      const victim = counts.sort((a, b) => b.n - a.n || a.house - b.house)[0];
      if (!victim || victim.n === 0) {
        out.log = { ...out.log, tile: null };
        break;
      }
      const castle = tiles.find((t) => t.castleOf === victim.house);
      const dist = (t: Tile) => (castle ? distance(t, castle) : 0);
      const target = tiles
        .filter((t) => t.owner === victim.house && t.type !== "castillo")
        .sort((a, b) => dist(b) - dist(a) || a.id - b.id)[0]!;
      const defense = target.troops * defenseMultiplier(target, resolution, false);
      const won = V.bandits > defense;
      const left = won ? survivors(V.bandits, V.bandits, defense) : survivors(target.troops, defense, V.bandits);
      out.tiles = tiles.map((t) =>
        t.id === target.id
          ? won
            ? { ...t, owner: null, troops: left, fortifiedUntil: null, jinetes: undefined, catapultas: undefined }
            : clampUnits({ ...t, troops: left })
          : t,
      );
      out.log = { ...out.log, house: victim.house, tile: target.id as TileId, won, left };
      break;
    }
    default:
      break;
  }
  return out;
}
