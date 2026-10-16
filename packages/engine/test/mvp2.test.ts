import { describe, expect, it } from "vitest";
import { OBJECTIVE_KEYS, checkOffer, cleanBundle, dealObjectives, objectiveMet, planAutopilot, type Tile } from "../src";

const levels = { granja: 2, aserradero: 2, cantera: 1, mina: 1, mercado: 1 } as const;
const rich = { pan: 100, madera: 100, piedra: 100, hierro: 100, oro: 100 };

describe("Comercio", () => {
  it("limpia cantidades y rechaza las raras", () => {
    expect(cleanBundle({ pan: 5, oro: 0, madera: 3 })).toEqual({ pan: 5, madera: 3 });
    expect(cleanBundle({ pan: -1 })).toBeNull();
    expect(cleanBundle({ pan: 2.5 })).toBeNull();
  });
  it("hay que dar y pedir algo, distinto, y tener lo que se ofrece", () => {
    expect(checkOffer({ pan: 10 }, { hierro: 5 }, rich).ok).toBe(true);
    expect(checkOffer({ pan: 10 }, {}, rich).ok).toBe(false);
    expect(checkOffer({ pan: 10 }, { pan: 5 }, rich).ok).toBe(false);
    expect(checkOffer({ pan: 1000 }, { hierro: 5 }, rich).ok).toBe(false);
  });
});

describe("Objetivos secretos", () => {
  it("reparto reproducible: dos objetivos distintos por casa y poco repetidos", () => {
    const houses = [1, 2, 3, 4, 5];
    const a = dealObjectives("semilla", houses);
    expect(dealObjectives("semilla", houses)).toEqual(a);
    for (const [x, y] of a.values()) expect(x).not.toBe(y);
    const all = [...a.values()].flat();
    // 5 casas x 2 = 10 objetivos distintos: no se repite ninguno mientras quedan en el mazo.
    expect(new Set(all).size).toBe(10);
    expect(OBJECTIVE_KEYS.length).toBeGreaterThanOrEqual(10);
  });

  it("evalúa los objetivos con el estado final", () => {
    const tiles: Pick<Tile, "type" | "owner" | "troops">[] = [
      { type: "castillo", owner: 1, troops: 20 },
      { type: "puerto", owner: 1, troops: 6 },
      { type: "puerto", owner: 1, troops: 5 },
      { type: "fortaleza", owner: 2, troops: 9 },
    ];
    const ctx = {
      house: 1,
      tiles,
      buildings: { ...levels, mercado: 5 },
      gold: 120,
      partnersAllGame: 2,
      otherHouses: 3,
      validTradesAllGame: 4,
      tilesTakenFromHouses: 2,
      auctionsWon: 1,
    };
    expect(objectiveMet("puerto_y_fortaleza", ctx)).toBe(false);
    expect(objectiveMet("tesoro", ctx)).toBe(false);
    expect(objectiveMet("tesoro", { ...ctx, gold: 150 })).toBe(true);
    expect(objectiveMet("tropas_40", ctx)).toBe(false);
    expect(objectiveMet("tropas_40", { ...ctx, tiles: [...ctx.tiles, { type: "campos", owner: 1, troops: 40 }] })).toBe(true);
    expect(objectiveMet("obra_maestra", ctx)).toBe(true);
    expect(objectiveMet("fortaleza", ctx)).toBe(false);
    expect(objectiveMet("comercio_con_tres", ctx)).toBe(false);
    expect(objectiveMet("comercio_con_tres", { ...ctx, partnersAllGame: 3 })).toBe(true);
    // Con solo 2 rivales basta comerciar con los dos.
    expect(objectiveMet("comercio_con_tres", { ...ctx, otherHouses: 2 })).toBe(true);
    expect(objectiveMet("niveles_17", ctx)).toBe(false);
    expect(objectiveMet("niveles_17", { ...ctx, buildings: { granja: 4, aserradero: 4, cantera: 3, mina: 3, mercado: 3 } })).toBe(true);
    expect(objectiveMet("casillas_ajenas", ctx)).toBe(false);
    expect(objectiveMet("casillas_ajenas", { ...ctx, tilesTakenFromHouses: 3 })).toBe(true);
    expect(objectiveMet("dos_puertos" as never, ctx)).toBe(false); // retirado del catálogo
    expect(objectiveMet("subastas", ctx)).toBe(false);
    expect(objectiveMet("subastas", { ...ctx, auctionsWon: 3 })).toBe(true);
  });
});

describe("Piloto automático", () => {
  const tiles: Tile[] = [
    { id: 1, x: 0, y: 0, type: "castillo", owner: 1, troops: 6, castleOf: 1 },
    { id: 2, x: 1, y: 0, type: "campos", owner: 1, troops: 3 },
    { id: 3, x: 2, y: 0, type: "bosque", owner: 2, troops: 8 },
  ];
  const base = { day: 0, house: 1, tiles, buildings: { ...levels }, nextResolution: 3 };

  it("económica: mejora el edificio de menor nivel que pueda pagar", () => {
    const plan = planAutopilot({ ...base, template: "economica", resources: { ...rich } });
    expect(plan.upgrade).toBe("cantera");
    expect(plan.cost).toEqual({ madera: 15, piedra: 10 });
  });

  it("defensiva: fortifica la casilla amenazada y recluta guardando Pan", () => {
    const plan = planAutopilot({ ...base, template: "defensiva", resources: { ...rich } });
    expect(plan.fortify).toEqual({ tile: 2, until: 4 });
    expect(plan.recruit).toBe(10);
    expect(plan.upgrade).toBeNull();
  });

  it("nunca gasta lo que no tiene", () => {
    const poor = { pan: 2, madera: 0, piedra: 0, hierro: 1, oro: 0 };
    const plan = planAutopilot({ ...base, template: "defensiva", resources: poor });
    expect(plan).toMatchObject({ fortify: null, recruit: 0, upgrade: null });
  });

  it("equilibrada: alterna económica y defensiva según el día", () => {
    expect(planAutopilot({ ...base, template: "equilibrada", day: 2, resources: { ...rich } }).upgrade).toBe("cantera");
    expect(planAutopilot({ ...base, template: "equilibrada", day: 3, resources: { ...rich } }).fortify).not.toBeNull();
  });
});
