import { describe, expect, it } from "vitest";
import { combatResult, homeSummary, type HomeInput } from "../src/portada";

const base: HomeInput = {
  house: 1,
  status: "active",
  current: 4,
  total: 42,
  days: [0, 1, 2, 3, 4, 5, 6],
  ordersOpen: true,
  closeAt: "2026-10-23T19:00:00.000Z",
  orders: 0,
  combats: [],
  tileNames: new Map([
    [10, "Vado del Molino"],
    [11, "Peña Alta"],
    [12, "Robledal"],
  ]),
  bulletin: { week: 1, edition: "domingo" },
  offers: [],
  snapshots: [],
  map: null,
  final: null,
};

describe("portada: resumen de cada partida (bloque 7)", () => {
  it("dice qué noche se prepara, cuándo cierra y si faltan órdenes", () => {
    const s = homeSummary(base);
    expect(s).toMatchObject({ noche: 5, totalNoches: 42, semana: 1, cierre: base.closeAt, ordenesAbiertas: true, faltanOrdenes: true });
    expect(homeSummary({ ...base, orders: 3 }).faltanOrdenes).toBe(false);
    expect(homeSummary({ ...base, ordersOpen: false }).faltanOrdenes).toBe(false);
    expect(homeSummary({ ...base, current: 8 }).semana).toBe(2);
  });

  it("solo cuenta los combates de esta casa y cómo le fueron", () => {
    const combats = [
      { type: "combate", tile: 10, previousOwner: 1, winner: 1, conquered: false, sides: [{ house: 2 }] },
      { type: "combate", tile: 11, previousOwner: 3, winner: 1, conquered: true, sides: [{ house: 1 }] },
      // Entre otras dos casas: no sale.
      { type: "combate", tile: 12, previousOwner: 4, winner: 2, conquered: true, sides: [{ house: 2 }] },
    ];
    const s = homeSummary({ ...base, combats });
    expect(s.ataques).toEqual([
      { casilla: "Vado del Molino", resultado: "resistio" },
      { casilla: "Peña Alta", resultado: "conquista" },
    ]);
    expect(JSON.stringify(s)).not.toContain("Robledal");
  });

  it("distingue perder la casilla, fallar el ataque y ayudar a defender", () => {
    expect(combatResult({ previousOwner: 1, winner: 2, conquered: true }, 1)).toBe("perdida");
    expect(combatResult({ previousOwner: 2, winner: 2, conquered: false, sides: [{ house: 1 }] }, 1)).toBe("fallo");
    expect(combatResult({ previousOwner: 2, winner: 2, conquered: false, allies: [1] }, 1)).toBe("resistio");
    expect(combatResult({ previousOwner: 3, winner: 2, conquered: true, allies: [1] }, 1)).toBe("conquista");
  });

  it("cuenta solo las ofertas que esta casa puede aceptar", () => {
    const offers = [
      { from_house_id: 2, to_house_id: 1 },
      { from_house_id: 3, to_house_id: null },
      { from_house_id: 1, to_house_id: null },
      // Privada entre otras dos casas.
      { from_house_id: 2, to_house_id: 3 },
    ];
    expect(homeSummary({ ...base, offers }).ofertas).toBe(2);
  });

  it("clasifica por el Prestigio de la última noche y recuerda el puesto anterior", () => {
    const snapshots = [
      { house_id: 1, resolution_no: 3, total: 10 },
      { house_id: 2, resolution_no: 3, total: 12 },
      { house_id: 3, resolution_no: 3, total: 5 },
      { house_id: 1, resolution_no: 4, total: 20 },
      { house_id: 2, resolution_no: 4, total: 14 },
      { house_id: 3, resolution_no: 4, total: 20 },
    ];
    const s = homeSummary({ ...base, snapshots });
    // Empate a 20: primero la casa de número más bajo.
    expect(s.clasificacion).toEqual([
      { casa: 1, total: 20 },
      { casa: 3, total: 20 },
      { casa: 2, total: 14 },
    ]);
    expect(s.puesto).toBe(1);
    expect(s.puestoAntes).toBe(2);
  });

  it("el mini mapa lleva solo de quién es cada casilla, sin tropas", () => {
    const map = {
      cols: 2,
      rows: 1,
      tiles: [
        { x: 0, y: 0, type: "castillo", owner: 1, troops: 9 },
        { x: 1, y: 0, type: "bosque", owner: null, troops: 3 },
      ],
    };
    const s = homeSummary({ ...base, map });
    expect(s.mapa).toEqual({ columnas: 2, filas: 1, casillas: [[0, 0, 1, 1], [1, 0, 0, 0]] });
    expect(JSON.stringify(s.mapa)).not.toContain("9");
  });

  it("al acabar da el puesto final y no pide órdenes", () => {
    const s = homeSummary({
      ...base,
      status: "finished",
      current: 42,
      offers: [{ from_house_id: 2, to_house_id: 1 }],
      final: { winner: 2, ranking: [{ house: 2, total: 90 }, { house: 1, total: 80 }], at: "2026-12-06T21:00:00.000Z" },
    });
    expect(s).toMatchObject({
      noche: null,
      cierre: null,
      faltanOrdenes: false,
      ofertas: 0,
      puesto: 2,
      final: { ganador: 2, puesto: 2, fecha: "2026-12-06T21:00:00.000Z" },
    });
  });
});
