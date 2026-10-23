import { describe, expect, it } from "vitest";
import { AUCTION_H, AUCTION_W, LOT_X, lotAt, renderAuctionScene, type AuctionLotArt } from "../src/art/auctionScene";

const LOTS: AuctionLotArt[] = [
  { recursos: { madera: 30 }, sobres: 3, tuyo: true },
  { recursos: null, sobres: 1, tuyo: false },
  { recursos: { oro: 20, piedra: 20 }, sobres: 7, tuyo: false },
];
const input = { lots: LOTS, candle: 0.6, color: "#b3291d", hammer: false, frame: 0 };

describe("Escena de la Gran Subasta", () => {
  it("es determinista y tiñe tu sobre con el color de tu casa", () => {
    const a = renderAuctionScene(input);
    expect(renderAuctionScene(input).rgba).toEqual(a.rgba);
    expect(renderAuctionScene({ ...input, color: "#1b3c80" }).rgba).not.toEqual(a.rgba);
    // Sin tu sobre, el color de tu casa no cambia nada.
    const ajenos = LOTS.map((l) => ({ ...l, tuyo: false }));
    expect(renderAuctionScene({ ...input, lots: ajenos, color: "#1b3c80" }).rgba).toEqual(renderAuctionScene({ ...input, lots: ajenos }).rgba);
  });

  it("cada lote tiene su caja dentro del lienzo y se encuentra al tocarlo", () => {
    const img = renderAuctionScene(input);
    expect(img.boxes).toHaveLength(3);
    img.boxes.forEach(([x, y, w, h], i) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(AUCTION_W);
      expect(y + h).toBeLessThanOrEqual(AUCTION_H);
      expect(lotAt(img, x + w / 2, y + h / 2)).toBe(i);
    });
    expect(lotAt(img, 2, 2)).toBeNull();
    expect(LOT_X).toHaveLength(3);
  });

  it("la vela baja y, apagada, cambia; el mazo cae", () => {
    const llena = renderAuctionScene({ ...input, candle: 1 }).rgba;
    expect(renderAuctionScene({ ...input, candle: 0.1 }).rgba).not.toEqual(llena);
    expect(renderAuctionScene({ ...input, candle: 0 }).rgba).not.toEqual(renderAuctionScene({ ...input, candle: 0.01 }).rgba);
    expect(renderAuctionScene({ ...input, hammer: true }).rgba).not.toEqual(renderAuctionScene(input).rgba);
  });
});
