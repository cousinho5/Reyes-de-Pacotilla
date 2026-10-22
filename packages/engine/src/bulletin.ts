// Boletín semanal de Fray Abundio (diseño, sección 17). Se publica el domingo,
// tras la resolución, con los hechos de la semana. Las frases salen del banco
// (texts/cronista.ts) y no se repiten en la partida hasta agotar su tipo. Las
// cifras siempre son exactas; el humor va en los adjetivos.

import { blazon } from "./heraldry";
import { seededRandom } from "./random";
import { PHRASES, type PhraseKey } from "./texts/cronista";
import type { HouseId, Resource, TileId } from "./types";

const RESOURCE_NAMES: Record<Resource, string> = { pan: "Pan", madera: "Madera", piedra: "Piedra", hierro: "Hierro", oro: "Oro" };

/** Nombre de una casa en mitad de una frase: "la Casa del Nabo", "los Pocapena". */
export function houseInSentence(name: string): string {
  if (/^casa\b/i.test(name)) return `la ${name}`;
  return name.replace(/^(Los|Las|El|La)\s/, (m) => m.toLowerCase());
}

export interface BulletinHouse {
  id: HouseId;
  name: string;
  motto: string | null;
  color: string;
  symbol: string;
  metal?: string;
  division?: string;
  color2?: string | null;
  prestige: number;
}

/** Hechos de la semana, tal como están en el registro (tipo y datos). */
export interface BulletinFact {
  type: string;
  data: Record<string, unknown>;
}

export interface BulletinInput {
  seed: string;
  week: number;
  totalWeeks: number;
  houses: BulletinHouse[];
  /** Líder del boletín anterior (null en el primero). */
  previousLeader: HouseId | null;
  facts: BulletinFact[];
  tileNames: Map<TileId, string>;
  /** Tratos cerrados esta semana (pares de casas). */
  trades: { a: HouseId; b: HouseId }[];
  /** Bloque 5: unidades que vendió la Corona esta semana, entre todas las casas (sin decir a quién). */
  crown?: Partial<Record<Resource, number>>;
  /** Sobornos de la semana: frase elegida (índice) y Oro pagado. */
  bribes: { house: HouseId; template: number; amount: number }[];
  /** Frases ya usadas en la partida ("categoria.indice"). */
  used: string[];
  /** Solo en el último boletín. */
  final?: {
    objectives: { house: HouseId; text: string; met: boolean }[];
    patron: { house: HouseId; gold: number } | null;
  };
}

export interface BulletinSection {
  title: string;
  lines: string[];
}

export interface Bulletin {
  week: number;
  headline: string;
  sections: BulletinSection[];
  margin: string[];
  sponsors: string[];
  leader: HouseId | null;
  /** Cara de Fray Abundio en la cabecera (la del pie de patrocinio siempre cuenta monedas). */
  mood?: BulletinMood;
  /** Frases usadas en este boletín, para no repetirlas. */
  used: string[];
}

/** Las cinco caras del cronista (diseño, sección 17). */
export type BulletinMood = "solemne" | "adulador" | "escandalizado" | "dormido" | "monedas";

const MAX_HOUSE_BATTLES = 5;
const MAX_NEUTRAL_BATTLES = 3;

export function writeBulletin(input: BulletinInput): Bulletin {
  const rand = seededRandom(`${input.seed}:boletin:${input.week}`);
  const used = new Set(input.used);
  const usedNow: string[] = [];
  const byId = new Map(input.houses.map((h) => [h.id, h]));
  const name = (id: unknown) => {
    const h = byId.get(id as HouseId);
    return h ? houseInSentence(h.name) : "la guarnición neutral";
  };
  const tile = (id: unknown) => input.tileNames.get(id as TileId) ?? "una casilla";

  /** Elige una variante sin usar (o cualquiera si se agotaron) y la rellena. */
  const say = (key: PhraseKey, vars: Record<string, string | number>, filter?: (text: string) => boolean): string => {
    const all = PHRASES[key] as readonly string[];
    const ok = all.map((t, i) => ({ t, i })).filter((x) => !filter || filter(x.t));
    const fresh = ok.filter((x) => !used.has(`${key}.${x.i}`));
    const pool = fresh.length > 0 ? fresh : ok;
    const pick = pool[Math.floor(rand() * pool.length)]!;
    used.add(`${key}.${pick.i}`);
    usedNow.push(`${key}.${pick.i}`);
    return fill(pick.t, vars);
  };

  const ranking = [...input.houses].sort((a, b) => b.prestige - a.prestige || a.id - b.id);
  const leader = ranking[0] ?? null;
  const last = ranking.length > 1 ? ranking[ranking.length - 1]! : null;
  const sections: BulletinSection[] = [];
  const isFinal = !!input.final;

  // 1. El líder: elogio, o cambio de bando si es nuevo.
  if (leader) {
    const changed = input.previousLeader != null && input.previousLeader !== leader.id;
    sections.push({
      title: changed ? "Nuevo favorito" : "El favorito del cronista",
      lines: [say(changed ? "clasificacion.nuevo_lider" : "clasificacion.lider", { "líder": name(leader.id), pv: leader.prestige })],
    });
  }

  // 2. Primer boletín: presentación de las casas.
  if (input.week === 1) {
    const lines = input.houses.map((h) =>
      say(
        "casas.presentacion",
        { jugador: name(h.id), escudo: blazon(h.color, h.symbol, h.metal, h.division, h.color2), lema: h.motto ?? "" },
        (t) => !!h.motto || !t.includes("{lema}"),
      ),
    );
    const hen = input.houses.find((h) => h.symbol === "gallina");
    if (hen) lines.push(say("casas.gallina", { jugador: name(hen.id) }));
    sections.push({ title: "Los pretendientes", lines });
  }

  // 3. Batallas.
  const battles: string[] = [];
  const combats = input.facts.filter((f) => f.type === "combate");
  const lostTile = new Set<HouseId>();
  const houseCombats = combats.filter((f) => f.data.previousOwner != null || attackersOf(f).some((a) => a != null));
  let houseLines = 0;
  let neutralLines = 0;
  let neutralSkipped = 0;
  for (const f of combats) {
    const d = f.data as unknown as CombatData;
    const phrase = combatPhrase(d, name, tile);
    if (!phrase) continue;
    if (phrase.neutral) {
      // Conquista de una neutral.
      if (neutralLines >= MAX_NEUTRAL_BATTLES) {
        neutralSkipped++;
        continue;
      }
      battles.push(say(phrase.key, phrase.vars));
      neutralLines++;
      continue;
    }
    if (houseLines >= MAX_HOUSE_BATTLES) continue;
    if (d.conquered) lostTile.add(d.previousOwner!);
    battles.push(say(phrase.key, phrase.vars));
    houseLines++;
  }
  for (const f of input.facts.filter((x) => x.type === "rebote").slice(0, 2)) {
    const hs = f.data.houses as HouseId[];
    battles.push(say("combate.rebote", { a: name(hs[0]), b: name(hs[1]), casilla: tile(f.data.tile) }));
  }
  if (neutralSkipped > 0) {
    battles.push(`Y ${neutralSkipped} ${neutralSkipped === 1 ? "casilla neutral cambia" : "casillas neutrales cambian"} de manos, que el cronista no da abasto.`);
  }
  if (battles.length === 0) battles.push(say("reino.tranquila", {}));
  sections.push({ title: combats.length > 0 ? "Crónica de las armas" : "La paz del reino", lines: battles });

  // 4. Economía: evento, subasta y comercio.
  const economy: string[] = [];
  for (const f of input.facts.filter((x) => x.type === "evento")) {
    economy.push(`${f.data.nombre}. ${f.data.linea}`);
  }
  for (const f of input.facts.filter((x) => x.type === "subasta" && x.data.winner != null)) {
    const lot = String(f.data.lot);
    // "la carta Tregua es suyo" no: con lotes en femenino se evita esa variante.
    const feminine = /^la\s/.test(lot);
    economy.push(
      say("economia.subasta", { jugador: name(f.data.winner), lote: lot, oro: Number(f.data.price) }, (t) => !feminine || !t.includes("es suyo")),
    );
  }
  if (input.trades.length > 0) {
    const count = new Map<HouseId, number>();
    for (const t of input.trades) {
      count.set(t.a, (count.get(t.a) ?? 0) + 1);
      count.set(t.b, (count.get(t.b) ?? 0) + 1);
    }
    const top = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]!;
    const n = input.trades.length;
    economy.push(
      say("economia.comercio", { n, jugador: name(top[0]) }, (t) =>
        // Que el adjetivo cuadre con la cifra.
        !t.includes("casas distintas") && (n > 3 ? !t.includes("floja") : !t.includes("hierven")),
      ),
    );
  }
  // Bloque 5: lo que más vendió la Corona, sin decir a quién (las compras son secretas).
  const crownTop = Object.entries(input.crown ?? {})
    .filter(([, n]) => (n ?? 0) > 0)
    .sort((a, b) => b[1]! - a[1]! || a[0].localeCompare(b[0]))[0];
  if (crownTop) {
    economy.push(say("economia.corona", { n: crownTop[1]!, recurso: RESOURCE_NAMES[crownTop[0] as Resource] }));
  }
  if (economy.length > 0) sections.push({ title: "Mercados y augurios", lines: economy });

  // 5. Obras y logros.
  const works: string[] = [];
  for (const f of input.facts.filter((x) => x.type === "logro")) {
    works.push(say("reino.logro", { jugador: name(f.data.house), logro: ACHIEVEMENT_NAME[String(f.data.logro)] ?? String(f.data.logro) }));
  }
  const upgrades = input.facts
    .filter((x) => x.type === "mejora")
    .sort((a, b) => Number(b.data.nivel) - Number(a.data.nivel))
    .slice(0, 2);
  for (const f of upgrades) {
    const kind = String(f.data.edificio);
    const line = say("reino.construccion", { jugador: name(f.data.house), edificio: "{edificio}", nivel: Number(f.data.nivel) });
    works.push(withBuilding(line, kind));
  }
  if (works.length > 0) sections.push({ title: "Obras y honores", lines: works });

  // 6. Las casas: el lema contra la realidad y el último.
  const houses: string[] = [];
  const contradicted = input.houses.find((h) => h.motto && lostTile.has(h.id));
  if (contradicted) houses.push(say("casas.lema", { jugador: name(contradicted.id), lema: contradicted.motto! }));
  if (last && !isFinal) houses.push(say("clasificacion.ultimo", { "último": name(last.id), pv: last.prestige }));
  if (houses.length > 0) sections.push({ title: "Noticias de las casas", lines: houses });

  // 7. El difunto rey: la versión oficial de su muerte (una vez por partida) o su fantasma.
  const king: string[] = [];
  // Entre la semana 2 y la penúltima (con "semanas" en plural).
  const deathWeek = 2 + Math.floor(seededRandom(`${input.seed}:muerte`)() * Math.max(1, input.totalWeeks - 2));
  if (input.week === deathWeek) king.push(say("rey.muerte", { semanas: input.week }));
  else if (rand() < 0.5 && leader) {
    const someone = input.houses[Math.floor(rand() * input.houses.length)]!;
    king.push(say("rey.fantasma", { "líder": name(leader.id), jugador: name(someone.id) }));
  }
  if (king.length > 0) sections.push({ title: "Del difunto rey", lines: king });

  // 8. Último boletín: ambiciones secretas y el Mecenas de la Mentira.
  if (input.final) {
    const lines = input.final.objectives.map((o) =>
      say(o.met ? "casas.objetivo_cumplido" : "casas.objetivo_fallido", { jugador: name(o.house), objetivo: lowerFirst(o.text.replace(/\.$/, "")) }),
    );
    if (input.final.patron) {
      lines.push(
        `Título de Mecenas de la Mentira para ${name(input.final.patron.house)}, que ha invertido ${input.final.patron.gold} de Oro en la verdad oficial.`,
      );
    }
    sections.push({ title: "Se levantan los velos", lines });
  }

  // 9. Frases compradas y pie de patrocinio.
  const bought = input.bribes
    .filter((b) => byId.has(b.house))
    .map((b) => fill(PHRASES["soborno.frase"][b.template % PHRASES["soborno.frase"].length]!, { jugador: name(b.house) }));
  if (bought.length > 0) sections.push({ title: "Comunicados de la corte", lines: bought });
  const sponsors = input.bribes.filter((b) => byId.has(b.house)).map((b) => say("soborno.pie", { jugador: name(b.house), oro: b.amount }));

  // 10. Notas al margen: una o dos.
  const margin = [say("margen", {})];
  if (rand() < 0.5) margin.push(say("margen", {}));

  const houseConquests = combats.filter((f) => f.data.conquered && f.data.previousOwner != null).length;
  const headline = isFinal
    ? `FIN DEL INTERREGNO: ${capitalize(name(leader?.id))} SE CORONA`
    : input.previousLeader != null && leader && input.previousLeader !== leader.id
      ? `NUEVO FAVORITO: ${name(leader.id).toUpperCase()}`
      : houseConquests > 0
        ? `${houseConquests} ${houseConquests === 1 ? "CASILLA CAMBIA" : "CASILLAS CAMBIAN"} DE BANDERA`
        : houseCombats.length > 0
          ? "LAS MURALLAS AGUANTAN"
          : combats.length > 0
            ? "EL REINO SE EXPANDE"
            : "SEMANA TRANQUILA EN ALDRICIA";

  // Escandalizado con casillas robadas, adulador con favorito nuevo (o al coronarlo),
  // dormido si no pasa nada y solemne en el resto.
  const newLeader = input.previousLeader != null && leader != null && input.previousLeader !== leader.id;
  const mood: BulletinMood = isFinal || newLeader
    ? "adulador"
    : houseConquests > 0
      ? "escandalizado"
      : combats.length === 0 && input.trades.length === 0
        ? "dormido"
        : "solemne";

  return {
    week: input.week,
    headline: headline.toUpperCase(),
    mood,
    sections: sections.map((s) => ({ ...s, lines: s.lines.map(capitalize) })),
    margin,
    sponsors: sponsors.map(capitalize),
    leader: leader?.id ?? null,
    used: usedNow,
  };
}

/** Texto plano del boletín (para compartir por WhatsApp). */
export function bulletinText(b: Bulletin, gameName: string): string {
  const parts = [`*${b.headline}*`, `_Boletín del Reino · ${gameName} · semana ${b.week}_`, ""];
  for (const s of b.sections) {
    parts.push(`*${s.title}*`);
    for (const l of s.lines) parts.push(`• ${l}`);
    parts.push("");
  }
  for (const s of b.sponsors) parts.push(`_${s}_`);
  parts.push("— Fray Abundio de la Pluma Larga, Cronista Mayor del Reino");
  return parts.join("\n").trim();
}

interface CombatData {
  tile: TileId;
  winner: HouseId | null;
  previousOwner: HouseId | null;
  conquered: boolean;
  sides: { house: HouseId | null; role: "defensa" | "ataque"; strength: number; troops: number; supporters?: HouseId[] }[];
}

/** Qué tipo de frase toca a un combate y con qué cifras (las del principio del combate). */
function combatPhrase(
  d: CombatData,
  name: (id: unknown) => string,
  tile: (id: unknown) => string,
): { key: PhraseKey; vars: Record<string, string | number>; neutral: boolean } | null {
  const def = d.sides.find((s) => s.role === "defensa");
  const atk = d.sides.filter((s) => s.role === "ataque").sort((a, b) => b.strength - a.strength);
  if (d.conquered && d.previousOwner == null) {
    const w = atk.find((s) => s.house === d.winner);
    return {
      key: "combate.neutral",
      vars: { ganador: name(d.winner), casilla: tile(d.tile), n: w?.troops ?? 0, m: def?.troops ?? 0 },
      neutral: true,
    };
  }
  if (d.conquered) {
    const w = atk.find((s) => s.house === d.winner);
    const helpers = (w?.supporters ?? []).filter((h) => h !== d.winner);
    const vars = { ganador: name(d.winner), perdedor: name(d.previousOwner), casilla: tile(d.tile), n: w?.troops ?? 0, m: def?.troops ?? 0 };
    if (helpers.length > 0) return { key: "combate.apoyo_ataque", vars: { ...vars, apoyo: name(helpers[0]) }, neutral: false };
    return { key: atk.length > 1 ? "combate.tumulto" : "combate.gana_atacante", vars, neutral: false };
  }
  if (def && atk[0]) {
    // Resiste el defensor (una casa o la guarnición neutral).
    const helpers = (def.supporters ?? []).filter((h) => h !== d.winner);
    const vars = { defensor: name(d.winner), atacante: name(atk[0].house), casilla: tile(d.tile), n: def.troops, m: atk[0].troops };
    if (helpers.length > 0 && d.winner != null) return { key: "combate.apoyo_defensa", vars: { ...vars, apoyo: name(helpers[0]) }, neutral: false };
    return { key: "combate.resiste", vars, neutral: false };
  }
  return null;
}

/**
 * Una línea de Fray Abundio para un combate (repetición de la noche). La
 * variante sale de `seed`, así que la misma batalla dice siempre lo mismo.
 * `houseName`: nombre de cada casa tal cual ("Casa del Nabo").
 */
export function battleLine(
  data: Record<string, unknown>,
  houseName: (id: HouseId) => string | undefined,
  tileName: string,
  seed: string,
): string | null {
  const name = (id: unknown) => {
    const n = id == null ? undefined : houseName(id as HouseId);
    return n ? houseInSentence(n) : "la guarnición neutral";
  };
  const phrase = combatPhrase(data as unknown as CombatData, name, () => tileName);
  if (!phrase) return null;
  const all = PHRASES[phrase.key] as readonly string[];
  const pick = all[Math.floor(seededRandom(`${seed}:${phrase.key}`)() * all.length)]!;
  return fill(pick, phrase.vars);
}

function attackersOf(f: BulletinFact): (HouseId | null)[] {
  const d = f.data as unknown as CombatData;
  return d.sides.filter((s) => s.role === "ataque").map((s) => s.house);
}

const ACHIEVEMENT_NAME: Record<string, string> = {
  primera_fortaleza: "Primera fortaleza",
  obra_maestra: "Obra maestra",
  ganador_subasta: "Ganador de subasta",
};

const BUILDING_NAME: Record<string, string> = {
  granja: "Granja",
  aserradero: "Aserradero",
  cantera: "Cantera",
  mina: "Mina",
  mercado: "Mercado",
};

export function fill(template: string, vars: Record<string, string | number>): string {
  const out = template.replace(/\{([^}]+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
  // Mayúscula al empezar frase aunque la variable empiece en minúscula ("la carta…", "los Pocapena…").
  return out.replace(/([.!?]\)?\s+)([a-záéíóúñ])/g, (_m, sep: string, c: string) => sep + c.toUpperCase());
}

const FEMININE_BUILDINGS = new Set(["granja", "cantera", "mina"]);

/** Pone el edificio con su artículo bien concordado ("la Granja", "el Mercado", "Nueva Mina"). */
function withBuilding(line: string, kind: string): string {
  const label = BUILDING_NAME[kind] ?? kind;
  if (!FEMININE_BUILDINGS.has(kind)) return line.replaceAll("{edificio}", label);
  return line
    .replace(/\bEl \{edificio\}/g, `La ${label}`)
    .replace(/\bel \{edificio\}/g, `la ${label}`)
    .replace(/\bNuevo \{edificio\}/g, `Nueva ${label}`)
    .replaceAll("{edificio}", label);
}

/** Mayúscula inicial, saltando los signos de apertura ("¡cerrar…" → "¡Cerrar…"). */
function capitalize(s: string): string {
  return s.replace(/^([¡¿«"'(\s]*)(\p{L})/u, (_, lead: string, c: string) => lead + c.toUpperCase());
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
