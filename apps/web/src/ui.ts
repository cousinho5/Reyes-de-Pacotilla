// Textos, colores y formatos de la interfaz. Todo en español.

import { OBJECTIVES, type BuildingKind, type ObjectiveKey, type Resource, type TileType } from "@reyes/engine";
import type { EventView, HouseInfo, TileView } from "./api";

/** Paleta de las casas (diseño, sección 18.2). */
export const HOUSE_COLORS: Record<string, { hex: string; nombre: string }> = {
  gules: { hex: "#B3291D", nombre: "Rojo" },
  azur: { hex: "#1B3C80", nombre: "Azul" },
  sinople: { hex: "#246B2A", nombre: "Verde" },
  sable: { hex: "#1E1E24", nombre: "Negro" },
  purpura: { hex: "#A23C9E", nombre: "Púrpura" },
  naranjado: { hex: "#A84E0F", nombre: "Naranja" },
  aguamarina: { hex: "#0E6A6E", nombre: "Aguamarina" },
  leonado: { hex: "#4E2F18", nombre: "Marrón" },
};

export const RESOURCE_LABEL: Record<Resource, string> = {
  pan: "Pan",
  madera: "Madera",
  piedra: "Piedra",
  hierro: "Hierro",
  oro: "Oro",
};

/** Cada recurso tiene color y forma propios (accesibilidad). */
export const RESOURCE_MARK: Record<Resource, string> = {
  pan: "✦",
  madera: "▮",
  piedra: "◆",
  hierro: "▲",
  oro: "●",
};

export const BUILDING_LABEL: Record<BuildingKind, string> = {
  granja: "Granja",
  aserradero: "Aserradero",
  cantera: "Cantera",
  mina: "Mina",
  mercado: "Mercado",
};

export const ACHIEVEMENT_LABEL: Record<string, string> = {
  primera_fortaleza: "Primera fortaleza",
  obra_maestra: "Obra maestra",
  ganador_subasta: "Ganador de subasta",
};

export const TILE_LABEL: Record<TileType, string> = {
  castillo: "Castillo",
  campos: "Campos",
  bosque: "Bosque",
  cantera: "Cantera",
  montana: "Montaña",
  puerto: "Puerto",
  fortaleza: "Fortaleza",
};

export const TILE_MARK: Record<TileType, string> = {
  castillo: "♜",
  campos: "≋",
  bosque: "♣",
  cantera: "▤",
  montana: "▲",
  puerto: "⚓",
  fortaleza: "▣",
};

export function houseColor(houses: HouseInfo[], id: number | null): string | null {
  if (id == null) return null;
  const h = houses.find((x) => x.id === id);
  return h ? (HOUSE_COLORS[h.color]?.hex ?? "#666") : null;
}

/** "Casa del Nabo" → "la Casa del Nabo" (para frases como "¡Larga vida a la Casa…!"). */
export function withArticle(name: string): string {
  return /^casa\b/i.test(name) ? `la ${name}` : name;
}

export function houseName(houses: HouseInfo[], id: number | null | undefined): string {
  if (id == null) return "la guarnición neutral";
  return houses.find((h) => h.id === id)?.nombre ?? "una casa desconocida";
}

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const DAY_FMT = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

/** "2026-10-19" → "lunes, 19 de octubre" */
export function formatDay(date: string | null | undefined): string {
  return date ? DAY_FMT.format(new Date(`${date}T12:00:00Z`)) : "—";
}

export function formatWhen(iso: string | null | undefined): string {
  return iso ? DATE_FMT.format(new Date(iso)) : "—";
}

export function timeLeft(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "cerrado";
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  if (d >= 1) return `faltan ${d} d ${h % 24} h`;
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `faltan ${h} h ${m} min`;
}

/** "1 tropa", "3 tropas". */
export function troops(n: number): string {
  return `${n} ${n === 1 ? "tropa" : "tropas"}`;
}

/** Línea de la crónica para un evento (el boletín de Fray Abundio llega en la versión 1). */
export function describeEvent(e: EventView, houses: HouseInfo[], tiles: TileView[]): string | null {
  const tile = (id: unknown) => tiles.find((t) => t.id === id)?.nombre ?? "una casilla";
  const d = e.datos as Record<string, any>;
  switch (e.tipo) {
    case "combate":
      if (d.conquered) {
        const prev = d.previousOwner == null ? "la guarnición neutral" : houseName(houses, d.previousOwner);
        return `${houseName(houses, d.winner)} toma ${tile(d.tile)} a ${prev} y conserva ${troops(d.survivors)}.`;
      }
      return `${tile(d.tile)} resiste: ${houseName(houses, d.winner)} conserva ${troops(d.survivors)}.`;
    case "rebote":
      return `Rebote en ${tile(d.tile)}: ${(d.houses as number[]).map((h) => houseName(houses, h)).join(" y ")} chocan con la misma fuerza y nadie entra.`;
    case "choque_frontal":
      return d.winner == null
        ? "Dos ejércitos chocan a medio camino y ambos se repliegan."
        : `${houseName(houses, d.winner)} gana un choque a medio camino.`;
    case "repliegue":
      return d.arrived
        ? `${houseName(houses, d.house)} se repliega a ${tile(d.to)} con ${troops(d.troops)}. Fray Abundio lo llamará repliegue genial.`
        : `${houseName(houses, d.house)} no tiene adónde replegarse: sus ${troops(d.troops)} se dispersan.`;
    case "apoyo_cortado":
      return `El apoyo de ${houseName(houses, d.house)} desde ${tile(d.from)} queda cortado por un ataque.`;
    case "movimiento":
      return `${houseName(houses, d.house)} mueve ${troops(d.troops)} a ${tile(d.to)}.`;
    case "mantenimiento":
      return d.deserted > 0
        ? `Mantenimiento: costaba ${d.cost} de Pan y solo había ${d.paid}. Desertan: ${troops(d.deserted)}.`
        : `Mantenimiento pagado: ${d.cost} de Pan.`;
    case "ayuda_ultimo":
      return `La Corona ayuda a ${houseName(houses, d.house)}, última en Prestigio, durante la próxima semana.`;
    case "orden_invalida":
      return `Una orden tuya no se ejecutó: ${d.reason}.`;
    case "logro":
      return `${houseName(houses, d.house)} consigue el logro ${ACHIEVEMENT_LABEL[d.logro as string] ?? d.logro}.`;
    case "piloto_automatico": {
      const parts = [
        d.upgrade && `mejora ${BUILDING_LABEL[d.upgrade as BuildingKind] ?? d.upgrade}`,
        d.fortify && `fortifica ${tile(d.fortify)}`,
        d.recruit > 0 && `recluta ${troops(d.recruit)}`,
      ].filter(Boolean);
      return `Tu piloto automático ${parts.length ? parts.join(", ") : "vigila y no toca nada"}.`;
    }
    case "objetivo": {
      const texto = OBJECTIVES[d.objetivo as ObjectiveKey];
      if (!texto) return `${houseName(houses, d.house)} no tenía ambición secreta. El cronista lo encuentra admirable.`;
      return `La ambición secreta de ${houseName(houses, d.house)} era: «${texto.replace(/\.$/, "")}». ${
        d.cumplido ? "Cumplida: +6 de Prestigio." : "No la cumplió."
      }`;
    }
    case "fin":
      return d.winner != null ? `Fin del interregno. ¡Larga vida a ${withArticle(houseName(houses, d.winner))}!` : "Fin del interregno.";
    default:
      return null;
  }
}
