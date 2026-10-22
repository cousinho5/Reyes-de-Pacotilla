import { describe, expect, it } from "vitest";
import {
  ANY_ORIGIN,
  PERSONALITIES,
  auctionLots,
  planBids,
  planCards,
  checkOrders,
  chooseObjective,
  offerGain,
  planDay,
  planOrders,
  proposeOffer,
  resolveCampaign,
  situation,
  type AiView,
  type Tile,
} from "../src";

const tile = (id: number, x: number, y: number, extra: Partial<Tile>): Tile => ({
  id,
  x,
  y,
  type: "campos",
  owner: null,
  troops: 4,
  fortifiedUntil: null,
  ...extra,
});

const view = (tiles: Tile[], extra: Partial<AiView> = {}): AiView => ({
  house: 1,
  tiles,
  buildings: { granja: 2, aserradero: 2, cantera: 1, mina: 1, mercado: 1 },
  resources: { pan: 30, madera: 30, piedra: 30, hierro: 30, oro: 30 },
  nextResolution: 1,
  day: 2,
  totalDays: 42,
  objective: null,
  prestige: [
    { house: 1, total: 5 },
    { house: 2, total: 5 },
  ],
  recentPartners: [],
  ...extra,
});

const estratega = PERSONALITIES.estratega;

describe("Bots con personalidad: órdenes", () => {
  it("atacan con una casilla y apoyan desde otra vecina, y la toman", () => {
    const tiles = [
      tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 0 }),
      tile(2, 1, 0, { owner: 1, troops: 4 }),
      tile(3, 0, 1, { owner: 1, troops: 6 }),
      tile(4, 1, 1, { type: "campos", troops: 4 }), // defensa 5: el estratega quiere 7
    ];
    const orders = planOrders(situation(view(tiles), estratega));
    expect(orders).toContainEqual({ kind: "move", house: 1, from: 3, to: 4, troops: 6 });
    expect(orders.some((o) => o.kind === "support" && o.from === 2 && o.target === 4 && o.supportedFrom === ANY_ORIGIN)).toBe(true);
    expect(checkOrders(tiles, orders).invalid).toEqual([]);
    const result = resolveCampaign({ resolution: 1, tiles, orders });
    expect(result.tiles.find((t) => t.id === 4)!.owner).toBe(1);
  });

  it("las tropas de guardia no se mueven, pero sí apoyan (el apoyo no sale de su casilla)", () => {
    const tiles = [
      tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 0 }),
      tile(2, 1, 0, { owner: 1, troops: 10 }), // amenazada por la casa 2: se queda de guardia
      tile(5, 2, 0, { owner: 2, troops: 20 }),
      tile(3, 0, 1, { owner: 1, troops: 3 }),
      tile(4, 1, 1, { type: "campos", troops: 4 }),
    ];
    const orders = planOrders(situation(view(tiles), estratega));
    expect(orders.some((o) => o.kind === "move" && o.from === 2)).toBe(false);
    expect(orders.some((o) => o.kind === "support" && o.from === 2 && o.target === 4)).toBe(true);
    expect(checkOrders(tiles, orders).invalid).toEqual([]);
  });

  it("refuerzan una casilla amenazada desde una vecina tranquila", () => {
    const tiles = [
      tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 12 }),
      tile(2, 1, 0, { owner: 1, troops: 1 }),
      tile(3, 2, 0, { owner: 2, troops: 8 }),
    ];
    const orders = planOrders(situation(view(tiles), estratega));
    expect(orders.some((o) => o.kind === "move" && o.from === 1 && o.to === 2)).toBe(true);
  });

  it("solo usan lo que verían: lo que pasa lejos no cambia sus decisiones", () => {
    const base = [
      tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 10 }),
      tile(2, 1, 0, { troops: 4 }),
      tile(3, 4, 4, { owner: 2, troops: 5 }),
    ];
    const far = base.map((t) => (t.id === 3 ? { ...t, troops: 99 } : t));
    expect(planOrders(situation(view(far), estratega))).toEqual(planOrders(situation(view(base), estratega)));
    expect(planDay(situation(view(far), estratega))).toEqual(planDay(situation(view(base), estratega)));
  });

  it("son deterministas y no modifican la entrada", () => {
    const tiles = [tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 10 }), tile(2, 1, 0, {})];
    const v = view(tiles);
    const copy = JSON.parse(JSON.stringify(v)) as AiView;
    expect(planOrders(situation(v, estratega))).toEqual(planOrders(situation(v, estratega)));
    planDay(situation(v, estratega));
    expect(v).toEqual(copy);
  });
});

describe("Bots con personalidad: el día", () => {
  const tiles = [
    tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 6 }),
    tile(2, 1, 0, { troops: 4 }),
  ];

  it("nunca gastan lo que no tienen y guardan el Pan del domingo", () => {
    for (const p of Object.values(PERSONALITIES)) {
      const v = view(tiles, { day: 5 });
      const s = situation(v, p);
      const plan = planDay(s);
      for (const [r, n] of Object.entries(plan.cost)) expect(n).toBeLessThanOrEqual(v.resources[r as keyof typeof v.resources]);
      expect(v.resources.pan - plan.cost.pan).toBeGreaterThanOrEqual(Math.min(v.resources.pan, s.panReserve));
    }
  });

  it("la arquitecta construye más y el guerrero recluta más", () => {
    const v = view(tiles, { resources: { pan: 60, madera: 60, piedra: 60, hierro: 60, oro: 60 } });
    const a = planDay(situation(v, PERSONALITIES.arquitecta));
    const g = planDay(situation(v, PERSONALITIES.guerrero));
    expect(a.upgrades.length).toBeGreaterThanOrEqual(g.upgrades.length);
    expect(g.recruit).toBeGreaterThanOrEqual(a.recruit);
  });

  it("en la última semana convierten lo que sobra en mejoras", () => {
    const rich = { pan: 10, madera: 230, piedra: 230, hierro: 60, oro: 80 };
    const early = planDay(situation(view(tiles, { resources: rich, day: 3 }), PERSONALITIES.guerrero));
    const late = planDay(situation(view(tiles, { resources: rich, day: 40 }), PERSONALITIES.guerrero));
    expect(late.upgrades.length).toBeGreaterThan(early.upgrades.length);
  });
});

describe("Bots con personalidad: comercio y objetivos", () => {
  const tiles = [tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 6 })];

  it("ofrecen lo que les sobra por lo que les falta", () => {
    const v = view(tiles, { day: 0, house: 1, resources: { pan: 30, madera: 120, piedra: 5, hierro: 0, oro: 30 } });
    const offer = proposeOffer(situation(v, PERSONALITIES.mercader));
    expect(offer).not.toBeNull();
    expect(Object.keys(offer!.give)).toEqual(["madera"]);
    expect(Object.keys(offer!.want)).not.toContain("madera");
  });

  it("aceptan tratos que les convienen, más si el socio es nuevo, y nunca lo que no pueden pagar", () => {
    const v = view(tiles, { resources: { pan: 30, madera: 120, piedra: 5, hierro: 5, oro: 30 } });
    const s = situation(v, PERSONALITIES.mercader);
    expect(offerGain(s, { piedra: 12 }, { madera: 10 }, 2)).toBeGreaterThan(0);
    expect(offerGain(s, { piedra: 12 }, { hierro: 10 }, 2)).toBe(-Infinity);
    const withPartner = situation({ ...v, recentPartners: [2] }, PERSONALITIES.mercader);
    expect(offerGain(s, { piedra: 12 }, { madera: 10 }, 2)).toBeGreaterThan(offerGain(withPartner, { piedra: 12 }, { madera: 10 }, 2));
  });

  it("eligen el objetivo secreto que encaja con su forma de jugar", () => {
    expect(chooseObjective(["casillas_ajenas", "obra_maestra"], PERSONALITIES.arquitecta)).toBe("obra_maestra");
    expect(chooseObjective(["casillas_ajenas", "obra_maestra"], PERSONALITIES.guerrero)).toBe("casillas_ajenas");
    expect(chooseObjective(["comercio_con_tres", "tropas_40"], PERSONALITIES.mercader)).toBe("comercio_con_tres");
  });
});

describe("Bots con personalidad: subasta y cartas", () => {
  const tiles = [
    tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 6 }),
    tile(2, 1, 0, { owner: 1, troops: 1 }),
    tile(3, 2, 0, { owner: 2, troops: 9 }),
  ];

  it("pujan con parte de su Oro y nunca más de lo que tienen", () => {
    const v = view(tiles, { resources: { pan: 30, madera: 30, piedra: 30, hierro: 30, oro: 60 } });
    const bids = planBids(situation(v, PERSONALITIES.mercader), auctionLots("s", 1));
    expect(bids.length).toBeGreaterThan(0);
    expect(bids.reduce((a, b) => a + b.amount, 0)).toBeLessThanOrEqual(60);
    expect(planBids(situation({ ...v, resources: { ...v.resources, oro: 0 } }, PERSONALITIES.mercader), auctionLots("s", 1))).toEqual([]);
  });

  it("usan Mercenarios al momento y guardan la Tregua para el día de la resolución", () => {
    const s = situation(view(tiles), PERSONALITIES.estratega);
    const now = planCards(s, ["mercenarios", "tregua"], false).map((c) => c.card);
    expect(now).toEqual(["mercenarios"]);
    const later = planCards(s, ["tregua"], true);
    expect(later).toEqual([{ card: "tregua", params: { casilla: 2 } }]);
  });
});
