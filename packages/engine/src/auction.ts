// Gran Subasta: lotes de la semana (reproducibles a partir de la semilla) y
// resolución de las pujas ciegas en Oro.

import { CARD_KEYS, CARDS, type CardKey } from "./cards";
import { seededRandom, shuffle } from "./random";
import { AUCTION } from "./rules";
import { RESOURCES, type HouseId, type Resource, type Resources } from "./types";

export type Lot =
  | { slot: number; kind: "resources"; resources: Partial<Resources> }
  | { slot: number; kind: "card"; card: CardKey };

/** Los tres lotes de una semana. Mismo `seed` y semana, mismos lotes. */
export function auctionLots(seed: string, week: number): Lot[] {
  const rand = seededRandom(`${seed}:subasta:${week}`);
  const resourceLot = (slot: number): Lot => {
    const [a, b] = shuffle([...RESOURCES], rand) as [Resource, Resource];
    return rand() < 0.5
      ? { slot, kind: "resources", resources: { [a]: AUCTION.singleResource } }
      : { slot, kind: "resources", resources: { [a]: AUCTION.doubleResource, [b]: AUCTION.doubleResource } };
  };
  const cards = shuffle([...CARD_KEYS], rand);
  const lots: Lot[] = [resourceLot(1), { slot: 2, kind: "card", card: cards[0]! }];
  lots.push(rand() < AUCTION.thirdIsCard ? { slot: 3, kind: "card", card: cards[1]! } : resourceLot(3));
  return lots;
}

export function lotLabel(lot: Lot): string {
  if (lot.kind === "card") return `la carta ${CARDS[lot.card].nombre}`;
  const names: Record<Resource, string> = { pan: "Pan", madera: "Madera", piedra: "Piedra", hierro: "Hierro", oro: "Oro" };
  return (Object.entries(lot.resources) as [Resource, number][]).map(([r, n]) => `${n} de ${names[r]}`).join(" y ");
}

export interface Bid {
  slot: number;
  house: HouseId;
  amount: number;
  /** Orden en que quedó la puja (para desempatar: gana la más temprana). */
  placedAt: string;
}

export interface AuctionResult {
  slot: number;
  winner: HouseId | null;
  price: number;
}

/**
 * Resuelve los lotes en orden. Gana la puja más alta (en empate, la más
 * temprana) de quien aún pueda pagarla: si a alguien no le llega el Oro tras
 * ganar otros lotes, se pasa a la siguiente puja.
 */
export function resolveAuction(lots: Lot[], bids: Bid[], gold: Map<HouseId, number>): AuctionResult[] {
  const left = new Map(gold);
  return [...lots]
    .sort((a, b) => a.slot - b.slot)
    .map((lot) => {
      const ranked = bids
        .filter((b) => b.slot === lot.slot && b.amount > 0)
        .sort((a, b) => b.amount - a.amount || a.placedAt.localeCompare(b.placedAt) || a.house - b.house);
      const win = ranked.find((b) => (left.get(b.house) ?? 0) >= b.amount);
      if (!win) return { slot: lot.slot, winner: null, price: 0 };
      left.set(win.house, (left.get(win.house) ?? 0) - win.amount);
      return { slot: lot.slot, winner: win.house, price: win.amount };
    });
}
