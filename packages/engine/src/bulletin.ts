// Boletín semanal de Fray Abundio (diseño, sección 17). Se publica el domingo,
// tras la resolución, con los hechos de la semana. Las frases salen del banco
// (texts/cronista.ts) y no se repiten en la partida hasta agotar su tipo. Las
// cifras siempre son exactas; el humor va en los adjetivos.

import { CARDS, type CardKey } from "./cards";
import { gloryFromEvents } from "./combat";
import { blazon } from "./heraldry";
import { findMemories, type LoggedFact } from "./memory";
import { seededRandom } from "./random";
import { CAPTAIN, GLORY, PROCLAMATION } from "./rules";
import { PHRASES, type PhraseKey } from "./texts/cronista";
import type { CampaignEvent, HouseId, Resource, TileId, TileType } from "./types";

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
  /** Bloque 3: ya contado en la hoja volandera del miércoles (el domingo no lo repite en armas, sitios ni pactos). */
  told?: boolean;
  /** Bloque 3: resolución en la que pasó (para la memoria del cronista). */
  resolution?: number | null;
}

/** Bloque 3: los dos boletines de la semana. */
export type BulletinEdition = "domingo" | "miercoles";

/** Hechos que cuenta la hoja volandera del miércoles: el domingo ya no los repite. */
export const MIDWEEK_TYPES: readonly string[] = [
  "combate",
  "rebote",
  "choque_frontal",
  "repliegue",
  "asedio",
  "asedio_roto",
  "capitan_preso",
  "capitan_libre",
  "alianza",
  "alianza_rota",
  "alianza_fin",
  "expulsion",
];

export interface BulletinInput {
  seed: string;
  week: number;
  totalWeeks: number;
  houses: BulletinHouse[];
  /** Líder del boletín anterior (null en el primero). */
  previousLeader: HouseId | null;
  facts: BulletinFact[];
  tileNames: Map<TileId, string>;
  /** Bloque 3: tipo y dueño de cada casilla ahora (castillos que caen, emboscadas, treguas y asedios). */
  tileTypes?: Map<TileId, TileType>;
  tileOwners?: Map<TileId, HouseId | null>;
  /** Tratos cerrados esta semana (pares de casas). */
  trades: { a: HouseId; b: HouseId }[];
  /** Bloque 5: unidades que vendió la Corona esta semana, entre todas las casas (sin decir a quién). */
  crown?: Partial<Record<Resource, number>>;
  /** Sobornos de la semana: frase elegida (índice) y Oro pagado. */
  bribes: { house: HouseId; template: number; amount: number }[];
  /** Frases ya usadas en la partida ("categoria.indice"). */
  used: string[];
  /** Bloque 3: "miercoles" para la hoja volandera (titular, armas, sitios y pactos). Por defecto, el del domingo. */
  edition?: BulletinEdition;
  /**
   * Bloque 3: memoria del cronista. `past`, los hechos públicos de la partida
   * antes de este boletín; `previousRanking`, la clasificación del domingo
   * anterior (solo el domingo: remontadas y caídas).
   */
  memory?: { past: LoggedFact[]; previousRanking?: HouseId[] };
  /** Bloque 3: proclamas de la semana (solo en el del domingo), tal como las escribió cada casa. */
  proclamations?: { house: HouseId; text: string }[];
  /** Solo en el último boletín. */
  final?: {
    objectives: { house: HouseId; text: string; met: boolean }[];
    patron: { house: HouseId; gold: number } | null;
    /** Bloque 8: casa que más alianzas ha roto (título de Traidor de la Corona). */
    traitor?: { house: HouseId; broken: number } | null;
  };
}

export interface BulletinSection {
  title: string;
  lines: string[];
  /** Bloque 3: líneas que no se tocan (las proclamas). */
  verbatim?: boolean;
}

export interface Bulletin {
  week: number;
  /** Bloque 3: "miercoles" en la hoja volandera; sin este campo, el del domingo. */
  edition?: BulletinEdition;
  /** Bloque 3: la Crónica Definitiva (semana 0), que se lee en el mismo pergamino. */
  chronicle?: boolean;
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
/** Bloque 3: choques en el camino, asedios y cautivos que caben en un boletín. */
const MAX_CLASHES = 2;
const MAX_SIEGES = 3;
const MAX_CAPTAINS = 2;
const MAX_MEMORIES = 2;
/** Probabilidad de que un combate con carga, brecha, río o emboscada use su frase propia. */
const SPECIAL_CHANCE = 0.6;

export function writeBulletin(input: BulletinInput): Bulletin {
  const mid = input.edition === "miercoles";
  const rand = seededRandom(`${input.seed}:boletin:${input.week}${mid ? ":miercoles" : ""}`);
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
  const isFinal = !mid && !!input.final;
  // Lo que no se contó ya el miércoles (armas, sitios y pactos).
  const news = input.facts.filter((f) => !f.told);

  // 0. La hoja volandera abre con su entradilla.
  if (mid) sections.push({ title: "Hoja volandera", lines: [say("volandera.entrada", {})] });

  // 1. El líder: elogio, o cambio de bando si es nuevo.
  if (leader && !mid) {
    const changed = input.previousLeader != null && input.previousLeader !== leader.id;
    sections.push({
      title: changed ? "Nuevo favorito" : "El favorito del cronista",
      lines: [say(changed ? "clasificacion.nuevo_lider" : "clasificacion.lider", { "líder": name(leader.id), pv: leader.prestige })],
    });
  }

  // 2. Primer boletín: presentación de las casas.
  if (input.week === 1 && !mid) {
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
  const combats = news.filter((f) => f.type === "combate");
  const lostTile = new Set<HouseId>();
  const houseCombats = combats.filter((f) => f.data.previousOwner != null || attackersOf(f).some((a) => a != null));
  let houseLines = 0;
  let neutralLines = 0;
  let neutralSkipped = 0;
  for (const f of combats) {
    const d = f.data as unknown as CombatData;
    const phrase = combatPhrase(d, name, tile, input.tileTypes?.get(d.tile), rand());
    if (!phrase) continue;
    if (phrase.neutral) {
      // Conquista de una neutral.
      if (neutralLines >= MAX_NEUTRAL_BATTLES) {
        neutralSkipped++;
        continue;
      }
      battles.push(say(phrase.key, phrase.vars, phrase.filter));
      neutralLines++;
      continue;
    }
    // Un castillo que cae sale siempre, aunque no quepa.
    if (houseLines >= MAX_HOUSE_BATTLES && phrase.key !== "combate.castillo") continue;
    if (d.conquered) lostTile.add(d.previousOwner!);
    battles.push(say(phrase.key, phrase.vars, phrase.filter));
    houseLines++;
  }
  for (const f of news.filter((x) => x.type === "rebote").slice(0, 2)) {
    const hs = f.data.houses as HouseId[];
    battles.push(say("combate.rebote", { a: name(hs[0]), b: name(hs[1]), casilla: tile(f.data.tile) }));
  }
  // Bloque 3: choques frontales y cruces en el camino.
  for (const f of news.filter((x) => x.type === "choque_frontal" && x.data.winner != null).slice(0, MAX_CLASHES)) {
    const sides = f.data.sides as { house: HouseId }[];
    const vars = { a: name(sides[0]?.house), b: name(sides[1]?.house), ganador: name(f.data.winner) };
    battles.push(f.data.via != null ? say("combate.cruce", { ...vars, casilla: tile(f.data.via) }) : say("combate.choque", vars));
  }
  // Tropas que se quedan sin casa a la que volver (los repliegues normales no se cuentan).
  for (const f of news.filter((x) => x.type === "repliegue" && x.data.arrived === false && Number(x.data.troops) >= 2).slice(0, 1)) {
    battles.push(
      say("combate.repliegue_perdido", { jugador: name(f.data.house), casilla: tile(f.data.from), destino: tile(f.data.to), n: Number(f.data.troops) }),
    );
  }
  if (neutralSkipped > 0) {
    battles.push(`Y ${neutralSkipped} ${neutralSkipped === 1 ? "casilla neutral cambia" : "casillas neutrales cambian"} de manos, que el cronista no da abasto.`);
  }
  if (battles.length === 0) battles.push(say(mid ? "volandera.tranquila" : "reino.tranquila", {}));
  sections.push({ title: combats.length > 0 ? "Crónica de las armas" : "La paz del reino", lines: battles });

  // 3b. Bloque 3: asedios y Capitanes.
  const sieges: string[] = [];
  const besieged = (t: unknown) => name(input.tileOwners?.get(t as TileId) ?? null);
  // Solo cuentan los asedios a otra casa: los de una guarnición neutral no son noticia.
  const againstHouse = (f: BulletinFact) => input.tileOwners?.get(f.data.tile as TileId) != null;
  const siegeFacts = news.filter((x) => x.type === "asedio" && againstHouse(x));
  const lastNights = new Map<TileId, number>();
  for (const f of siegeFacts) lastNights.set(f.data.tile as TileId, Number(f.data.nights));
  for (const f of siegeFacts.filter((x) => Number(x.data.nights) === 1).slice(0, 2)) {
    sieges.push(say("asedio.empieza", { sitiador: name(f.data.house), sitiado: besieged(f.data.tile), casilla: tile(f.data.tile) }));
  }
  // El asedio más largo que sigue en pie (de 3 noches o más).
  const broken = news.filter((x) => x.type === "asedio_roto" && againstHouse(x));
  const brokenTiles = new Set(broken.map((f) => f.data.tile as TileId));
  const longest = [...lastNights.entries()]
    .filter(([t, n]) => n >= 3 && !brokenTiles.has(t))
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  if (longest && sieges.length < MAX_SIEGES) {
    const f = [...siegeFacts].reverse().find((x) => x.data.tile === longest[0])!;
    sieges.push(say("asedio.sigue", { sitiador: name(f.data.house), sitiado: besieged(longest[0]), casilla: tile(longest[0]), noches: longest[1] }));
  }
  for (const f of broken.filter((x) => x.data.reason !== "tomada")) {
    if (sieges.length >= MAX_SIEGES) break;
    const nights = lastNights.get(f.data.tile as TileId);
    const vars = { sitiador: name(f.data.house), sitiado: besieged(f.data.tile), casilla: tile(f.data.tile), jugador: "alguien", noches: nights ?? 0 };
    // Sin saber quién atacó ni cuántas noches duró, se evitan las variantes que lo dicen.
    const ok = (t: string) => !t.includes("{jugador}") && (nights != null || !t.includes("{noches}"));
    sieges.push(say(f.data.reason === "cortado" ? "asedio.cortado" : "asedio.levantado", vars, ok));
  }
  const captured = new Map<HouseId, HouseId>();
  let captainLines = 0;
  for (const f of news.filter((x) => x.type === "capitan_preso" || x.type === "capitan_libre")) {
    const house = f.data.house as HouseId;
    if (f.type === "capitan_preso") captured.set(house, f.data.by as HouseId);
    if (captainLines >= MAX_CAPTAINS) continue;
    const captor = f.type === "capitan_preso" ? (f.data.by as HouseId) : ((f.data.by as HouseId | undefined) ?? captured.get(house));
    const vars = { jugador: name(house), captor: name(captor), casilla: tile(f.data.tile), oro: Number(f.data.oro ?? 0), noches: CAPTAIN.escapeAfter };
    const key: PhraseKey | null =
      f.type === "capitan_preso"
        ? "capitan.preso"
        : f.data.reason === "fuga"
          ? "capitan.fuga"
          : f.data.reason === "rescate"
            ? "capitan.rescate"
            : f.data.reason === "liberado"
              ? "capitan.liberado"
              : null;
    // La huida (perder contra una guarnición neutral) no dice dónde: se queda en la repetición.
    if (!key) continue;
    sieges.push(say(key, vars, (t) => captor != null || !t.includes("{captor}")));
    captainLines++;
  }
  if (sieges.length > 0) sections.push({ title: "Sitios y cautivos", lines: sieges });

  // 3c. Bloque 3: la memoria del cronista (dos recuerdos como mucho).
  if (input.memory) {
    const memories = findMemories({
      past: input.memory.past,
      now: news,
      ...(mid || !input.memory.previousRanking ? {} : { previousRanking: input.memory.previousRanking, ranking: ranking.map((h) => h.id) }),
    }).slice(0, MAX_MEMORIES);
    const lines = memories.map((m) => {
      const vars: Record<string, string | number> = { ...m.numbers };
      for (const [k, h] of Object.entries(m.houses)) vars[k] = name(h);
      for (const [k, t] of Object.entries(m.tiles)) vars[k] = tile(t);
      // Sin la cifra o la casa que pide una variante, se usa otra.
      return say(m.key, vars, (t) => [...t.matchAll(/\{([^}]+)\}/g)].every((x) => x[1]! in vars));
    });
    if (lines.length > 0) sections.push({ title: "La memoria del cronista", lines });
  }

  // 4. Economía: evento, subasta y comercio (solo el domingo).
  const economy: string[] = [];
  if (!mid) {
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
  }
  if (economy.length > 0) sections.push({ title: "Mercados y augurios", lines: economy });

  // 4a. Bloque 3: la Corona (ayuda al último, Treguas y Paz del Rey).
  const crownLines: string[] = [];
  if (!mid) {
    for (const f of input.facts.filter((x) => x.type === "ayuda_ultimo").slice(-1)) {
      crownLines.push(say("corona.ayuda", { jugador: name(f.data.house) }));
    }
    for (const f of input.facts.filter((x) => x.type === "tregua").slice(0, 1)) {
      const owner = input.tileOwners?.get(f.data.tile as TileId);
      crownLines.push(say("corona.tregua", { jugador: name(owner), casilla: tile(f.data.tile) }, (t) => owner != null || !t.includes("{jugador}")));
    }
    for (const f of input.facts.filter((x) => x.type === "paz").slice(0, 1)) {
      crownLines.push(say("corona.paz", { casilla: tile(f.data.tile) }));
    }
  }
  if (crownLines.length > 0) sections.push({ title: "Por orden de la Corona", lines: crownLines });

  // 4b. Bloque 8: alianzas firmadas, rotas y terminadas, y tropas que vuelven a casa.
  const pacts: string[] = [];
  const pactName = (d: Record<string, unknown>) => String(d.name ?? "alianza sin nombre");
  for (const f of news.filter((x) => x.type === "alianza")) {
    pacts.push(say("diplomacia.pacto", { pacto: pactName(f.data), a: name(f.data.a), b: name(f.data.b) }));
  }
  const breaks = news.filter((x) => x.type === "alianza_rota");
  for (const f of breaks) {
    pacts.push(say("diplomacia.ruptura", { pacto: pactName(f.data), traidor: name(f.data.by) }));
  }
  for (const f of news.filter((x) => x.type === "alianza_fin")) {
    pacts.push(say("diplomacia.fin", { pacto: pactName(f.data), a: name(f.data.a), b: name(f.data.b) }));
  }
  for (const f of news.filter((x) => x.type === "expulsion").slice(0, 2)) {
    pacts.push(say("diplomacia.expulsion", { jugador: name(f.data.house), n: Number(f.data.troops), casilla: tile(f.data.from) }));
  }
  if (pacts.length > 0) sections.push({ title: "Pactos y traiciones", lines: pacts });

  // 5. Obras y logros (solo el domingo, con toda la semana).
  const works: string[] = [];
  if (!mid) {
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
    // Bloque 3: ruinas exploradas y Gloria.
    for (const f of input.facts.filter((x) => x.type === "ruinas").slice(0, 2)) {
      works.push(say("reino.ruinas", { jugador: name(f.data.house), casilla: tile(f.data.tile), premio: prizeText(f.data.prize) }));
    }
    if (GLORY.enabled) {
      const events = input.facts.filter((x) => x.type === "combate" || x.type === "choque_frontal").map((x) => ({ ...x.data, type: x.type }) as unknown as CampaignEvent);
      const top = [...gloryFromEvents(events).entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
      if (top && top[1] >= 2) works.push(say("gloria.semana", { jugador: name(top[0]), gloria: top[1] }));
      const honor = events.find(
        (e) => e.type === "combate" && e.conquered && honorable(e as unknown as CombatData),
      ) as unknown as CombatData | undefined;
      if (honor) works.push(say("gloria.honor", { jugador: name(honor.previousOwner), ganador: name(honor.winner), casilla: tile(honor.tile) }));
    }
  }
  if (works.length > 0) sections.push({ title: "Obras y honores", lines: works });

  // 6. Las casas: el lema contra la realidad y el último.
  const houses: string[] = [];
  if (!mid) {
    const contradicted = input.houses.find((h) => h.motto && lostTile.has(h.id));
    if (contradicted) houses.push(say("casas.lema", { jugador: name(contradicted.id), lema: contradicted.motto! }));
    if (last && !isFinal) houses.push(say("clasificacion.ultimo", { "último": name(last.id), pv: last.prestige }));
  }
  if (houses.length > 0) sections.push({ title: "Noticias de las casas", lines: houses });

  // 7. El difunto rey: la versión oficial de su muerte (una vez por partida) o su fantasma.
  const king: string[] = [];
  // Entre la semana 2 y la penúltima (con "semanas" en plural).
  const deathWeek = 2 + Math.floor(seededRandom(`${input.seed}:muerte`)() * Math.max(1, input.totalWeeks - 2));
  if (mid) {
    // La hoja volandera no habla del difunto rey.
  } else if (input.week === deathWeek) king.push(say("rey.muerte", { semanas: input.week }));
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
    if (input.final.traitor) {
      const n = input.final.traitor.broken;
      lines.push(
        `Título de Traidor de la Corona para ${name(input.final.traitor.house)}, que ha roto ${n} ${n === 1 ? "alianza" : "alianzas"}. El cronista lo dice con admiración, o casi.`,
      );
    }
    if (input.final.patron) {
      lines.push(
        `Título de Mecenas de la Mentira para ${name(input.final.patron.house)}, que ha invertido ${input.final.patron.gold} de Oro en la verdad oficial.`,
      );
    }
    sections.push({ title: "Se levantan los velos", lines });
  }

  // 8 bis. Bloque 3: proclamas de las casas, firmadas y sin tocar (solo el domingo).
  const proclaimed = mid ? [] : (input.proclamations ?? []).filter((p) => byId.has(p.house) && p.text.trim() !== "");
  if (proclaimed.length > 0) {
    const lines = [say("proclamas.entrada", {})];
    // Tras la primera que nombra a otra casa con «@», el cronista se desmarca (una vez).
    let noted = false;
    for (const p of proclaimed) {
      lines.push(`«${p.text.trim()}» (firma ${name(p.house)})`);
      const others = input.houses.filter((h) => h.id !== p.house);
      if (!noted && proclamationMentions(p.text, others).length > 0) {
        lines.push(say("proclamas.nota", {}));
        noted = true;
      }
    }
    sections.push({ title: "Proclamas", lines, verbatim: true });
  }

  // 9. Frases compradas y pie de patrocinio.
  const bought = mid ? [] : input.bribes
    .filter((b) => byId.has(b.house))
    .map((b) => fill(PHRASES["soborno.frase"][b.template % PHRASES["soborno.frase"].length]!, { jugador: name(b.house) }));
  if (bought.length > 0) sections.push({ title: "Comunicados de la corte", lines: bought });
  const sponsors = (mid ? [] : input.bribes).filter((b) => byId.has(b.house)).map((b) => say("soborno.pie", { jugador: name(b.house), oro: b.amount }));

  // 10. Notas al margen: una o dos.
  const margin = [say("margen", {})];
  if (!mid && rand() < 0.5) margin.push(say("margen", {}));

  const houseConquests = combats.filter((f) => f.data.conquered && f.data.previousOwner != null).length;
  const fallenCastle = combats.find((f) => castleFalls(f.data as unknown as CombatData, input.tileTypes?.get(f.data.tile as TileId)));
  const headline = isFinal
    ? `FIN DEL INTERREGNO: ${capitalize(name(leader?.id))} SE CORONA`
    : fallenCastle
      ? `CAE EL CASTILLO DE ${name(fallenCastle.data.previousOwner)}`
    : !mid && input.previousLeader != null && leader && input.previousLeader !== leader.id
      ? `NUEVO FAVORITO: ${name(leader.id).toUpperCase()}`
      : houseConquests > 0
        ? `${houseConquests} ${houseConquests === 1 ? "CASILLA CAMBIA" : "CASILLAS CAMBIAN"} DE BANDERA`
        : breaks.length > 0
          ? breaks.length === 1 ? "PACTO ROTO EN EL REINO" : `${breaks.length} PACTOS ROTOS EN EL REINO`
          : houseCombats.length > 0
          ? "LAS MURALLAS AGUANTAN"
          : combats.length > 0
            ? "EL REINO SE EXPANDE"
            : mid
              ? "MITAD DE SEMANA TRANQUILA"
              : "SEMANA TRANQUILA EN ALDRICIA";

  // Escandalizado con casillas robadas, adulador con favorito nuevo (o al coronarlo),
  // dormido si no pasa nada y solemne en el resto.
  const newLeader = !mid && input.previousLeader != null && leader != null && input.previousLeader !== leader.id;
  const mood: BulletinMood = isFinal || newLeader
    ? "adulador"
    : houseConquests > 0 || breaks.length > 0 || fallenCastle
      ? "escandalizado"
      : combats.length === 0 && (mid || input.trades.length === 0)
        ? "dormido"
        : "solemne";

  return {
    week: input.week,
    ...(mid ? { edition: "miercoles" as const } : {}),
    headline: headline.toUpperCase(),
    mood,
    // Las proclamas salen tal cual las escribió cada casa.
    sections: sections.map((s) => (s.verbatim ? s : { ...s, lines: s.lines.map(capitalize) })),
    margin,
    sponsors: sponsors.map(capitalize),
    leader: leader?.id ?? null,
    used: usedNow,
  };
}

/**
 * Bloque 3: comprueba una proclama. Quita los espacios de los lados y los
 * saltos de línea; vacía significa retirarla. Cuenta letras, no bytes.
 */
export function checkProclamation(raw: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = raw.replace(/\s+/g, " ").trim();
  if ([...text].length > PROCLAMATION.maxLetters) return { ok: false, error: `Como mucho ${PROCLAMATION.maxLetters} letras.` };
  if (/https?:|www\.|\b[\w-]+\.(com|es|net|org|io|me|ly|gl)\b/i.test(text)) return { ok: false, error: "Sin enlaces: el cronista solo publica palabras." };
  return { ok: true, text };
}

/** Texto plano del boletín (para compartir por WhatsApp). */
export function bulletinText(b: Bulletin, gameName: string): string {
  const kind = b.edition === "miercoles" ? "Hoja volandera" : "Boletín del Reino";
  const parts = [`*${b.headline}*`, `_${kind} · ${gameName} · semana ${b.week}_`, ""];
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
  sides: {
    house: HouseId | null;
    role: "defensa" | "ataque";
    strength: number;
    troops: number;
    supporters?: HouseId[];
    joint?: HouseId[];
    river?: boolean;
    charge?: boolean;
    breach?: boolean;
  }[];
}

/** Un castillo que cae en manos de otra casa (bloque 3). */
function castleFalls(d: CombatData, type: TileType | undefined): boolean {
  return type === "castillo" && d.conquered && d.previousOwner != null;
}

/** Derrota con honor: quien defendía perdió contra el doble de fuerza o más (la regla de gloryFromEvents). */
function honorable(d: CombatData): boolean {
  const def = d.sides.find((s) => s.role === "defensa");
  // Sin tropas en la casilla no hay resistencia que cantar.
  if (!def || def.house == null || def.troops === 0) return false;
  const winners = [d.winner, ...(d.sides.find((s) => s.house === d.winner)?.joint ?? [])];
  const top = d.sides.filter((s) => s.role === "ataque" && winners.includes(s.house)).reduce((a, s) => a + s.strength, 0);
  return def.strength * 2 <= top;
}

/** "12 de Oro" o "la carta Tregua" (premio de unas ruinas). */
function prizeText(prize: unknown): string {
  const p = prize as { kind: string; resource?: Resource; amount?: number; card?: CardKey };
  if (p.kind === "carta") return `la carta ${CARDS[p.card!]?.nombre ?? p.card}`;
  return `${p.amount} de ${RESOURCE_NAMES[p.resource!] ?? p.resource}`;
}

/** Qué tipo de frase toca a un combate y con qué cifras (las del principio del combate). */
function combatPhrase(
  d: CombatData,
  name: (id: unknown) => string,
  tile: (id: unknown) => string,
  /** Bloque 3: tipo de la casilla y una tirada de 0 a 1 para usar (o no) la frase de la carga, la brecha, el río o la emboscada. */
  type?: TileType,
  roll = 1,
): { key: PhraseKey; vars: Record<string, string | number>; neutral: boolean; filter?: (t: string) => boolean } | null {
  const def = d.sides.find((s) => s.role === "defensa");
  const atk = d.sides.filter((s) => s.role === "ataque").sort((a, b) => b.strength - a.strength);
  const special = roll < SPECIAL_CHANCE;
  if (castleFalls(d, type)) {
    const w = atk.find((s) => s.house === d.winner);
    return {
      key: "combate.castillo",
      vars: { ganador: name(d.winner), perdedor: name(d.previousOwner), casilla: tile(d.tile), n: w?.troops ?? 0, m: def?.troops ?? 0 },
      neutral: false,
    };
  }
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
    // Bloque 8: ataque conjunto de dos aliados.
    const partner = w?.joint?.[0];
    if (partner != null) {
      const band = atk.filter((s) => s.house === d.winner || w!.joint!.includes(s.house as HouseId));
      return {
        key: "combate.conjunto",
        vars: { ganador: name(d.winner), apoyo: name(partner), perdedor: name(d.previousOwner), casilla: tile(d.tile), n: band.reduce((a, s) => a + s.troops, 0), m: def?.troops ?? 0 },
        neutral: false,
      };
    }
    const helpers = (w?.supporters ?? []).filter((h) => h !== d.winner);
    const vars = { ganador: name(d.winner), perdedor: name(d.previousOwner), casilla: tile(d.tile), n: w?.troops ?? 0, m: def?.troops ?? 0 };
    if (helpers.length > 0) return { key: "combate.apoyo_ataque", vars: { ...vars, apoyo: name(helpers[0]) }, neutral: false };
    if (special && atk.length === 1 && w?.breach) return { key: "combate.brecha", vars, neutral: false };
    if (special && atk.length === 1 && w?.charge) return { key: "combate.carga", vars, neutral: false };
    if (special && atk.length === 1 && w?.river) return { key: "combate.rio", vars, neutral: false, filter: (t) => t.includes("{ganador}") };
    return { key: atk.length > 1 ? "combate.tumulto" : "combate.gana_atacante", vars, neutral: false };
  }
  if (def && atk[0]?.joint?.length && d.winner != null) {
    // Bloque 8: resiste un ataque conjunto.
    const band = atk.filter((s) => s.house === atk[0]!.house || atk[0]!.joint!.includes(s.house as HouseId));
    return {
      key: "combate.conjunto_resiste",
      vars: { defensor: name(d.winner), atacante: name(atk[0].house), apoyo: name(atk[0].joint[0]), casilla: tile(d.tile), n: def.troops, m: band.reduce((a, s) => a + s.troops, 0) },
      neutral: false,
    };
  }
  if (def && atk[0]) {
    // Resiste el defensor (una casa o la guarnición neutral).
    const helpers = (def.supporters ?? []).filter((h) => h !== d.winner);
    const vars = { defensor: name(d.winner), atacante: name(atk[0].house), casilla: tile(d.tile), n: def.troops, m: atk[0].troops };
    if (helpers.length > 0 && d.winner != null) return { key: "combate.apoyo_defensa", vars: { ...vars, apoyo: name(helpers[0]) }, neutral: false };
    if (special && d.winner != null && type === "bosque") return { key: "combate.emboscada", vars, neutral: false };
    if (special && d.winner != null && atk[0].river) return { key: "combate.rio", vars, neutral: false, filter: (t) => !t.includes("{ganador}") };
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

/**
 * Bloque 3: casas que nombra una proclama. Se nombran como en WhatsApp, con
 * «@» y el nombre tal cual («@Casa del Nabo»); da igual mayúsculas o tildes.
 */
export function proclamationMentions<T extends { name: string }>(text: string, houses: T[]): T[] {
  const plain = (t: string) => t.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const body = plain(text);
  return houses.filter((h) => body.includes(`@${plain(h.name)}`));
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
