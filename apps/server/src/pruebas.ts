// Partidas de prueba: para probar el juego sin reunir a 4 personas.
// - Al empezar se rellenan con bots con personalidad (packages/engine/src/ai):
//   cada mañana construyen, reclutan, fortifican y publican ofertas; antes de
//   cada resolución dan órdenes (con apoyos); y contestan a las ofertas.
// - Tienen un reloj simulado: el cron no las toca y el tiempo solo avanza con
//   los botones de la mesa de pruebas, que ejecutan las mismas tareas que el
//   cron real (producción, piloto automático, resolución y final).
// - Quien las crea puede "jugar como" cualquier casa.

import {
  recruitSite,
  PERSONALITIES,
  PRESTIGE,
  BRIBE_COST,
  PHRASES,
  chooseObjective,
  eventCombat,
  eventOfWeek,
  eventUpkeepFactor,
  localDate,
  offerGain,
  planBids,
  planCards,
  planDay,
  planOrders,
  proposeOffer,
  resolutionInfo,
  resolutionInstant,
  totalResolutions,
  withRhythm,
  situation,
  zonedToUtc,
  type AiView,
  type CardEffect,
  type CardKey,
  type BuildingKind,
  type HouseId,
  type ObjectiveKey,
  type Personality,
  type PersonalityName,
  type Tile,
} from "@reyes/engine";
import { hashCode, randomCode } from "./auth";
import { COLORS, pickShield } from "./heraldry";
import { clockOf, runGameJobs } from "./jobs";
import type { NotifyEnv } from "./notify";
import { acceptOffer, bundle, type OfferRow } from "./offers";
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
} from "./state";

/** Hora local a la que empieza cada día simulado. */
const MORNING = "09:00";
/** Pasos como mucho por llamada (un paso = una mañana o una resolución). */
const MAX_STEPS = 8;

const BOT_HOUSES: { name: string; motto: string; personality: PersonalityName }[] = [
  { name: "Casa del Nabo", motto: "Raíces profundas, ideas cortas", personality: "arquitecta" },
  { name: "Gallina Bélica", motto: "Cacarea fuerte, corre más", personality: "guerrero" },
  { name: "Los Pocapena", motto: "Ya si eso, mañana", personality: "mercader" },
  { name: "Barones del Barro", motto: "Del barro venimos", personality: "estratega" },
  { name: "Señores del Pato", motto: "Ni frío ni calor", personality: "oportunista" },
  { name: "Duques del Queso", motto: "Cuanto más curado, mejor", personality: "mercader" },
  { name: "Caracol Veloz", motto: "Llegaremos", personality: "guerrero" },
];

/** Personalidad de un bot (los creados antes de que existieran, estrategas). */
function personalityOf(h: HouseRow): Personality {
  return PERSONALITIES[(h.bot_personality ?? "estratega") as PersonalityName] ?? PERSONALITIES.estratega;
}

/** Bots que juegan solos: todos menos el que estés manejando. */
function activeBots(houses: HouseRow[], game: GameRow): HouseRow[] {
  return houses.filter((h) => h.is_bot === 1 && h.id !== game.played_house_id);
}

export interface BotEnv extends NotifyEnv {
  SESSION_SECRET: string;
}

/** Añade bots hasta tener `count` (y nunca más de 8 casas). Devuelve las casas resultantes. */
export async function addBots(env: BotEnv, gameId: number, count: number): Promise<HouseRow[]> {
  const db = env.DB;
  let houses = await loadHouses(db, gameId);
  const wanted = Math.min(count, 8 - houses.length);
  for (let i = 0; i < wanted; i++) {
    const color = COLORS.find((c) => !houses.some((h) => h.color === c))!;
    const who = BOT_HOUSES.find((b) => !houses.some((h) => h.name === b.name)) ?? {
      name: `Bot ${i + 1}`,
      motto: "",
      personality: "estratega" as const,
    };
    const shield = pickShield(houses);
    // Cada bot es un usuario con un código que nadie conoce: no se puede entrar con él.
    const user = await db
      .prepare("INSERT INTO users (display_name, login_code_hash) VALUES (?, ?) RETURNING id")
      .bind(`Bot ${who.name}`, await hashCode(randomCode(12), env.SESSION_SECRET))
      .first<{ id: number }>();
    await db
      .prepare(
        "INSERT INTO houses (game_id, user_id, name, color, shield_shape, shield_division, color2, symbol, metal, motto, is_bot, bot_personality) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
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
        who.personality,
      )
      .run();
    houses = await loadHouses(db, gameId);
  }
  return houses;
}

/** Instante en que empieza la partida de prueba: el lunes de inicio a las 9:00. */
export function testStart(startDate: string, timeZone: string): Date {
  return zonedToUtc(startDate, MORNING, timeZone);
}

/** Siguiente parada del reloj simulado: la próxima mañana o la resolución, lo que llegue antes. */
export function nextStop(game: GameRow, now: Date): Date {
  const today = localDate(now, game.timezone);
  const todayMorning = zonedToUtc(today, MORNING, game.timezone);
  const morning = now < todayMorning ? todayMorning : zonedToUtc(addDays(today, 1), MORNING, game.timezone);
  const clock = clockOf(game);
  const next = game.current_resolution + 1;
  if (!clock || next > totalResolutions(game.weeks, clock.days)) return morning;
  const resolve = resolutionInstant(clock.startDate, next, clock.resolveTime, clock.timezone, clock.days);
  return resolve > now && resolve < morning ? resolve : morning;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Avanza el reloj de una partida de prueba. "paso": hasta la siguiente parada.
 * "resolucion": hasta pasar la próxima resolución (o el final, si ya no quedan).
 */
export async function advance(env: BotEnv, gameId: number, until: "paso" | "resolucion"): Promise<GameRow> {
  const db = env.DB;
  let game = (await loadGame(db, gameId))!;
  const startResolution = game.current_resolution;
  for (let step = 0; step < MAX_STEPS && game.status === "active"; step++) {
    const stop = nextStop(game, gameNow(game));
    const next = game.current_resolution + 1;
    const clock = clockOf(game)!;
    const resolving =
      next <= totalResolutions(game.weeks, clock.days) &&
      stop >= resolutionInstant(clock.startDate, next, clock.resolveTime, clock.timezone, clock.days);
    // Las ofertas se hicieron durante el día: los bots contestan antes de nada.
    await botsAnswerOffers(env, game);
    if (resolving) await addBotOrders(env, game, next);
    await db.prepare("UPDATE games SET sim_now = ? WHERE id = ?").bind(stop.toISOString(), game.id).run();
    game = { ...game, sim_now: stop.toISOString() };
    await runGameJobs(env, game, stop);
    game = (await loadGame(db, gameId))!;
    // Cada mañana, tras la producción, los bots juegan su día.
    if (!resolving && game.status === "active") await botsPlayDay(env, game);

    if (until === "paso") break;
    const total = totalResolutions(game.weeks, rhythmOf(game).days);
    if (game.current_resolution > startResolution && game.current_resolution < total) break;
  }
  return game;
}

/** Lo que necesitan los bots para decidir, leído una vez por paso. */
interface BotContext {
  game: GameRow;
  houses: HouseRow[];
  tiles: Tile[];
  buildings: Map<HouseId, Record<BuildingKind, number>>;
  prestige: { house: HouseId; total: number }[];
  partners: Map<HouseId, HouseId[]>;
  day: number;
  cards: CardRow[];
  lotsWon: Map<HouseId, number>;
}

async function botContext(db: D1Database, game: GameRow): Promise<BotContext> {
  const now = gameNow(game);
  const since = new Date(now.getTime() - PRESTIGE.tradeWindowDays * 864e5).toISOString();
  const [houses, tileRows, buildings, trades, cards, lots] = await Promise.all([
    loadHouses(db, game.id),
    loadTiles(db, game.id),
    loadBuildings(db, game.id),
    db.prepare("SELECT house_a, house_b FROM trades WHERE game_id = ? AND valid = 1 AND at >= ?")
      .bind(game.id, since)
      .all<{ house_a: number; house_b: number }>(),
    db.prepare("SELECT id, house_id, card_key, used_at, used_params FROM cards WHERE game_id = ?").bind(game.id).all<CardRow>(),
    db.prepare("SELECT winner_house_id AS house, COUNT(*) AS n FROM auction_lots WHERE game_id = ? AND winner_house_id IS NOT NULL GROUP BY winner_house_id")
      .bind(game.id)
      .all<{ house: number; n: number }>(),
  ]);
  const tiles = toEngineTiles(tileRows);
  const prestige = await computeAllPrestige(db, game.id, houses, tiles, now);
  const partners = new Map<HouseId, HouseId[]>();
  for (const t of trades.results) {
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
    day,
    cards: cards.results,
    lotsWon: new Map(lots.results.map((l) => [l.house, l.n])),
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
export async function botsPlayDay(env: NotifyEnv, game: GameRow): Promise<void> {
  const db = env.DB;
  const ctx = await botContext(db, game);
  const { results: open } = await db
    .prepare("SELECT from_house_id FROM offers WHERE game_id = ? AND status = 'open'")
    .bind(game.id)
    .all<{ from_house_id: number }>();
  for (const h of activeBots(ctx.houses, game)) {
    const p = personalityOf(h);
    const st: D1PreparedStatement[] = [];
    if (!h.objective_key && game.current_resolution === 0 && h.objective_options) {
      const options = JSON.parse(h.objective_options) as ObjectiveKey[];
      h.objective_key = chooseObjective(options, p);
      st.push(db.prepare("UPDATE houses SET objective_key = ? WHERE id = ?").bind(h.objective_key, h.id));
    }
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
    await botPlaysCards(db, game, ctx, fresh, false);
    // De vez en cuando, un soborno al cronista (las casas más ricas y vanidosas).
    const bribeWeek = Math.floor(ctx.day / 7) + 1;
    if (fresh.oro >= 60 + BRIBE_COST && (h.id + bribeWeek) % 3 === 0 && ctx.day % 7 >= 4 && ctx.day % 7 <= 6) {
      await db
        .batch([
          db.prepare("INSERT OR IGNORE INTO bribes (game_id, house_id, week, amount, template_key) VALUES (?, ?, ?, ?, ?)").bind(
            game.id,
            h.id,
            bribeWeek,
            BRIBE_COST,
            String((h.id + bribeWeek) % PHRASES["soborno.frase"].length),
          ),
          db.prepare("UPDATE houses SET oro = oro - ? WHERE id = ? AND changes() > 0").bind(BRIBE_COST, h.id),
        ])
        .catch((err) => console.error(`Soborno de ${h.name}:`, err));
    }
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
    // Una oferta pública como mucho, con lo que le quede después de gastar.
    if (!open.some((o) => o.from_house_id === h.id)) {
      const left = resourcesOf(h);
      for (const r of Object.keys(left) as (keyof typeof left)[]) left[r] -= c[r];
      const offer = proposeOffer(situation({ ...botView(ctx, h), resources: left, buildings: levels }, p));
      if (offer) {
        const g = offer.give;
        const w = offer.want;
        await db
          .prepare(
            `INSERT INTO offers (game_id, from_house_id, to_house_id, give_pan, give_madera, give_piedra, give_hierro, give_oro,
               want_pan, want_madera, want_piedra, want_hierro, want_oro, created_at)
             VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            game.id, h.id,
            g.pan ?? 0, g.madera ?? 0, g.piedra ?? 0, g.hierro ?? 0, g.oro ?? 0,
            w.pan ?? 0, w.madera ?? 0, w.piedra ?? 0, w.hierro ?? 0, w.oro ?? 0,
            gameNow(game).toISOString(),
          )
          .run();
      }
    }
  }
}

/** Órdenes de los bots para la resolución `n` (si aún no tienen): ataques con apoyos, defensa y avance. */
async function addBotOrders(env: NotifyEnv, game: GameRow, n: number): Promise<void> {
  const db = env.DB;
  const [ctx, existing] = await Promise.all([
    botContext(db, game),
    db.prepare("SELECT DISTINCT house_id FROM orders WHERE game_id = ? AND resolution_no = ?")
      .bind(game.id, n)
      .all<{ house_id: number }>(),
  ]);
  // Antes de dar órdenes, Tregua y Tambores de guerra.
  for (const h of activeBots(ctx.houses, game)) {
    if (!existing.results.some((e) => e.house_id === h.id)) await botPlaysCards(db, game, ctx, h, true);
  }
  const statements: D1PreparedStatement[] = [];
  for (const h of activeBots(ctx.houses, game)) {
    if (existing.results.some((e) => e.house_id === h.id)) continue;
    const orders = withRhythm(rhythmOf(game), () => planOrders(situation(botView(ctx, h), personalityOf(h))));
    for (const o of orders) {
      statements.push(
        db.prepare(
          "INSERT INTO orders (game_id, house_id, resolution_no, kind, from_tile_id, troops, jinetes, catapultas, captain, target_tile_id, supported_from_tile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
          o.kind === "move" ? o.to : o.target,
          o.kind === "support" ? o.supportedFrom : null,
        ),
      );
    }
  }
  if (statements.length > 0) await db.batch(statements);
}

/**
 * Los bots contestan las ofertas abiertas: la acepta el bot que más gane con
 * ella (según su personalidad); las dirigidas a un bot que no le convienen se rechazan.
 */
async function botsAnswerOffers(env: NotifyEnv, game: GameRow): Promise<void> {
  const db = env.DB;
  const { results: offers } = await db
    .prepare("SELECT * FROM offers WHERE game_id = ? AND status = 'open' ORDER BY id")
    .bind(game.id)
    .all<OfferRow>();
  if (offers.length === 0) return;
  for (const offer of offers) {
    // Recursos al día: cada trato cerrado los cambia.
    const ctx = await botContext(db, game);
    const bots = activeBots(ctx.houses, game).filter((h) => h.id !== offer.from_house_id);
    const candidates = offer.to_house_id == null ? bots : bots.filter((h) => h.id === offer.to_house_id);
    if (candidates.length === 0) continue;
    const give = bundle(offer, "give");
    const want = bundle(offer, "want");
    let best: { h: HouseRow; gain: number } | null = null;
    for (const h of candidates) {
      const gain = offerGain(situation(botView(ctx, h), personalityOf(h)), give, want, offer.from_house_id);
      if (gain > 0 && (!best || gain > best.gain)) best = { h, gain };
    }
    if (best) {
      await acceptOffer(env, game, offer, best.h);
    } else if (offer.to_house_id != null) {
      await db
        .prepare("UPDATE offers SET status = 'rejected', closed_at = ? WHERE id = ? AND status = 'open'")
        .bind(gameNow(game).toISOString(), offer.id)
        .run();
    }
  }
}

/** Borra una partida de prueba entera, con sus bots. */
export async function deleteTestGame(env: NotifyEnv, game: GameRow): Promise<void> {
  const db = env.DB;
  const houses = await loadHouses(db, game.id);
  const botUsers = houses.filter((h) => h.is_bot === 1).map((h) => h.user_id);
  const ids = houses.map((h) => h.id);
  const inHouses = ids.length ? `(${ids.join(",")})` : "(NULL)";
  // En orden, de lo que depende de otras cosas hacia arriba.
  await db.batch([
    db.prepare("DELETE FROM event_log WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM resolutions WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM orders WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM trades WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM offers WHERE game_id = ? AND parent_offer_id IS NOT NULL").bind(game.id),
    db.prepare("DELETE FROM offers WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM achievements WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM bids WHERE lot_id IN (SELECT id FROM auction_lots WHERE game_id = ?)").bind(game.id),
    db.prepare("DELETE FROM auction_lots WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM cards WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM game_events WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM bribes WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM bulletins WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM phrase_usage WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM prestige_snapshots WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM notifications WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM job_runs WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM tiles WHERE game_id = ?").bind(game.id),
    db.prepare(`DELETE FROM buildings WHERE house_id IN ${inHouses}`),
    db.prepare("DELETE FROM houses WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM games WHERE id = ?").bind(game.id),
    ...botUsers.map((u) => db.prepare("DELETE FROM users WHERE id = ?").bind(u)),
  ]);
}
