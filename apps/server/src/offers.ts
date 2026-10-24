// Ofertas de comercio en D1: tipos, vista para el cliente y aceptación atómica.
// La usan las rutas de la API y los bots de las partidas de prueba.

import { RESOURCES, TRADE, houseInSentence, noticeText, totalOf, type Resources } from "@reyes/engine";
import { randomCode } from "./auth";
import { notifyHouses, type NotifyEnv } from "./notify";
import { gameNow, type GameRow, type HouseRow } from "./state";

export interface OfferRow {
  id: number;
  game_id: number;
  from_house_id: number;
  to_house_id: number | null;
  parent_offer_id: number | null;
  give_pan: number; give_madera: number; give_piedra: number; give_hierro: number; give_oro: number;
  want_pan: number; want_madera: number; want_piedra: number; want_hierro: number; want_oro: number;
  status: "open" | "accepted" | "rejected" | "cancelled" | "countered";
  accepted_by: number | null;
  accept_token: string | null;
  created_at: string;
  closed_at: string | null;
  expires_after: number | null;
  expired: number;
  note: string | null;
}

/** Resolución tras la que se retira una oferta hecha ahora (bloque 10). */
export function offerExpiry(game: GameRow): number {
  return game.current_resolution + TRADE.offerNights;
}

/** Inserta una oferta (pública si `to` es null; contraoferta si lleva `parent`). La usan los bots. */
export function insertOfferStatement(
  db: D1Database,
  game: GameRow,
  o: { from: number; to: number | null; parent: number | null; give: Partial<Resources>; want: Partial<Resources>; note: string | null },
): D1PreparedStatement {
  const g = o.give;
  const w = o.want;
  return db
    .prepare(
      `INSERT INTO offers (game_id, from_house_id, to_house_id, parent_offer_id, expires_after, note,
         give_pan, give_madera, give_piedra, give_hierro, give_oro,
         want_pan, want_madera, want_piedra, want_hierro, want_oro, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      game.id, o.from, o.to, o.parent, offerExpiry(game), o.note ? [...o.note].slice(0, TRADE.noteMax).join("") : null,
      g.pan ?? 0, g.madera ?? 0, g.piedra ?? 0, g.hierro ?? 0, g.oro ?? 0,
      w.pan ?? 0, w.madera ?? 0, w.piedra ?? 0, w.hierro ?? 0, w.oro ?? 0,
      gameNow(game).toISOString(),
    );
}

/** Retira las ofertas abiertas que caducan con la resolución `n`. Va en el lote de la resolución. */
export function expireOffersStatement(db: D1Database, game: GameRow, n: number, now: Date): D1PreparedStatement {
  return db
    .prepare("UPDATE offers SET status = 'cancelled', expired = 1, closed_at = ? WHERE game_id = ? AND status = 'open' AND expires_after <= ?")
    .bind(now.toISOString(), game.id, n);
}

const RESOURCE_NAME: Record<keyof Resources, string> = { pan: "Pan", madera: "Madera", piedra: "Piedra", hierro: "Hierro", oro: "Oro" };

export function bundle(o: OfferRow, side: "give" | "want"): Resources {
  const out = {} as Resources;
  for (const r of RESOURCES) out[r] = o[`${side}_${r}` as keyof OfferRow] as number;
  return out;
}

export function offerView(o: OfferRow) {
  return {
    id: o.id,
    de: o.from_house_id,
    para: o.to_house_id,
    da: bundle(o, "give"),
    pide: bundle(o, "want"),
    estado: o.status,
    aceptadaPor: o.accepted_by,
    contraofertaDe: o.parent_offer_id,
    creada: o.created_at,
    caducaTras: o.expires_after,
    caducada: o.expired === 1,
    frase: o.note,
  };
}

/**
 * Aceptar: todo en un lote atómico. Primero se marca la oferta con un token
 * único; los recursos y el trato solo se aplican si el token es el nuestro.
 * Si a alguien le faltan recursos, la restricción CHECK deshace el lote entero.
 * Devuelve null si el trato se ha hecho, o el motivo si no.
 */
export async function acceptOffer(env: NotifyEnv, game: GameRow, offer: OfferRow, house: HouseRow): Promise<string | null> {
  const give = bundle(offer, "give");
  const want = bundle(offer, "want");
  if (RESOURCES.some((r) => house[r] < want[r])) return "No tienes lo que te piden.";

  const db = env.DB;
  const token = randomCode(16);
  const now = gameNow(game).toISOString();
  const mine = `(SELECT accept_token FROM offers WHERE id = ${offer.id}) = ?`;
  const delta = (sign: 1 | -1) =>
    RESOURCES.map((r) => sign * (give[r] - want[r])) as [number, number, number, number, number];
  try {
    await db.batch([
      db.prepare(
        "UPDATE offers SET status = 'accepted', accepted_by = ?, accept_token = ?, closed_at = ? WHERE id = ? AND status = 'open'",
      ).bind(house.id, token, now, offer.id),
      // Quien ofreció entrega "da" y recibe "pide".
      db.prepare(
        `UPDATE houses SET pan = pan + ?, madera = madera + ?, piedra = piedra + ?, hierro = hierro + ?, oro = oro + ? WHERE id = ? AND ${mine}`,
      ).bind(...delta(-1), offer.from_house_id, token),
      // Quien acepta entrega "pide" y recibe "da".
      db.prepare(
        `UPDATE houses SET pan = pan + ?, madera = madera + ?, piedra = piedra + ?, hierro = hierro + ?, oro = oro + ? WHERE id = ? AND ${mine}`,
      ).bind(...delta(1), house.id, token),
      db.prepare(
        `INSERT INTO trades (game_id, house_a, house_b, offer_id, amount_a, amount_b, at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${mine}`,
      ).bind(game.id, offer.from_house_id, house.id, offer.id, totalOf(give), totalOf(want), now, token),
    ]);
  } catch (err) {
    if (err instanceof Error && /CHECK constraint failed/.test(err.message)) {
      // Bloque 10: si a quien la hizo ya no le llega, la oferta se retira sola y se le avisa.
      const maker = await db
        .prepare("SELECT pan, madera, piedra, hierro, oro FROM houses WHERE id = ?")
        .bind(offer.from_house_id)
        .first<Resources>();
      const short = maker ? RESOURCES.filter((r) => maker[r] < give[r]) : [];
      if (short.length === 0) return "A alguna de las dos casas le faltan recursos: el trato no se ha hecho.";
      const withdrawn = await db
        .prepare("UPDATE offers SET status = 'cancelled', closed_at = ? WHERE id = ? AND status = 'open'")
        .bind(now, offer.id)
        .run();
      if (withdrawn.meta.changes > 0) {
        const lacking = short.map((r) => `${give[r] - maker![r]} de ${RESOURCE_NAME[r]}`).join(" y ");
        await notifyHouses(env, [offer.from_house_id], {
          kind: "oferta",
          title: "Oferta retirada",
          body: `${house.name} quiso aceptar tu oferta, pero te faltaban ${lacking}. La hemos retirado.`,
          url: `/partida/${game.id}`,
          dedupe: `retirada:${offer.id}`,
        });
      }
      return "Esa casa ya no tiene lo que ofrecía: la oferta se ha retirado.";
    }
    throw err;
  }
  const after = await db.prepare("SELECT accept_token FROM offers WHERE id = ?").bind(offer.id).first<{ accept_token: string }>();
  if (after?.accept_token !== token) return "Otra casa se te adelantó.";
  await notifyHouses(env, [offer.from_house_id], {
    kind: "trato",
    title: "Trato cerrado",
    body: noticeText("aviso.trato", offer.id, { jugador: houseInSentence(house.name) }),
    url: `/partida/${game.id}`,
    dedupe: `trato:${offer.id}`,
  });
  return null;
}
