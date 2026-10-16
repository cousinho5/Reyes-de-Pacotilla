// Ofertas de comercio en D1: tipos, vista para el cliente y aceptación atómica.
// La usan las rutas de la API y los bots de las partidas de prueba.

import { RESOURCES, totalOf, type Resources } from "@reyes/engine";
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
}

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
      return "A alguna de las dos casas le faltan recursos: el trato no se ha hecho.";
    }
    throw err;
  }
  const after = await db.prepare("SELECT accept_token FROM offers WHERE id = ?").bind(offer.id).first<{ accept_token: string }>();
  if (after?.accept_token !== token) return "Otra casa se te adelantó.";
  await notifyHouses(env, [offer.from_house_id], {
    kind: "trato",
    title: "Trato cerrado",
    body: `${house.name} ha aceptado tu oferta. Ambas partes creen haber ganado.`,
    url: `/partida/${game.id}`,
    dedupe: `trato:${offer.id}`,
  });
  return null;
}
