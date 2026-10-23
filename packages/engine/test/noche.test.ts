// Bloque 3, paso 3: la repetición narrada.
import { describe, expect, it } from "vitest";
import { PHRASES, combatNotice, narrateNight, noticeText, type NightStepFacts } from "../src";

const names: Record<number, string> = { 1: "Casa del Nabo", 2: "Los Pocapena" };
const tiles: Record<number, string> = { 10: "Villa Mediocre", 11: "Peñasco Triste", 12: "Charca Real" };
const ctx = (me: number | null = null) => ({ seed: "p1:7", me, houseName: (id: number) => names[id], tileName: (id: number) => tiles[id] });
const fight = (tile: number, winner: number | null, previousOwner: number | null, conquered: boolean, def: number, atk: number, attacker = 1): NightStepFacts => ({
  kind: "combate",
  data: {
    tile,
    winner,
    previousOwner,
    conquered,
    sides: [
      { house: previousOwner, role: "defensa", strength: def, troops: def, supporters: [] },
      { house: attacker, role: "ataque", strength: atk, troops: atk, supporters: [] },
    ],
  },
});
const fromBank = (key: keyof typeof PHRASES, line: string) =>
  (PHRASES[key] as readonly string[]).some((t) => {
    const re = new RegExp("^" + t.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{[^}]+\}/g, ".+") + "$", "i");
    return re.test(line);
  });

describe("repetición narrada", () => {
  const night: NightStepFacts[] = [
    { kind: "marcha" },
    fight(10, 1, 2, true, 4, 7),
    fight(11, 2, 2, false, 6, 3),
    fight(12, 1, null, true, 2, 5),
    { kind: "rebote", data: { tile: 11, houses: [1, 2], strength: 4 } },
    { kind: "asedio", data: [{ house: 1, tile: 11, nights: 2 }] },
    { kind: "repliegue", data: [{ house: 1, troops: 1, to: 12 }] },
    { kind: "fin" },
  ];

  it("cuenta cada paso con una frase del banco y las cifras exactas", () => {
    const l = narrateNight(night, ctx());
    expect(l[0]).toBeNull();
    expect(fromBank("noche.gana", l[1]!)).toBe(true);
    expect(l[1]).toMatch(/7/);
    expect(l[1]).toMatch(/4/);
    expect(fromBank("noche.resiste", l[2]!)).toBe(true);
    expect(fromBank("noche.neutral", l[3]!)).toBe(true);
    expect(fromBank("noche.rebote", l[4]!)).toBe(true);
    expect(fromBank("noche.asedio", l[5]!)).toBe(true);
    expect(fromBank("noche.repliegue", l[6]!)).toBe(true);
    expect(fromBank("noche.fin", l[7]!)).toBe(true);
    for (const x of l) if (x) expect(x).not.toMatch(/\{[a-z_]+\}/);
  });

  it("dice siempre lo mismo para la misma noche y no repite variante", () => {
    expect(narrateNight(night, ctx())).toEqual(narrateNight(night, ctx()));
    const many = Array.from({ length: 6 }, () => fight(10, 1, 2, true, 4, 7));
    const l = narrateNight(many, ctx());
    expect(new Set(l).size).toBe(6);
  });

  it("habla de vuestra merced solo en los combates de la casa que mira", () => {
    const l = narrateNight(night, ctx(1));
    expect(fromBank("noche.ganas", l[1]!)).toBe(true);
    expect(fromBank("noche.fallas", l[2]!)).toBe(true);
    expect(fromBank("noche.neutral_tu", l[3]!)).toBe(true);
    expect(fromBank("noche.rebote", l[4]!)).toBe(true);
    const def = narrateNight(night, ctx(2));
    expect(fromBank("noche.pierdes", def[1]!)).toBe(true);
    expect(fromBank("noche.resistes", def[2]!)).toBe(true);
  });

  it("sin frase cuando hay varios asedios o el choque no tiene ganador", () => {
    const l = narrateNight(
      [
        { kind: "asedio", data: [{ house: 1, tile: 11, nights: 2 }, { house: 2, tile: 10, nights: 1 }] },
        { kind: "choque", data: { tiles: [10, 11], winner: null, sides: [{ house: 1 }, { house: 2 }] } },
      ],
      ctx(),
    );
    expect(l).toEqual([null, null]);
  });
});

describe("avisos con frases del banco", () => {
  const combat = (tile: number, winner: number | null, previousOwner: number | null, conquered: boolean, attacker: number, survivors: number) =>
    ({
      type: "combate",
      tile,
      winner,
      previousOwner,
      conquered,
      survivors,
      sides: [
        { house: previousOwner, role: "defensa", strength: 3, troops: 3, supporters: [] },
        { house: attacker, role: "ataque", strength: 5, troops: 5, supporters: [] },
      ],
    }) as const;

  it("elige primero lo que pierde la casa y cuenta los demás combates", () => {
    const events = [combat(10, 1, null, true, 1, 4), combat(11, 2, 1, true, 2, 2), { type: "repliegue", house: 1, from: 12, to: 10, troops: 2, arrived: true } as const];
    expect(combatNotice(events as never, 1)).toEqual({ key: "aviso.combate_pierde", tile: 11, troops: 0, more: 1 });
    expect(combatNotice(events as never, 2)).toEqual({ key: "aviso.combate_gana", tile: 11, troops: 2, more: 0 });
    expect(combatNotice(events as never, 3)).toBeNull();
  });

  it("un ataque fallido cuenta las tropas que vuelven", () => {
    const events = [combat(12, 2, 2, false, 1, 1), { type: "repliegue", house: 1, from: 12, to: 10, troops: 2, arrived: true }];
    expect(combatNotice(events as never, 1)).toMatchObject({ key: "aviso.combate_falla", troops: 2 });
    expect(combatNotice(events as never, 2)).toMatchObject({ key: "aviso.combate_resiste", troops: 1 });
  });

  it("rellena la variante con las cifras y mayúscula, dando la vuelta al número", () => {
    const t = noticeText("aviso.combate_falla", 3, { casilla: "Villa Mediocre", m: 2 });
    expect(t).toBe(noticeText("aviso.combate_falla", 0, { casilla: "Villa Mediocre", m: 2 }));
    expect(t).toContain("2 tropas");
    expect(noticeText("aviso.trato", 7, { jugador: "los Pocapena" })).toMatch(/^[A-ZÁÉÍÓÚ¡]/);
  });
});
