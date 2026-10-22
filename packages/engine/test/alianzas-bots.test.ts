// Bots y alianzas (bloque 8, fase 5): proponen, aceptan, rompen y las usan.
import { describe, expect, it } from "vitest";
import { PERSONALITIES, allianceAppetite, planDiplomacy, planOrders, simulateGame, situation, type AiView, type Alliance, type Tile } from "../src";

const A = 1;
const B = 2;
const C = 3;

const field = (id: number, x: number, owner: number | null, troops: number, extra: Partial<Tile> = {}): Tile => ({
  id,
  x,
  y: 0,
  type: "campos",
  owner,
  troops,
  ...extra,
});
const view = (house: number, tiles: Tile[], extra: Partial<AiView> = {}): AiView => ({
  house,
  tiles,
  buildings: { granja: 2, aserradero: 1, cantera: 1, mina: 1, mercado: 1 },
  resources: { pan: 50, madera: 50, piedra: 50, hierro: 50, oro: 50 },
  nextResolution: 1,
  day: 0,
  totalDays: 42,
  objective: null,
  prestige: [
    { house: A, total: 10 },
    { house: B, total: 10 },
    { house: C, total: 30 },
  ],
  recentPartners: [],
  ...extra,
});
// A en x0-x1, B en x2-x3 y C (el líder) en x4.
const tiles = (): Tile[] => [
  { ...field(1, 0, A, 3), type: "castillo", castleOf: A },
  field(2, 1, A, 4),
  field(3, 2, B, 4),
  field(4, 3, B, 4),
  field(5, 4, C, 4),
];
const ctx = { received: [], sent: [], cooldown: false, blocked: [] };

describe("diplomacia de los bots", () => {
  it("el mercader propone alianza a su vecina, que no es el líder; el guerrero no", () => {
    const s = situation(view(A, tiles()), PERSONALITIES.mercader);
    expect(allianceAppetite(s)).toBeGreaterThan(0.2);
    expect(planDiplomacy(s, ctx).propose).toBe(B);
    expect(planDiplomacy(situation(view(A, tiles()), PERSONALITIES.guerrero), ctx).propose).toBeNull();
  });

  it("nunca propone al líder", () => {
    const s = situation(view(B, tiles()), PERSONALITIES.mercader);
    expect(planDiplomacy(s, ctx).propose).toBe(A);
  });

  it("acepta si quien propone no es el líder y no le ha atacado; si no, rechaza", () => {
    const s = situation(view(B, tiles()), PERSONALITIES.arquitecta);
    expect(planDiplomacy(s, { ...ctx, received: [A] }).accept).toEqual([A]);
    const angry = situation(view(B, tiles(), { attackedBy: [A] }), PERSONALITIES.arquitecta);
    expect(planDiplomacy(angry, { ...ctx, received: [A] }).decline).toEqual([A]);
    expect(planDiplomacy(s, { ...ctx, received: [C] }).decline).toEqual([C]);
    expect(planDiplomacy(s, { ...ctx, received: [A], cooldown: true }).decline).toEqual([A]);
  });

  it("rompe cuando el aliado pasa a ser el líder", () => {
    const alliances: Alliance[] = [{ a: B, b: C, status: "active", endsAt: null, since: 1 }];
    const s = situation(view(B, tiles(), { alliances }), PERSONALITIES.oportunista);
    expect(planDiplomacy(s, ctx).break).toEqual([C]);
  });

  it("no ataca a un aliado y se suma al ataque que ya ha mandado", () => {
    const t = [{ ...field(1, 0, A, 0), type: "castillo" as const, castleOf: A }, field(2, 1, A, 6), field(3, 2, null, 6), field(4, 3, B, 6)];
    const alliances: Alliance[] = [{ a: A, b: B, status: "active", endsAt: null, since: 1 }];
    const alone = planOrders(situation(view(A, t, { alliances }), PERSONALITIES.estratega));
    expect(alone.some((o) => o.kind === "move" && o.to === 3)).toBe(false);
    const joined = planOrders(
      situation(view(A, t, { alliances, allyOrders: [{ kind: "move", house: B, from: 4, to: 3, troops: 6 }] }), PERSONALITIES.estratega),
    );
    expect(joined.some((o) => o.kind === "move" && o.to === 3)).toBe(true);
    // A la casilla aliada nunca la ataca.
    const vsAlly = planOrders(situation(view(A, [...t.slice(0, 2), field(3, 2, B, 1)], { alliances }), PERSONALITIES.guerrero));
    expect(vsAlly.some((o) => o.kind === "move" && o.to === 3)).toBe(false);
  });

  it("las tropas de paso vuelven a casa", () => {
    const t = [{ ...field(1, 0, A, 2), type: "castillo" as const, castleOf: A }, field(2, 1, A, 1), field(3, 2, B, 2, { guests: [{ house: A, troops: 3 }] })];
    const alliances: Alliance[] = [{ a: A, b: B, status: "active", endsAt: null, since: 1 }];
    const orders = planOrders(situation(view(A, t, { alliances }), PERSONALITIES.estratega));
    expect(orders).toContainEqual({ kind: "move", house: A, from: 3, to: 2, troops: 3, guest: true });
  });
});

describe("simulador con alianzas", () => {
  it("los bots firman alianzas y la partida sigue siendo determinista", () => {
    const opts = { seed: "alianzas-1", strategies: ["mercader", "arquitecta", "estratega", "guerrero", "oportunista"] as const, weeks: 4 as const };
    const a = simulateGame({ ...opts, strategies: [...opts.strategies] });
    const b = simulateGame({ ...opts, strategies: [...opts.strategies] });
    expect(a.alliances.signed).toBeGreaterThan(0);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
