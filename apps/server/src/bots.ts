// Bots con personalidad en las partidas (`docs/bots.md`). El cerebro está en
// el motor (packages/engine/src/ai); aquí se lee lo que vería cada bot y se
// guarda lo que decide. Lo usan igual las partidas de prueba (`pruebas.ts`,
// con su reloj simulado) y las reales (`runBotJobs`, desde el cron), en el
// mismo orden que el simulador.
import {
  ALLIANCE,
  ALLIANCE_BOTS,
  BOT_TRADE,
  PERSONALITY_NAMES,
  PROCLAMATION,
  answerMention,
  planBribe,
  planErrata,
  planProclamation,
  proclamationMentions,
  type VoiceContext,
  counterOffer,
  houseInSentence,
  noticeText,
  offerNote,
  totalOf,
  withdrawOffer,
  answerDelayHours,
  forgetsOrders,
  seededRandom,
  shuffle,
  withLevel,
  type BotLevel,
  botHour,
  alliesOf,
  planDiplomacy,
  ANY_ORIGIN,
  recruitSite,
  BATTLE_TWEAKS,
  CAPTAIN,
  botPaysRansom,
  botRansomPrice,
  PERSONALITIES,
  PRESTIGE,
  BRIBE_COST,
  chooseObjective,
  eventCombat,
  eventOfWeek,
  eventUpkeepFactor,
  localDate,
  offerGain,
  planBids,
  planCards,
  planCrown,
  planMercenaries,
  MERCENARIES,
  mercenaryCost,
  planDay,
  CROWN_GOODS,
  ECONOMY_TWEAKS,
  planOrders,
  proposeOffer,
  resolutionInfo,
  withRhythm,
  situation,
  type AiView,
  type OfferPlan,
  type CardEffect,
  type CardKey,
  type BuildingKind,
  type Alliance,
  type HouseId,
  type ObjectiveKey,
  type Order,
  type Personality,
  type PersonalityName,
  type Tile,
} from "@reyes/engine";
import { ransomStatements } from "./rescate";
import { crownCost, crownMarket, crownPurchaseStatements } from "./corona";
import { hireStatements } from "./mercenarios";
import { hashCode, randomCode } from "./auth";
import { COLORS, pickShield } from "./heraldry";
import { clockOf, orderOf, ORDER_COLUMNS, type OrderRow } from "./jobs";
import { dueBotJobs, ordersOpen } from "./scheduler";
import { acceptAlliance, breakAlliance, cooling, declineAlliance, proposeAlliance } from "./alianzas";
import type { NotifyEnv } from "./notify";
import { acceptOffer, bundle, insertOfferStatement, type OfferRow } from "./offers";
import { notifyHouses } from "./notify";
import { lotOf, openAuctionWeek, useCardStatements, type CardRow, type LotRow } from "./subasta";
import {
  computeAllPrestige,
  gameNow,
  loadBuildings,
  loadGame,
  loadHouses,
  loadTiles,
  resourcesOf,
  toEngineTiles,
  type GameRow,
  type HouseRow,
  rhythmOf,
  loadAlliances,
  toEngineAlliances,
  type AllianceRow,
} from "./state";


/** Nombres y lemas de las casas bot (la personalidad va aparte: no se adivina por el nombre). */
export const BOT_HOUSES: { name: string; motto: string }[] = [
  { name: "Casa del Nabo", motto: "Raíces profundas, ideas cortas" },
  { name: "Gallina Bélica", motto: "Cacarea fuerte, corre más" },
  { name: "Los Pocapena", motto: "Ya si eso, mañana" },
  { name: "Barones del Barro", motto: "Del barro venimos" },
  { name: "Señores del Pato", motto: "Ni frío ni calor" },
  { name: "Duques del Queso", motto: "Cuanto más curado, mejor" },
  { name: "Caracol Veloz", motto: "Llegaremos" },
  { name: "Condes de la Siesta", motto: "Después de comer, ya veremos" },
  { name: "Casa Berenjena", motto: "Morada y orgullosa" },
  { name: "Marqueses del Botijo", motto: "Agua fresca, cabeza fría" },
  { name: "Los Tresmentiras", motto: "Palabra de honor, casi siempre" },
  { name: "Hidalgos del Puchero", motto: "Lo que no mata, engorda" },
  { name: "Vizcondes del Bache", motto: "Por mal camino, pero juntos" },
  { name: "Casa Sinblanca", motto: "Pobres pero con escudo" },
];

/** Personalidad de un bot con la de su nivel (los creados antes de que existieran, estrategas y normales). */
function personalityOf(h: HouseRow): Personality {
  const base = PERSONALITIES[(h.bot_personality ?? "estratega") as PersonalityName] ?? PERSONALITIES.estratega;
  return withLevel(base, h.bot_level as BotLevel | null);
}

/**
 * Bots que juegan solos: todos menos el que estés manejando en una prueba.
 * Con `only`, solo esos (en las partidas reales cada bot juega su día a su hora).
 */
function activeBots(houses: HouseRow[], game: GameRow, only?: ReadonlySet<HouseId>): HouseRow[] {
  return houses.filter((h) => h.is_bot === 1 && h.id !== game.played_house_id && (!only || only.has(h.id)));
}

/**
 * ¿Ha pasado ya el rato que tarda el bot en contestar a algo creado en `at`?
 * `now` nulo: contesta ya (partidas de prueba, donde el reloj salta).
 */
function answered(game: GameRow, now: Date | null, h: HouseRow, what: string, at: string): boolean {
  if (!now) return true;
  return now.getTime() - Date.parse(at) >= answerDelayHours(game.seed, h.id, what) * 3600 * 1000;
}

export interface BotEnv extends NotifyEnv {
  SESSION_SECRET: string;
}

/**
 * Rescates (bloque 4), antes de las acciones del día como en el simulador: los
 * bots que tienen un Capitán preso piden su precio (menos cuanto más cerca está
 * la fuga) y los bots con el Capitán preso pagan si les compensa, también lo
 * que pida una persona.
 */
async function botRansoms(db: D1Database, game: GameRow, only?: ReadonlySet<HouseId>): Promise<void> {
  if (!CAPTAIN.enabled || !BATTLE_TWEAKS.captainAlone) return;
  const houses = await loadHouses(db, game.id);
  const bots = new Set(activeBots(houses, game, only).map((h) => h.id));
  const next = game.current_resolution + 1;
  for (const h of houses) {
    if (h.captain_captured_by == null || h.captain_free_at == null) continue;
    const nightsLeft = h.captain_free_at - next;
    let price = h.captain_ransom;
    if (bots.has(h.captain_captured_by)) {
      price = botRansomPrice(nightsLeft);
      if (price !== h.captain_ransom) {
        await db.prepare("UPDATE houses SET captain_ransom = ? WHERE id = ? AND captain_captured_by = ?").bind(price, h.id, h.captain_captured_by).run();
      }
    }
    if (price == null || !bots.has(h.id) || !botPaysRansom(price, h.oro, nightsLeft)) continue;
    const castle = await db.prepare("SELECT id FROM tiles WHERE game_id = ? AND castle_of = ?").bind(game.id, h.id).first<{ id: number }>();
    await db.batch(ransomStatements(db, game.id, h.id, h.captain_captured_by, price, castle?.id ?? null)).catch((err) => console.error(`Rescate de ${h.name}:`, err));
  }
}

/** Lo que se puede elegir al añadir un bot desde la sala de espera (sin personalidad: al azar). */
export interface BotChoice {
  personality?: PersonalityName | null;
  level?: BotLevel | null;
}

/**
 * Personalidad para un bot nuevo: la elegida o, al azar, una de las menos
 * usadas en la partida (no se repite hasta agotarlas). El azar sale de la
 * semilla de la partida y del número de casas, así que es reproducible.
 */
export function pickPersonality(seed: string, houses: Pick<HouseRow, "is_bot" | "bot_personality">[], chosen?: PersonalityName | null): PersonalityName {
  if (chosen) return chosen;
  const used = (p: PersonalityName) => houses.filter((h) => h.is_bot === 1 && h.bot_personality === p).length;
  const fewest = Math.min(...PERSONALITY_NAMES.map(used));
  const options = PERSONALITY_NAMES.filter((p) => used(p) === fewest);
  return shuffle(options, seededRandom(`${seed}:bot-personalidad:${houses.length}`))[0]!;
}

/** Añade bots hasta tener `count` (y nunca más de 8 casas). Devuelve las casas resultantes. */
export async function addBots(env: BotEnv, gameId: number, count: number, choice: BotChoice = {}): Promise<HouseRow[]> {
  const db = env.DB;
  const game = (await loadGame(db, gameId))!;
  let houses = await loadHouses(db, gameId);
  const wanted = Math.min(count, 8 - houses.length);
  for (let i = 0; i < wanted; i++) {
    const color = COLORS.find((c) => !houses.some((h) => h.color === c))!;
    const free = BOT_HOUSES.filter((b) => !houses.some((h) => h.name === b.name));
    const who = free.length
      ? shuffle(free, seededRandom(`${game.seed}:bot-nombre:${houses.length}`))[0]!
      : { name: `Casa sin nombre ${houses.length + 1}`, motto: "" };
    const personality = pickPersonality(game.seed, houses, choice.personality);
    const level = choice.level && choice.level !== "normal" ? choice.level : null;
    const shield = pickShield(houses);
    // Cada bot es un usuario con un código que nadie conoce: no se puede entrar con él.
    const user = await db
      .prepare("INSERT INTO users (display_name, login_code_hash) VALUES (?, ?) RETURNING id")
      .bind(`Bot ${who.name}`, await hashCode(randomCode(12), env.SESSION_SECRET))
      .first<{ id: number }>();
    await db
      .prepare(
        "INSERT INTO houses (game_id, user_id, name, color, shield_shape, shield_division, color2, symbol, metal, motto, is_bot, bot_personality, bot_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
      )
      .bind(
        gameId,
        user!.id,
        who.name,
        color,
        shield.shape,
        shield.division,
        shield.division === "pleno" ? null : shield.color2 === color ? COLORS.find((c) => c !== color)! : shield.color2,
        shield.symbol,
        shield.metal,
        who.motto || null,
        personality,
        level,
      )
      .run();
    houses = await loadHouses(db, gameId);
  }
  return houses;
}

/** Quita un bot de la sala de espera, con su usuario. */
export async function removeBot(db: D1Database, gameId: number, houseId: HouseId): Promise<boolean> {
  const house = (await loadHouses(db, gameId)).find((h) => h.id === houseId && h.is_bot === 1);
  if (!house) return false;
  await db.batch([
    db.prepare("DELETE FROM houses WHERE id = ? AND game_id = ? AND is_bot = 1").bind(houseId, gameId),
    db.prepare("DELETE FROM users WHERE id = ?").bind(house.user_id),
  ]);
  return true;
}


/** Lo que necesitan los bots para decidir, leído una vez por paso. */
interface BotContext {
  game: GameRow;
  houses: HouseRow[];
  tiles: Tile[];
  buildings: Map<HouseId, Record<BuildingKind, number>>;
  prestige: { house: HouseId; total: number }[];
  partners: Map<HouseId, HouseId[]>;
  /** Con quién cerró cada casa cada trato (válido o no) de los últimos 7 días. */
  tradesWith: Map<HouseId, HouseId[]>;
  day: number;
  cards: CardRow[];
  lotsWon: Map<HouseId, number>;
  /** Bloque 8: alianzas en vigor o en aviso y quién ha atacado a quién hace poco. */
  alliances: Alliance[];
  attacks: { attacker: HouseId; defender: HouseId }[];
}

async function botContext(db: D1Database, game: GameRow): Promise<BotContext> {
  const now = gameNow(game);
  const since = new Date(now.getTime() - PRESTIGE.tradeWindowDays * 864e5).toISOString();
  // Rencillas de los bots (bloque 8): ataques de los últimos `grudgeDays` días, en resoluciones.
  const grudge = Math.ceil((ALLIANCE_BOTS.grudgeDays * rhythmOf(game).days.length) / 7);
  const [houses, tileRows, buildings, trades, cards, lots, allianceRows, combats] = await Promise.all([
    loadHouses(db, game.id),
    loadTiles(db, game.id),
    loadBuildings(db, game.id),
    db.prepare("SELECT house_a, house_b, valid FROM trades WHERE game_id = ? AND at >= ?")
      .bind(game.id, since)
      .all<{ house_a: number; house_b: number; valid: number }>(),
    db.prepare("SELECT id, house_id, card_key, used_at, used_params FROM cards WHERE game_id = ?").bind(game.id).all<CardRow>(),
    db.prepare("SELECT winner_house_id AS house, COUNT(*) AS n FROM auction_lots WHERE game_id = ? AND winner_house_id IS NOT NULL GROUP BY winner_house_id")
      .bind(game.id)
      .all<{ house: number; n: number }>(),
    loadAlliances(db, game.id),
    db.prepare(
      "SELECT e.payload FROM event_log e JOIN resolutions r ON r.id = e.resolution_id WHERE e.game_id = ? AND e.type = 'combate' AND r.number > ?",
    )
      .bind(game.id, game.current_resolution - grudge)
      .all<{ payload: string }>(),
  ]);
  const tiles = toEngineTiles(tileRows);
  const attacks: { attacker: HouseId; defender: HouseId }[] = [];
  for (const c of combats.results) {
    const e = JSON.parse(c.payload) as { sides: { house: HouseId | null; role: string }[] };
    const def = e.sides.find((x) => x.role === "defensa")?.house;
    if (def == null) continue;
    for (const x of e.sides) if (x.role === "ataque" && x.house != null) attacks.push({ attacker: x.house, defender: def });
  }
  const prestige = await computeAllPrestige(db, game.id, houses, tiles, now);
  const partners = new Map<HouseId, HouseId[]>();
  const tradesWith = new Map<HouseId, HouseId[]>();
  for (const t of trades.results) {
    tradesWith.set(t.house_a, [...(tradesWith.get(t.house_a) ?? []), t.house_b]);
    tradesWith.set(t.house_b, [...(tradesWith.get(t.house_b) ?? []), t.house_a]);
    if (t.valid !== 1) continue;
    partners.set(t.house_a, [...new Set([...(partners.get(t.house_a) ?? []), t.house_b])]);
    partners.set(t.house_b, [...new Set([...(partners.get(t.house_b) ?? []), t.house_a])]);
  }
  const today = localDate(now, game.timezone);
  const day = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${game.start_date}T12:00:00Z`)) / 864e5);
  return {
    game,
    houses,
    tiles,
    buildings,
    prestige: [...prestige].map(([house, p]) => ({ house, total: p.total })),
    partners,
    tradesWith,
    day,
    cards: cards.results,
    lotsWon: new Map(lots.results.map((l) => [l.house, l.n])),
    alliances: toEngineAlliances(allianceRows),
    attacks,
  };
}

function cardEffect(c: CardRow): CardEffect {
  return c.used_params ? ((JSON.parse(c.used_params) as { effect?: CardEffect }).effect ?? {}) : {};
}

function botView(ctx: BotContext, h: HouseRow): AiView {
  const g = ctx.game;
  const helpActive = h.help_until_resolution != null && h.help_until_resolution > g.current_resolution;
  return {
    house: h.id,
    tiles: ctx.tiles,
    buildings: ctx.buildings.get(h.id)!,
    resources: resourcesOf(h),
    nextResolution: g.current_resolution + 1,
    captainTile: h.captain_tile,
    day: ctx.day,
    totalDays: g.weeks * 7,
    objective: (h.objective_key as ObjectiveKey | null) ?? null,
    prestige: ctx.prestige,
    recentPartners: ctx.partners.get(h.id) ?? [],
    tradesWith: ctx.tradesWith.get(h.id) ?? [],
    help: helpActive ? (h.help_resource ?? "pan") : null,
    spied: ctx.cards
      .filter((c) => c.house_id === h.id && c.used_at)
      .map(cardEffect)
      .filter((e) => e.spy && e.spy.until > g.current_resolution)
      .map((e) => e.spy!.house),
    attackBonus: ctx.cards
      .filter((c) => c.house_id === h.id && c.used_at)
      .map(cardEffect)
      .reduce((a, e) => a + (e.drums && e.drums.resolution === g.current_resolution + 1 ? e.drums.bonus : 0), 0),
    auctionsWon: ctx.lotsWon.get(h.id) ?? 0,
    // Bloque 8: el registro de alianzas es público; los ataques recibidos, también.
    alliances: ctx.alliances,
    attackedBy: [...new Set(ctx.attacks.filter((a) => a.defender === h.id).map((a) => a.attacker))],
    // Evento anunciado el martes por la noche: combate del miércoles y mantenimiento del domingo.
    ...(() => {
      const week = Math.floor(ctx.day / 7) + 1;
      if (ctx.day % 7 < 2 || week > g.weeks) return {};
      const ev = eventOfWeek(g.seed, week);
      return {
        combat: resolutionInfo(g.current_resolution + 1, rhythmOf(g).days).kind === "miercoles" ? eventCombat(ev) : undefined,
        upkeepFactor: eventUpkeepFactor(ev),
      };
    })(),
  };
}

/** Cartas en la mano de un bot. */
function handOf(ctx: BotContext, h: HouseRow): CardRow[] {
  return ctx.cards.filter((c) => c.house_id === h.id && !c.used_at);
}

/** El bot usa las cartas que le convienen ahora. */
async function botPlaysCards(db: D1Database, game: GameRow, ctx: BotContext, h: HouseRow, resolutionDay: boolean): Promise<void> {
  const hand = handOf(ctx, h);
  if (hand.length === 0) return;
  const s = situation(botView(ctx, h), personalityOf(h));
  const plays = withRhythm(rhythmOf(game), () => planCards(s, hand.map((c) => c.card_key as CardKey), resolutionDay));
  for (const { card, params } of plays) {
    const row = hand.find((c) => c.card_key === card && !c.used_at);
    if (!row) continue;
    const prepared = useCardStatements(db, game, h, row, params, {
      house: h.id,
      tiles: ctx.tiles,
      buildings: ctx.buildings.get(h.id)!,
      resources: resourcesOf(h),
      houses: ctx.houses.map((x) => x.id),
      nextResolution: game.current_resolution + 1,
    });
    if (!prepared.ok) continue;
    try {
      await db.batch(prepared.statements);
      row.used_at = "usada";
      row.used_params = JSON.stringify({ effect: prepared.effect });
    } catch (err) {
      console.error(`Carta de ${h.name}:`, err);
    }
  }
}

/**
 * El día de cada bot: elige objetivo secreto (el primer día), construye,
 * recluta y fortifica según su personalidad, y publica como mucho una oferta.
 */
/** Compras de un bot a la Corona: las paga y las suma a su casa (también en `ctx`). */
async function botBuysFromCrown(db: D1Database, game: GameRow, ctx: BotContext, h: HouseRow, p: Personality): Promise<void> {
  const market = await crownMarket(db, game, ctx.houses);
  const plan = planCrown(situation(botView(ctx, h), p), market.realm, market.bought);
  for (const r of CROWN_GOODS) {
    const units = plan.units[r];
    if (units <= 0) continue;
    const gold = crownCost(market, r, units);
    if (gold > h.oro) continue;
    try {
      await db.batch(crownPurchaseStatements(db, game, h.id, r, units, gold));
    } catch (err) {
      console.error(`Corona, ${h.name}:`, err);
      continue;
    }
    h.oro -= gold;
    h[r] += units;
    market.bought[r] += units;
    market.realm[r] += units;
    market.realm.oro -= gold;
  }
}

export async function botsPlayDay(env: NotifyEnv, game: GameRow, only?: ReadonlySet<HouseId>, delayFrom: Date | null = null): Promise<void> {
  await botsPlayDayInner(env, game, only);
  // Bloque 8: tras construir, la diplomacia (como el paso 2b del simulador).
  await botsDiplomacy(env, game, false, only, delayFrom);
}

async function botsPlayDayInner(env: NotifyEnv, game: GameRow, only?: ReadonlySet<HouseId>): Promise<void> {
  const db = env.DB;
  await botRansoms(db, game, only);
  const ctx = await botContext(db, game);
  const { results: open } = await db
    .prepare("SELECT * FROM offers WHERE game_id = ? AND status = 'open' AND to_house_id IS NULL")
    .bind(game.id)
    .all<OfferRow>();
  for (const h of activeBots(ctx.houses, game, only)) {
    const p = personalityOf(h);
    const st: D1PreparedStatement[] = [];
    if (!h.objective_key && game.current_resolution === 0 && h.objective_options) {
      const options = JSON.parse(h.objective_options) as ObjectiveKey[];
      h.objective_key = chooseObjective(options, p);
      st.push(db.prepare("UPDATE houses SET objective_key = ? WHERE id = ?").bind(h.objective_key, h.id));
    }
    // Bloque 5: compra a la Corona antes de gastar, como en el simulador.
    if (ECONOMY_TWEAKS.crown) await botBuysFromCrown(db, game, ctx, h, p);
    const s = situation(botView(ctx, h), p);
    const plan = withRhythm(rhythmOf(game), () => planDay(s));
    const c = plan.cost;
    st.push(
      db.prepare(
        "UPDATE houses SET pan = pan - ?, madera = madera - ?, piedra = piedra - ?, hierro = hierro - ?, oro = oro - ?, help_resource = ? WHERE id = ?",
      ).bind(c.pan, c.madera, c.piedra, c.hierro, c.oro, plan.help, h.id),
    );
    const levels = { ...ctx.buildings.get(h.id)! };
    for (const b of plan.upgrades) {
      st.push(
        db.prepare("UPDATE buildings SET level = level + 1 WHERE house_id = ? AND kind = ? AND level = ?").bind(h.id, b, levels[b]),
      );
      levels[b]++;
      if (levels[b] >= 3) {
        st.push(
          db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) VALUES (?, 'mejora', NULL, ?)").bind(
            game.id,
            JSON.stringify({ house: h.id, edificio: b, nivel: levels[b] }),
          ),
        );
      }
      if (levels[b] === 5) {
        st.push(
          db.prepare(
            `INSERT INTO achievements (game_id, house_id, achievement_key) SELECT ?, ?, 'obra_maestra'
             WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE game_id = ? AND achievement_key = 'obra_maestra')`,
          ).bind(game.id, h.id, game.id),
        );
      }
    }
    for (const f of plan.fortify) {
      st.push(db.prepare("UPDATE tiles SET fortified_until = ? WHERE id = ? AND owner_house_id = ?").bind(f.until, f.tile, h.id));
    }
    if (plan.recruit + plan.riders + plan.engines > 0) {
      // Como en el simulador: en una aldea del frente si la tiene (bloque 1).
      const site = recruitSite(ctx.tiles, h.id);
      st.push(
        site && site.type === "aldea"
          ? db.prepare(
              "UPDATE tiles SET troops = troops + ?, jinetes = jinetes + ?, catapultas = catapultas + ? WHERE id = ? AND owner_house_id = ?",
            ).bind(plan.recruit + plan.riders + plan.engines, plan.riders, plan.engines, site.id, h.id)
          : db.prepare(
              "UPDATE tiles SET troops = troops + ?, jinetes = jinetes + ?, catapultas = catapultas + ? WHERE game_id = ? AND castle_of = ?",
            ).bind(plan.recruit + plan.riders + plan.engines, plan.riders, plan.engines, game.id, h.id),
      );
    }
    try {
      await db.batch(st);
    } catch (err) {
      console.error(`Bot ${h.name}:`, err);
      continue;
    }
    const fresh = (await loadHouses(db, game.id)).find((x) => x.id === h.id)!;
    // Bloque 5: mercenarios con Oro para lo que no llega a reclutar, como en el simulador.
    if (ECONOMY_TWEAKS.mercenaries === "alquiler") {
      const hire = planMercenaries(situation(botView(ctx, fresh), p), "alquiler", plan.recruit + plan.riders, MERCENARIES.weeklyCap);
      if (hire > 0) {
        await db.batch(hireStatements(db, game, fresh, hire)).catch((err) => console.error(`Mercenarios de ${h.name}:`, err));
        fresh.oro -= mercenaryCost(hire);
      }
    }
    await botPlaysCards(db, game, ctx, fresh, false);
    // La víspera del boletín (el sábado), su proclama y quizá un soborno con motivo (docs/bots.md, PR 4).
    if (ctx.day % 7 === 5) await botSpeaks(db, game, ctx, (await loadHouses(db, game.id)).find((x) => x.id === h.id)!, p);
    // Pujas de la Gran Subasta (si hay lotes anunciados y sigue abierta).
    const week = openAuctionWeek(game);
    if (week != null) {
      const { results: lots } = await db
        .prepare("SELECT * FROM auction_lots WHERE game_id = ? AND week = ? ORDER BY slot")
        .bind(game.id, week)
        .all<LotRow>();
      if (lots.length > 0) {
        const after = (await loadHouses(db, game.id)).find((x) => x.id === h.id)!;
        const bids = planBids(situation(botView(ctx, after), p), lots.map(lotOf));
        const stmts = bids.map((b) =>
          db.prepare(
            `INSERT INTO bids (lot_id, house_id, amount, placed_at) VALUES (?, ?, ?, ?)
             ON CONFLICT (lot_id, house_id) DO UPDATE SET amount = excluded.amount, placed_at = excluded.placed_at`,
          ).bind(lots.find((l) => l.slot === b.slot)!.id, h.id, b.amount, gameNow(game).toISOString()),
        );
        if (stmts.length > 0) await db.batch(stmts);
      }
    }
    // Una oferta pública como mucho, con lo que le quede después de gastar. La que
    // ya no le sirve o nadie ha querido en `staleDays` días la retira (y la vuelve a
    // publicar más barata), como haría una persona (docs/bots.md, PR 3).
    const left = resourcesOf(h);
    for (const r of Object.keys(left) as (keyof typeof left)[]) left[r] -= c[r];
    const after = situation({ ...botView(ctx, h), resources: left, buildings: levels }, p);
    const mine = open.filter((o) => o.from_house_id === h.id);
    let discount = 0;
    for (const o of mine) {
      const age = Math.round((gameNow(game).getTime() - Date.parse(o.created_at)) / 864e5);
      if (!withdrawOffer(after, bundle(o, "give"), bundle(o, "want"), age)) continue;
      await db
        .prepare("UPDATE offers SET status = 'cancelled', closed_at = ? WHERE id = ? AND status = 'open'")
        .bind(gameNow(game).toISOString(), o.id)
        .run();
      open.splice(open.indexOf(o), 1);
      if (age >= BOT_TRADE.staleDays) discount = BOT_TRADE.repostDiscount;
    }
    if (!open.some((o) => o.from_house_id === h.id)) {
      const offer = proposeOffer(after, discount);
      if (offer) {
        const note = offerNote(discount > 0 ? "rebaja" : "oferta", h.id + ctx.day, offer);
        await insertOfferStatement(db, game, { from: h.id, to: null, parent: null, ...offer, note }).run();
      }
    }
  }
}

/** Lo que sabe un bot para hablar esta semana: puestos de ahora y del domingo anterior, y alianzas nuevas. */
async function voiceContext(db: D1Database, game: GameRow, ctx: BotContext, h: HouseRow): Promise<VoiceContext> {
  const days = rhythmOf(game).days;
  const week = resolutionInfo(game.current_resolution + 1, days).week;
  const rankIn = (totals: { house: HouseId; total: number }[]) =>
    [...totals].sort((a, b) => b.total - a.total || a.house - b.house).findIndex((t) => t.house === h.id) + 1;
  const { results: before } = await db
    .prepare("SELECT house_id AS house, total FROM prestige_snapshots WHERE game_id = ? AND resolution_no = ?")
    .bind(game.id, (week - 1) * days.length)
    .all<{ house: number; total: number }>();
  return {
    seed: game.seed,
    week,
    names: new Map(ctx.houses.map((x) => [x.id, x.name])),
    rank: rankIn(ctx.prestige),
    rankBefore: before.some((t) => t.house === h.id) ? rankIn(before) : null,
    newAllies: ctx.alliances
      .filter((al) => al.status === "active" && al.since > game.current_resolution + 1 - days.length && (al.a === h.id || al.b === h.id))
      .map((al) => (al.a === h.id ? al.b : al.a)),
  };
}

/** Proclama de la semana y soborno con motivo (`ai/voice.ts`), mientras el cronista no haya cerrado el boletín. */
async function botSpeaks(db: D1Database, game: GameRow, ctx: BotContext, h: HouseRow, p: Personality): Promise<void> {
  if (!ordersOpen(gameNow(game), clockOf(game)!)) return;
  const voice = await voiceContext(db, game, ctx, h);
  const s = situation(botView(ctx, h), p);
  const text = planProclamation(s, voice);
  const st: D1PreparedStatement[] = [];
  // INSERT OR IGNORE: si ya contestó a una mención esta semana, su respuesta se queda.
  if (text) {
    st.push(
      db.prepare("INSERT OR IGNORE INTO proclamations (game_id, house_id, week, text, updated_at) VALUES (?, ?, ?, ?, ?)").bind(
        game.id, h.id, voice.week, [...text].slice(0, PROCLAMATION.maxLetters).join(""), gameNow(game).toISOString(),
      ),
    );
  }
  const template = planBribe(s, voice);
  if (template != null) {
    st.push(
      db.prepare("INSERT OR IGNORE INTO bribes (game_id, house_id, week, amount, template_key) VALUES (?, ?, ?, ?, ?)").bind(
        game.id, h.id, voice.week, BRIBE_COST, String(template),
      ),
      db.prepare("UPDATE houses SET oro = oro - ? WHERE id = ? AND changes() > 0").bind(BRIBE_COST, h.id),
    );
  }
  if (st.length > 0) await db.batch(st).catch((err) => console.error(`Proclama o soborno de ${h.name}:`, err));
}

/**
 * Los bots contestan a las proclamas de esta semana que les nombran con «@»
 * (`answerMention`): una respuesta por semana, que sustituye a su proclama.
 * Con el retraso de siempre si hay reloj (`answered`).
 */
export async function botsAnswerMentions(env: NotifyEnv, game: GameRow, delayFrom: Date | null = null): Promise<void> {
  const db = env.DB;
  if (!ordersOpen(gameNow(game), clockOf(game)!)) return;
  const week = resolutionInfo(game.current_resolution + 1, rhythmOf(game).days).week;
  const { results: said } = await db
    .prepare("SELECT house_id, text, updated_at FROM proclamations WHERE game_id = ? AND week = ?")
    .bind(game.id, week)
    .all<{ house_id: number; text: string; updated_at: string }>();
  if (said.length === 0) return;
  const ctx = await botContext(db, game);
  const bots = activeBots(ctx.houses, game);
  for (const p of said) {
    for (const h of proclamationMentions(p.text, bots)) {
      if (h.id === p.house_id || !answered(game, delayFrom, h, `mencion:${p.house_id}:${week}`, p.updated_at)) continue;
      // Una respuesta por semana: se reserva antes, como el día del bot.
      const claimed = await db
        .prepare("INSERT OR IGNORE INTO job_runs (game_id, job_key) VALUES (?, ?)")
        .bind(game.id, `bot_mencion:${h.id}:${week}`)
        .run();
      if (claimed.meta.changes === 0) continue;
      const text = answerMention(situation(botView(ctx, h), personalityOf(h)), await voiceContext(db, game, ctx, h), p.house_id);
      await db
        .prepare(
          "INSERT INTO proclamations (game_id, house_id, week, text, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (game_id, house_id, week) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at",
        )
        .bind(game.id, h.id, week, [...text].slice(0, PROCLAMATION.maxLetters).join(""), gameNow(game).toISOString())
        .run();
    }
  }
}

/** Fe de erratas de los bots que no ganaron, al acabar la partida (`planErrata`). */
export async function botsWriteErrata(env: NotifyEnv, game: GameRow): Promise<void> {
  const db = env.DB;
  const end = await db.prepare("SELECT payload FROM event_log WHERE game_id = ? AND type = 'fin' ORDER BY id DESC LIMIT 1").bind(game.id).first<{ payload: string }>();
  const winner = end ? (JSON.parse(end.payload) as { winner: number | null }).winner : null;
  const houses = await loadHouses(db, game.id);
  const names = new Map(houses.map((x) => [x.id, x.name]));
  const st = houses
    .filter((h) => h.is_bot === 1)
    .map((h) => ({ h, text: planErrata(h.id, winner, { seed: game.seed, week: 0, names, rank: 0, rankBefore: null, newAllies: [] }) }))
    .filter((x) => x.text)
    .map(({ h, text }) =>
      db.prepare("INSERT OR IGNORE INTO proclamations (game_id, house_id, week, text, updated_at) VALUES (?, ?, 0, ?, ?)").bind(
        game.id, h.id, [...text!].slice(0, PROCLAMATION.maxLetters).join(""), gameNow(game).toISOString(),
      ),
    );
  if (st.length > 0) await db.batch(st);
}

/** Órdenes de los bots para la resolución `n` (si aún no tienen): ataques con apoyos, defensa y avance. */
export async function addBotOrders(env: NotifyEnv, game: GameRow, n: number): Promise<void> {
  const db = env.DB;
  const [ctx, given] = await Promise.all([
    botContext(db, game),
    db.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE game_id = ? AND resolution_no = ? ORDER BY id`)
      .bind(game.id, n)
      .all<OrderRow>(),
  ]);
  const existing = { results: [...new Set(given.results.map((o) => o.house_id))].map((house_id) => ({ house_id })) };
  // Órdenes ya dadas esta noche: los bots ven las de sus aliados bots, como si lo hablaran (igual que en
  // el simulador). Las de una persona no: ella tampoco ve las del bot (docs/bots.md).
  const bots = new Set(ctx.houses.filter((h) => h.is_bot === 1 && h.id !== game.played_house_id).map((h) => h.id));
  const planned: Order[] = given.results.filter((o) => bots.has(o.house_id)).map(orderOf);
  // Antes de dar órdenes, Tregua y Tambores de guerra.
  for (const h of activeBots(ctx.houses, game)) {
    if (!existing.results.some((e) => e.house_id === h.id)) await botPlaysCards(db, game, ctx, h, true);
  }
  const statements: D1PreparedStatement[] = [];
  for (const h of activeBots(ctx.houses, game)) {
    if (existing.results.some((e) => e.house_id === h.id)) continue;
    // Los novatos se olvidan de dar órdenes alguna noche (BOT_LEVELS), como en el simulador.
    if (forgetsOrders(game.seed, h.id, n, h.bot_level as BotLevel | null)) continue;
    const allies = alliesOf(ctx.alliances, h.id);
    const allyOrders = planned.filter((o) => allies.includes(o.house));
    const orders = withRhythm(rhythmOf(game), () => planOrders(situation({ ...botView(ctx, h), allyOrders }, personalityOf(h))));
    planned.push(...orders);
    for (const o of orders) {
      statements.push(
        db.prepare(
          "INSERT INTO orders (game_id, house_id, resolution_no, kind, from_tile_id, troops, jinetes, catapultas, captain, guest, target_tile_id, supported_from_tile_id, supports_any) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          game.id,
          h.id,
          n,
          o.kind,
          o.from,
          o.troops,
          o.jinetes ?? 0,
          o.catapultas ?? 0,
          o.kind === "move" && o.captain ? 1 : 0,
          o.guest ? 1 : 0,
          o.kind === "move" ? o.to : o.target,
          o.kind === "support" && o.supportedFrom !== ANY_ORIGIN ? o.supportedFrom : null,
          o.kind === "support" && o.supportedFrom === ANY_ORIGIN ? 1 : 0,
        ),
      );
    }
  }
  if (statements.length > 0) await db.batch(statements);
}

/**
 * Los bots contestan las ofertas abiertas: la acepta el bot que más gane con
 * ella (según su personalidad). Si a ninguno le conviene pero a alguno se le
 * queda cerca, ese contesta con una contraoferta con su frase (una por oferta;
 * a una contraoferta no se le contesta con otra). Las dirigidas a un bot que no
 * le convienen ni admiten contraoferta se rechazan. Con quien le ha atacado
 * hace poco no comercia (docs/bots.md, PR 3).
 */
export async function botsAnswerOffers(env: NotifyEnv, game: GameRow, delayFrom: Date | null = null): Promise<void> {
  const db = env.DB;
  const { results: offers } = await db
    .prepare("SELECT * FROM offers WHERE game_id = ? AND status = 'open' ORDER BY id")
    .bind(game.id)
    .all<OfferRow>();
  if (offers.length === 0) return;
  const { results: countered } = await db
    .prepare("SELECT DISTINCT parent_offer_id AS id FROM offers WHERE game_id = ? AND parent_offer_id IS NOT NULL")
    .bind(game.id)
    .all<{ id: number }>();
  const hasCounter = new Set(countered.map((x) => x.id));
  for (const offer of offers) {
    // Recursos al día: cada trato cerrado los cambia.
    const ctx = await botContext(db, game);
    const bots = activeBots(ctx.houses, game).filter((h) => h.id !== offer.from_house_id && answered(game, delayFrom, h, `oferta:${offer.id}`, offer.created_at));
    const candidates = offer.to_house_id == null ? bots : bots.filter((h) => h.id === offer.to_house_id);
    if (candidates.length === 0) continue;
    // Puede que ya se haya cerrado (una contraoferta aceptada retira la oferta de la que sale).
    const still = await db.prepare("SELECT status FROM offers WHERE id = ?").bind(offer.id).first<{ status: string }>();
    if (still?.status !== "open") continue;
    const give = bundle(offer, "give");
    const want = bundle(offer, "want");
    let best: { h: HouseRow; gain: number } | null = null;
    for (const h of candidates) {
      const gain = offerGain(situation(botView(ctx, h), personalityOf(h)), give, want, offer.from_house_id);
      if (gain > 0 && (!best || gain > best.gain)) best = { h, gain };
    }
    if (best) {
      const failed = await acceptOffer(env, game, offer, best.h);
      // Aceptada la contraoferta a su oferta pública, esa ya está servida.
      if (!failed && offer.parent_offer_id != null) {
        await db
          .prepare("UPDATE offers SET status = 'cancelled', closed_at = ? WHERE id = ? AND from_house_id = ? AND status = 'open'")
          .bind(gameNow(game).toISOString(), offer.parent_offer_id, best.h.id)
          .run();
      }
      continue;
    }
    let counter: { h: HouseRow; plan: OfferPlan } | null = null;
    if (offer.parent_offer_id == null && !hasCounter.has(offer.id)) {
      for (const h of candidates) {
        const plan = counterOffer(situation(botView(ctx, h), personalityOf(h)), give, want, offer.from_house_id);
        if (plan && (!counter || totalOf(plan.give) > totalOf(counter.plan.give))) counter = { h, plan };
      }
    }
    if (counter) {
      hasCounter.add(offer.id);
      const note = offerNote("contraoferta", offer.id + counter.h.id, counter.plan);
      const st = [insertOfferStatement(db, game, { from: counter.h.id, to: offer.from_house_id, parent: offer.id, ...counter.plan, note })];
      // Como en la API: la contraoferta a una oferta dirigida la cierra; las públicas siguen abiertas.
      if (offer.to_house_id === counter.h.id) {
        st.push(
          db.prepare("UPDATE offers SET status = 'countered', closed_at = ? WHERE id = ? AND status = 'open'").bind(gameNow(game).toISOString(), offer.id),
        );
      }
      await db.batch(st);
      await notifyHouses(env, [offer.from_house_id], {
        kind: "oferta",
        title: "Te han hecho una oferta",
        body: noticeText("aviso.oferta", counter.h.id + offer.from_house_id, { jugador: houseInSentence(counter.h.name) }),
        url: `/partida/${game.id}`,
        dedupe: `contraoferta:${game.id}:${offer.id}`,
      });
    } else if (offer.to_house_id != null) {
      await db
        .prepare("UPDATE offers SET status = 'rejected', closed_at = ? WHERE id = ? AND status = 'open'")
        .bind(gameNow(game).toISOString(), offer.id)
        .run();
    }
  }
}

/**
 * Diplomacia de los bots (bloque 8), con las reglas de `ai/alliances.ts` y en
 * el orden del simulador: cada bot rompe lo que ya no le compensa, contesta
 * las propuestas que tiene (también las de personas) y propone una. Con
 * `answerOnly`, solo acepta las que le convienen: se usa antes de la
 * resolución, para que una propuesta de una persona hecha por la tarde valga
 * esa noche.
 */
export async function botsDiplomacy(
  env: NotifyEnv,
  game: GameRow,
  answerOnly: boolean,
  only?: ReadonlySet<HouseId>,
  delayFrom: Date | null = null,
): Promise<void> {
  if (!ALLIANCE.enabled || game.status !== "active") return;
  const db = env.DB;
  const ctx = await botContext(db, game);
  const now = gameNow(game);
  for (const h of activeBots(ctx.houses, game, only)) {
    const rows = await loadAlliances(db, game.id);
    ctx.alliances = toEngineAlliances(rows);
    const proposed = rows.filter((r) => r.status === "proposed");
    const other = (r: AllianceRow) => (r.house_a === h.id ? r.house_b : r.house_a);
    // Con `delayFrom`, solo las que lleva un rato pensando (en las partidas reales no contesta al instante).
    const received = proposed.filter(
      (r) => r.proposed_by !== h.id && (r.house_a === h.id || r.house_b === h.id) && answered(game, delayFrom, h, `alianza:${r.id}`, r.proposed_at),
    );
    if (answerOnly && received.length === 0) continue;
    const plan = planDiplomacy(situation(botView(ctx, h), personalityOf(h)), {
      received: received.map((r) => r.proposed_by),
      sent: proposed.filter((r) => r.proposed_by === h.id).map(other),
      cooldown: cooling(rows, h.id, now),
      blocked: ctx.houses.filter((o) => cooling(rows, o.id, now)).map((o) => o.id),
      // No insiste con quien le rechazó en los últimos días.
      refused: rows
        .filter((r) => r.status === "declined" && r.proposed_by === h.id && r.closed_at && now.getTime() - Date.parse(r.closed_at) < ALLIANCE.cooldownDays * 864e5)
        .map(other),
    });
    if (!answerOnly) {
      for (const a of plan.break) {
        const row = rows.find((r) => r.status === "active" && other(r) === a && (r.house_a === h.id || r.house_b === h.id));
        if (row) await breakAlliance(env, game, h, row.id);
      }
    }
    const limit = Math.min(ALLIANCE_BOTS.maxAlliances, ALLIANCE.maxPerHouse ?? Infinity);
    for (const r of received) {
      const from = r.proposed_by;
      const proposer = ctx.houses.find((x) => x.id === from);
      // Como en el simulador: un bot que propuso puede haber llegado ya a su límite.
      const full =
        proposer?.is_bot === 1 &&
        (await loadAlliances(db, game.id)).filter((x) => (x.status === "active" || x.status === "breaking") && (x.house_a === from || x.house_b === from)).length >= limit;
      if (plan.accept.includes(from) && !full) {
        const res = await acceptAlliance(env, game, h, r.id);
        if (!res.ok && !answerOnly) await declineAlliance(env, game, h, r.id);
      } else if (!answerOnly) {
        // Antes de la noche solo acepta; lo demás lo contesta por la mañana, como en el simulador.
        await declineAlliance(env, game, h, r.id);
      }
    }
    if (!answerOnly && plan.propose != null) await proposeAlliance(env, game, h, plan.propose);
  }
}

/**
 * Turnos de los bots en una partida real, desde el cron (`dueBotJobs`): el día
 * de cada uno a su hora, las respuestas con su retraso y las órdenes antes del
 * cierre. El día se reserva antes en `job_runs` (`bot_dia:casa:fecha`): si dos
 * cron se solapan, el segundo no lo repite; si algo falla a medias, ese día
 * el bot se queda sin terminar, pero nunca juega dos veces.
 */
export async function runBotJobs(env: NotifyEnv, gameId: number, now: Date): Promise<void> {
  const db = env.DB;
  const game = await loadGame(db, gameId);
  const clock = game && clockOf(game);
  if (!game || !clock || game.is_test === 1 || game.status !== "active") return;
  const houses = await loadHouses(db, game.id);
  const bots = activeBots(houses, game).map((h) => ({ house: h.id, hour: botHour(game.seed, h.id) }));
  for (const job of dueBotJobs(now, clock, bots)) {
    try {
      if (job.kind === "bot_dia") {
        const claimed = await db
          .prepare("INSERT OR IGNORE INTO job_runs (game_id, job_key) VALUES (?, ?)")
          .bind(game.id, job.key)
          .run();
        if (claimed.meta.changes === 0) continue;
        await botsPlayDay(env, (await loadGame(db, game.id))!, new Set([job.house]), now);
      } else if (job.kind === "bot_respuestas") {
        await botsAnswerOffers(env, game, now);
        await botsAnswerMentions(env, game, now);
        await botsDiplomacy(env, game, true, undefined, now);
      } else {
        await addBotOrders(env, game, job.resolution);
      }
    } catch (err) {
      console.error(`Partida ${game.id}, bots (${job.kind}):`, err);
    }
  }
}
