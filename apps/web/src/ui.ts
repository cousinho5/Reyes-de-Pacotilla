// Textos, colores y formatos de la interfaz. Todo en español.

import { CARDS, OBJECTIVES, type BuildingKind, type CardKey, type ObjectiveKey, type Resource, type TileType } from "@reyes/engine";
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

/** Color de frontera en el mapa: más vivo que el esmalte para leerse sobre la hierba. */
export const TERRITORY: Record<string, string> = {
  gules: "#ec4a33",
  azur: "#4d86ff",
  sinople: "#7ee06a",
  sable: "#0d0d10",
  purpura: "#e066dc",
  naranjado: "#ffa236",
  aguamarina: "#35dcd3",
  leonado: "#b0773f",
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
  paramo: "Páramo",
  prado: "Prado",
  lago: "Lago",
  aldea: "Aldea",
  ruinas: "Ruinas",
};

/** Tipos de tropa (diseño v3). */
export const UNIT_LABEL: Record<"mesnada" | "jinetes" | "catapultas", string> = {
  mesnada: "Mesnada",
  jinetes: "Jinetes",
  catapultas: "Catapultas",
};
export const UNIT_ONE: Record<"mesnada" | "jinetes" | "catapultas", string> = {
  mesnada: "soldado de la mesnada",
  jinetes: "jinete",
  catapultas: "catapulta",
};
export const UNIT_NOTE: Record<"mesnada" | "jinetes" | "catapultas", string> = {
  mesnada: "La tropa de siempre: fuerza 1 en todas partes. La única que sube a la montaña.",
  jinetes: "Cargan con fuerza 2 contra casillas llanas sin murallas y, solos, cruzan dos casillas llanas en una noche. En el bosque valen la mitad y no suben a la montaña.",
  catapultas: "No luchan (fuerza 0), pero cada una quita un 25% a la fortificación o la fortaleza que atacan. Comen como dos tropas y se pierden si el ataque fracasa.",
};

/** "Sir Ramiro el Tibio, de la Casa del Nabo". */
export function captainOf(houses: HouseInfo[], id: number): string {
  const h = houses.find((x) => x.id === id);
  return h?.capitan ? `${h.capitan.nombre}, capitán de ${h.nombre}` : `El capitán de ${houseName(houses, id)}`;
}

/** Lo que queda de las murallas de una fortaleza (+50%) tras `nights` noches de asedio (−25% cada una). */
export function wallsLeft(nights: number): string {
  const left = Math.max(0, 50 - 25 * nights);
  return left > 0 ? `a sus murallas les queda +${left}% de defensa` : "sus murallas ya no defienden";
}

/** "6", o "6 (2 jinetes y 1 catapulta)" si hay tipos distintos de la Mesnada. */
export function troopsText(n: number, jinetes = 0, catapultas = 0): string {
  const parts = [
    jinetes > 0 ? `${jinetes} ${jinetes === 1 ? "jinete" : "jinetes"}` : null,
    catapultas > 0 ? `${catapultas} ${catapultas === 1 ? "catapulta" : "catapultas"}` : null,
  ].filter(Boolean);
  return parts.length ? `${n} (${parts.join(" y ")})` : String(n);
}

/** Lo que el terreno hace en la guerra (diseño v3), para el panel de la casilla. */
export const TERRAIN_NOTE: Record<TileType, string> = {
  castillo: "No se puede conquistar.",
  campos: "Terreno llano: sin ventaja para nadie.",
  bosque: "+25% de defensa. Emboscada: desde fuera no se ve cuántas tropas hay.",
  cantera: "+25% de defensa. Fortificar aquí cuesta la mitad de Piedra.",
  montana: "+50% de defensa. Atalaya: desde aquí ves a dos casillas.",
  puerto: "Travesía: desde un puerto tuyo llegas a cualquier otro puerto en una noche.",
  fortaleza: "+50% de defensa.",
  paramo: "Terreno llano y yermo: no produce nada.",
  prado: "Terreno llano: no produce nada, pero los jinetes cargan por él.",
  lago: "No se puede entrar: hay que rodearlo.",
  aldea: "No produce, pero si es tuya puedes reclutar en ella como en tu castillo.",
  ruinas: "La primera casa que entra se lleva lo que guardan: recursos o una carta de la Corona. Después quedan como Prado.",
};

export const TILE_MARK: Record<TileType, string> = {
  castillo: "♜",
  campos: "≋",
  bosque: "♣",
  cantera: "▤",
  montana: "▲",
  puerto: "⚓",
  fortaleza: "▣",
  paramo: "∴",
  prado: "⁂",
  lago: "≈",
  aldea: "⌂",
  ruinas: "⌗",
};

export function houseColor(houses: HouseInfo[], id: number | null): string | null {
  if (id == null) return null;
  const h = houses.find((x) => x.id === id);
  return h ? (HOUSE_COLORS[h.color]?.hex ?? "#666") : null;
}

/** "Casa del Nabo" → "la Casa del Nabo" (para frases como "¡Larga vida a la Casa…!"). */
export function withArticle(name: string): string {
  if (/^casa\b/i.test(name)) return `la ${name}`;
  // "Los Pocapena" en mitad de una frase: "los Pocapena".
  return name.replace(/^(Los|Las|El|La)\s/, (m) => m.toLowerCase());
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

const SHORT_FMT = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "dom, 1 nov, 22:00" */
export function formatShort(iso: string | null | undefined): string {
  return iso ? SHORT_FMT.format(new Date(iso)) : "—";
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

const NIGHT_FMT = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric" });
const NIGHT_LONG_FMT = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric" });

/**
 * Nombre de la noche `k` de la cola (0 = la próxima resolución). En las partidas
 * con resolución diaria, el día ("jue 22"); si no, el número de resolución.
 */
export function nightLabel(p: { proximaResolucion?: number | null; resolucion?: string | null; diasResolucion?: number[] }, k: number, long = false): string {
  const n = (p.proximaResolucion ?? 0) + k;
  if (!p.resolucion || (p.diasResolucion?.length ?? 0) < 7) return `${long ? "la resolución" : "Res."} ${n}`;
  const at = new Date(Date.parse(p.resolucion) + k * 864e5);
  const text = (long ? NIGHT_LONG_FMT : NIGHT_FMT).format(at).replace(",", "");
  return long ? `el ${text}` : text.charAt(0).toUpperCase() + text.slice(1);
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
      if (d.via != null) {
        const [a, b] = (d.sides as { house: number }[]).map((x) => houseName(houses, x.house));
        return d.winner == null
          ? `${a} y ${b} chocan por el camino en ${tile(d.via)} y ambos se repliegan.`
          : `${a} y ${b} chocan por el camino en ${tile(d.via)}: gana ${houseName(houses, d.winner)} y sigue su marcha.`;
      }
      return d.winner == null
        ? "Dos ejércitos chocan a medio camino y ambos se repliegan."
        : `${houseName(houses, d.winner)} gana un choque a medio camino.`;
    case "repliegue":
      return d.arrived
        ? `${houseName(houses, d.house)} se repliega a ${tile(d.to)} con ${troops(d.troops)}. Fray Abundio lo llamará repliegue genial.`
        : `${houseName(houses, d.house)} no tiene adónde replegarse: sus ${troops(d.troops)} se dispersan.`;
    case "capitan_preso":
      return `${captainOf(houses, d.house)} cae preso de ${houseName(houses, d.by)} en ${tile(d.tile)}. Se escapará en la resolución ${d.freeAt}, salvo rescate.`;
    case "capitan_libre":
      return d.reason === "fuga"
        ? `${captainOf(houses, d.house)} se escapa y vuelve a su castillo, con más hambre que gloria.`
        : d.reason === "liberado"
          ? `${houseName(houses, d.by)} suelta a ${captainOf(houses, d.house)}. Fray Abundio sospecha que hubo rescate.`
          : `${captainOf(houses, d.house)} huye de la guarnición neutral y vuelve a su castillo.`;
    case "asedio":
      return d.castle
        ? `${houseName(houses, d.house)} rodea ${tile(d.tile)}${d.nights > 1 ? ` (${d.nights} noches)` : ""}: produce la mitad y el sitiador gana 1 de Prestigio.`
        : `${houseName(houses, d.house)} sitia ${tile(d.tile)}${d.nights > 1 ? ` (${d.nights} noches)` : ""}: ${wallsLeft(d.nights)}.`;
    case "asedio_roto":
      return d.reason === "cortado"
        ? `Rompen el asedio de ${houseName(houses, d.house)} a ${tile(d.tile)} atacando a los sitiadores.`
        : d.reason === "tomada"
          ? `El asedio a ${tile(d.tile)} termina: la casilla cambia de manos.`
          : `${houseName(houses, d.house)} levanta el asedio de ${tile(d.tile)}.`;
    case "apoyo_cortado":
      return `El apoyo de ${houseName(houses, d.house)} desde ${tile(d.from)} queda cortado por un ataque.`;
    case "movimiento":
      return `${houseName(houses, d.house)} mueve ${troops(d.troops)} a ${tile(d.to)}.`;
    case "estandartes":
      return `Se ven estandartes de ${withArticle(houseName(houses, d.house))} en ${tile(d.tile)} (${troops(d.troops)}), junto a ${tile(d.near)}.`;
    case "mantenimiento":
      return d.deserted > 0
        ? `Mantenimiento: costaba ${d.cost} de Pan y solo había ${d.paid}. Desertan: ${troops(d.deserted)}.`
        : `Mantenimiento pagado: ${d.cost} de Pan.`;
    case "mantenimiento_fortificaciones": {
      const paid = [d.piedra > 0 && `${d.piedra} de Piedra`, d.oro > 0 && `${d.oro} de Oro`].filter(Boolean).join(" y ");
      const kept = d.kept === 1 ? "1 casilla fortificada" : `${d.kept} casillas fortificadas`;
      const dropped = d.dropped === 1 ? "se desmantela 1 fortificación" : `se desmantelan ${d.dropped} fortificaciones`;
      if (d.dropped > 0) return paid ? `Fortificaciones: pagas ${paid} por ${kept} y ${dropped}.` : `Fortificaciones: no llega para pagarlas y ${dropped}.`;
      return `Fortificaciones: pagas ${paid} por ${kept}.`;
    }
    case "ayuda_ultimo":
      return `La Corona ayuda a ${houseName(houses, d.house)}, última en Prestigio, durante la próxima semana.`;
    case "orden_invalida":
      return `Una orden tuya no se ejecutó: ${d.reason}.`;
    case "ruinas": {
      const prize =
        d.prize?.kind === "carta"
          ? `la carta ${CARDS[d.prize.card as CardKey]?.nombre ?? d.prize.card}`
          : `${d.prize?.amount} de ${RESOURCE_LABEL[d.prize?.resource as Resource] ?? d.prize?.resource}`;
      return `${houseName(houses, d.house)} entra la primera en ${tile(d.tile)} y encuentra ${prize}. Desde hoy es un Prado.`;
    }
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
    case "boletin":
      return `Fray Abundio publica el boletín de la semana ${d.week}: «${d.headline}». Léelo arriba.`;
    case "mejora":
      return null;
    case "anuncio_evento":
      return `Evento de la semana ${d.week}: ${d.nombre}. ${d.texto} «${d.linea}»`;
    case "evento": {
      const extra =
        d.key === "bandidos" && d.tile != null
          ? d.won
            ? ` Los bandidos se quedan ${tile(d.tile)} (${troops(d.left)}).`
            : ` ${tile(d.tile)} resiste a los bandidos y conserva ${troops(d.left)}.`
          : Array.isArray(d.winners) && d.winners.length > 0
            ? ` Premio para ${(d.winners as number[]).map((h) => withArticle(houseName(houses, h))).join(" y ")}.`
            : d.key === "limosna_real" && d.house != null
              ? ` La recibe ${withArticle(houseName(houses, d.house))}.`
              : d.key === "tributo_rey" && Array.isArray(d.paid)
                ? ` Pagan ${(d.paid as { house: number; gold: number }[]).map((x) => `${withArticle(houseName(houses, x.house))} (${x.gold})`).join(" y ")}; las demás reciben ${d.each} de Oro.`
                : "";
      return `${d.nombre}: «${d.linea}»${extra}`;
    }
    case "paz":
      return `La Paz del Rey detiene el ataque de ${(d.houses as number[]).map((h) => withArticle(houseName(houses, h))).join(" y ")} contra ${tile(d.tile)}.`;
    case "anuncio_subasta":
      return `Gran Subasta de la semana ${d.week}: ${(d.lots as string[]).join(", ")}. Pujas hasta el miércoles a las 21:00.`;
    case "subasta":
      return d.winner != null
        ? `Gran Subasta: ${withArticle(houseName(houses, d.winner))} se lleva ${d.lot} por ${d.price} de Oro.`
        : `Gran Subasta: nadie se lleva ${d.lot}.`;
    case "carta": {
      const name = CARDS[d.card as CardKey]?.nombre ?? d.card;
      const extra = d.params?.casa ? ` sobre ${houseName(houses, d.params.casa)}` : d.params?.casilla ? ` en ${tile(d.params.casilla)}` : "";
      return `Usas la carta ${name}${extra}.`;
    }
    case "tregua":
      return `Tregua en ${tile(d.tile)}: ${(d.houses as number[]).map((h) => houseName(houses, h)).join(" y ")} no pueden atacar y sus tropas se quedan en casa.`;
    case "fin":
      return d.winner != null ? `Fin del interregno. ¡Larga vida a ${withArticle(houseName(houses, d.winner))}!` : "Fin del interregno.";
    default:
      return null;
  }
}
