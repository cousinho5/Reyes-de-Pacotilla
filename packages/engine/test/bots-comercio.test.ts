import { describe, expect, it } from "vitest";
import {
  BOT_TRADE,
  PERSONALITIES,
  PHRASES,
  TRADE,
  counterOffer,
  offerGain,
  offerNote,
  proposeOffer,
  simulateGame,
  situation,
  withdrawOffer,
  type AiView,
} from "../src";

// Comercio de los bots más humano (docs/bots.md, PR 3).

const view = (extra: Partial<AiView> = {}): AiView => ({
  house: 1,
  tiles: [{ id: 1, x: 0, y: 0, type: "castillo", owner: 1, troops: 6, fortifiedUntil: null, castleOf: 1 }],
  buildings: { granja: 2, aserradero: 2, cantera: 1, mina: 1, mercado: 1 },
  resources: { pan: 30, madera: 120, piedra: 5, hierro: 5, oro: 30 },
  nextResolution: 1,
  day: 2,
  totalDays: 14,
  objective: null,
  prestige: [
    { house: 1, total: 5 },
    { house: 2, total: 5 },
  ],
  recentPartners: [],
  ...extra,
});
const mercader = PERSONALITIES.mercader;

describe("Bots: comercio", () => {
  it("no comercian con quien les ha atacado hace poco", () => {
    expect(offerGain(situation(view(), mercader), { piedra: 12 }, { madera: 10 }, 2)).toBeGreaterThan(0);
    expect(offerGain(situation(view({ attackedBy: [2] }), mercader), { piedra: 12 }, { madera: 10 }, 2)).toBe(-Infinity);
  });

  it("con la misma casa, cada trato les apetece menos y hay un tope por semana", () => {
    const gain = (n: number) => offerGain(situation(view({ tradesWith: Array(n).fill(2) }), mercader), { piedra: 12 }, { madera: 10 }, 2);
    expect(gain(1)).toBeLessThan(gain(0));
    expect(gain(BOT_TRADE.perPartnerWeek)).toBe(-Infinity);
    // Con otra casa, nada cambia.
    expect(offerGain(situation(view({ tradesWith: [3, 3, 3] }), mercader), { piedra: 12 }, { madera: 10 }, 2)).toBe(gain(0));
  });

  it("si una oferta se queda cerca, contestan pidiendo lo mismo y dando menos", () => {
    // Ya comerció con la casa 2 esta semana: no cuenta el Prestigio del socio nuevo.
    const s = situation(view({ recentPartners: [2] }), PERSONALITIES.guerrero);
    // Le dan 20 de Pan por 25 de Oro: no le sale a cuenta tal cual.
    expect(offerGain(s, { pan: 20 }, { oro: 25 }, 2)).toBeLessThanOrEqual(0);
    const c = counterOffer(s, { pan: 20 }, { oro: 25 }, 2);
    expect(c).not.toBeNull();
    expect(c!.want).toEqual({ pan: 20 });
    expect(c!.give.oro).toBeLessThan(25);
    expect(c!.give.oro).toBeGreaterThanOrEqual(Math.floor(25 * BOT_TRADE.counterFloor));
    expect(offerGain(s, { pan: 20 }, c!.give, 2)).toBeGreaterThan(0);
  });

  it("no contestan lo que aceptarían, lo que está lejos ni a quien les atacó", () => {
    const s = situation(view(), mercader);
    expect(counterOffer(s, { piedra: 12 }, { madera: 10 }, 2)).toBeNull();
    expect(counterOffer(s, { pan: 1 }, { madera: 60 }, 2)).toBeNull();
    expect(counterOffer(situation(view({ attackedBy: [2] }), PERSONALITIES.guerrero), { pan: 20 }, { oro: 25 }, 2)).toBeNull();
  });

  it("retiran la oferta que nadie quiere y la vuelven a publicar más barata", () => {
    const s = situation(view({ day: 0, house: 1 }), mercader);
    const offer = proposeOffer(s)!;
    expect(withdrawOffer(s, offer.give, offer.want, 1)).toBe(false);
    expect(withdrawOffer(s, offer.give, offer.want, BOT_TRADE.staleDays)).toBe(true);
    // Si ya no tiene lo que ofrece, también.
    expect(withdrawOffer(s, { madera: 500 }, offer.want, 0)).toBe(true);
    const cheaper = proposeOffer(s, BOT_TRADE.repostDiscount)!;
    expect(cheaper.give).toEqual(offer.give);
    const sum = (b: object) => Object.values(b).reduce((a: number, v) => a + (v as number), 0);
    expect(sum(cheaper.want)).toBeLessThanOrEqual(sum(offer.want));
  });

  it("sus frases caben en la frase corta de una oferta", () => {
    for (const kind of ["oferta", "rebaja", "contraoferta"] as const) {
      const n = (PHRASES[`bot.${kind}`] as readonly string[]).length;
      for (let i = 0; i < n; i++) {
        const text = offerNote(kind, i, { give: { madera: 20 }, want: { hierro: 10 } });
        expect([...text].length).toBeLessThanOrEqual(TRADE.noteMax);
        expect(text).not.toMatch(/[{}]/);
      }
    }
  });
});

describe("Bots: simulador con personas de mentira", () => {
  it("anota lo que hace cada casa por semana y marca a las personas", () => {
    const g = simulateGame({ seed: "bots-pr3", strategies: ["mercader", "estratega", "guerrero", "arquitecta"], weeks: 2, humans: 2 });
    expect(g.houses.filter((h) => h.human).map((h) => h.house).sort()).toEqual([1, 2]);
    const all = g.houses.reduce((a, h) => a + h.log.ofertas[0]! + h.log.ofertas[1]!, 0);
    expect(all).toBeGreaterThan(0);
    for (const h of g.houses) expect(h.log.ataquesNeutrales).toHaveLength(2);
  });
});

describe("Bots: no se dejan timar", () => {
  it("ni por ganar un socio nuevo aceptan algo que vale mucho menos de lo que dan", () => {
    const rich = view({ resources: { pan: 60, madera: 60, piedra: 60, hierro: 60, oro: 60 } });
    const s = situation(rich, mercader);
    expect(offerGain(s, { pan: 10 }, { piedra: 30 }, 2)).toBe(-Infinity);
  });
});
