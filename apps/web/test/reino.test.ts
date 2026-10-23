// Bloque 11: clasificación con flechas desde la noche anterior y la gráfica de la carrera.
import { describe, expect, it } from "vitest";
import type { EventView, GameState, HouseInfo } from "../src/api";
import { byNight, chaserLine, chronicleFilter, involves, podiumLine, racePoints, standings } from "../src/realm";

const house = (id: number, total: number): HouseInfo =>
  ({ id, nombre: `Casa ${id}`, color: "gules", lema: null, prestigio: { total } }) as unknown as HouseInfo;

const game = (totals: number[], over: Partial<GameState> = {}): GameState =>
  ({
    partida: { estado: "active", resolucionActual: 9, final: null },
    yo: { casa: 1 },
    casas: totals.map((t, i) => house(i + 1, t)).sort((a, b) => b.prestigio!.total - a.prestigio!.total),
    ...over,
  }) as unknown as GameState;

describe("Clasificación de Reino", () => {
  it("ordena por Prestigio y dice cuánto falta para el primero", () => {
    const rows = standings(game([10, 30, 20, 5]));
    expect(rows.map((r) => [r.house.id, r.place, r.behind])).toEqual([
      [2, 1, 0],
      [3, 2, 10],
      [1, 3, 20],
      [4, 4, 25],
    ]);
  });

  it("las flechas comparan con el puesto de la noche anterior", () => {
    const rows = standings(game([30, 20, 10], { historia: { semanas: [], anterior: { resolucion: 8, totales: { 1: 5, 2: 20, 3: 10 } }, final: null } }));
    expect(rows.map((r) => [r.house.id, r.move])).toEqual([
      [1, 2],
      [2, -1],
      [3, -1],
    ]);
  });

  it("sin foto de la noche anterior no hay flechas", () => {
    expect(standings(game([3, 2])).every((r) => r.move === null)).toBe(true);
  });

  it("al acabar manda el orden del final, con el objetivo secreto", () => {
    const g = game([30, 20], { partida: { estado: "finished", resolucionActual: 14, final: { winner: 2, ranking: [{ house: 2, total: 34 }, { house: 1, total: 30 }] } } } as Partial<GameState>);
    expect(standings(g).map((r) => [r.house.id, r.total])).toEqual([
      [2, 34],
      [1, 30],
    ]);
  });

  it("la frase del podio cuenta lo que falta para el tercero", () => {
    expect(podiumLine(standings(game([4, 30, 20, 10])), 1)).toBe("Estás a 6 de Prestigio del podio.");
    expect(podiumLine(standings(game([25, 30, 20])), 1)).toBe("Estás en el podio, a 5 de Prestigio del primero.");
    expect(podiumLine(standings(game([31, 30])), 1)).toBe("Vas primero, con 1 de Prestigio de ventaja.");
  });
});

describe("Te pisan los talones", () => {
  it("nombra a la casa justo detrás si está a 5 o menos", () => {
    expect(chaserLine(standings(game([20, 30, 17])), 1)).toBe("Te pisan los talones: Casa 3, a 3.");
    expect(chaserLine(standings(game([20, 30, 10])), 1)).toBeNull();
    expect(chaserLine(standings(game([5, 30])), 1)).toBeNull();
  });
});

describe("Gráfica de la carrera", () => {
  it("un punto por domingo y «Hoy» con el Prestigio de ahora", () => {
    const g = game([12, 8], { historia: { semanas: [{ semana: 1, totales: { 1: 7, 2: 6 } }], anterior: null, final: null } });
    expect(racePoints(g)).toEqual([
      { label: "S1", totals: { 1: 7, 2: 6 } },
      { label: "Hoy", totals: { 1: 12, 2: 8 } },
    ]);
  });

  it("antes de la primera noche no hay puntos", () => {
    expect(racePoints(game([0, 0], { partida: { estado: "active", resolucionActual: 0, final: null } } as Partial<GameState>))).toEqual([]);
  });
});

describe("Crónica por noches", () => {
  const ev = (id: number, tipo: string, resolucion: number | null, datos: Record<string, unknown>, privado?: boolean): EventView =>
    ({ id, tipo, resolucion, datos, ...(privado ? { privado } : {}) }) as EventView;
  const events = [
    ev(1, "combate", 8, { tile: 1, winner: 2, sides: [{ house: 2 }, { house: 3, joint: [1] }] }),
    ev(2, "mejora", 8, { house: 4, tile: 1 }),
    ev(3, "mantenimiento", 9, { house: 1 }, true),
    ev(4, "logro", null, { house: 5 }),
    ev(5, "asedio", 9, { house: 3, tile: 1 }),
  ];

  it("«Solo lo mío» toma lo privado y donde sale tu casa, nunca por el número de una casilla", () => {
    expect(events.filter((e) => involves(e, 1)).map((e) => e.id)).toEqual([1, 3]);
    expect(chronicleFilter(events.filter((e) => !e.privado), "mio", 4).map((e) => e.id)).toEqual([2]);
  });

  it("«Batallas» deja combates y asedios", () => {
    expect(chronicleFilter(events, "batallas", 1).map((e) => e.id)).toEqual([1, 5]);
  });

  it("agrupa por noche, la última primero y lo que no tiene noche al final", () => {
    expect(byNight(events).map((g) => [g.night, g.events.map((e) => e.id)])).toEqual([
      [9, [3, 5]],
      [8, [1, 2]],
      [null, [4]],
    ]);
  });
});
