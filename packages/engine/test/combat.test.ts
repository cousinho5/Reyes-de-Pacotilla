import { describe, expect, it } from "vitest";
import { resolveCampaign, survivors, type Order, type Tile, type TileType } from "../src";

// Casas de los ejemplos del documento de diseño.
const PABLO = 1;
const MARTA = 2;
const DANI = 3;
const LUCIA = 4;
const DEFENSOR = 5;

let nextId = 1;
function tile(x: number, y: number, owner: number | null, troops: number, type: TileType = "campos", extra: Partial<Tile> = {}): Tile {
  return { id: nextId++, x, y, type, owner, troops, ...extra };
}
function byPos(tiles: Tile[], x: number, y: number): Tile {
  const t = tiles.find((t) => t.x === x && t.y === y);
  if (!t) throw new Error(`no hay casilla en ${x},${y}`);
  return t;
}

describe("Ejemplos de la sección 8.5 del documento de diseño", () => {
  it("Tomar una casilla neutral: 7 contra 4 de guarnición deja 2 tropas", () => {
    const origen = tile(0, 0, PABLO, 7);
    const campos = tile(1, 0, null, 4);
    const r = resolveCampaign({
      resolution: 1,
      tiles: [origen, campos],
      orders: [{ kind: "move", house: PABLO, from: origen.id, to: campos.id, troops: 7 }],
    });
    expect(byPos(r.tiles, 1, 0)).toMatchObject({ owner: PABLO, troops: 2 });
    expect(byPos(r.tiles, 0, 0)).toMatchObject({ owner: PABLO, troops: 0 });
  });

  it("Ataque con apoyo: Marta (6) + apoyo de Dani (4) vencen a 6 fortificados y queda 1", () => {
    const marta = tile(0, 1, MARTA, 6);
    const objetivo = tile(1, 1, DEFENSOR, 6, "campos", { fortifiedUntil: 2 });
    const dani = tile(2, 1, DANI, 4);
    const r = resolveCampaign({
      resolution: 1,
      tiles: [marta, objetivo, dani],
      orders: [
        { kind: "move", house: MARTA, from: marta.id, to: objetivo.id, troops: 6 },
        { kind: "support", house: DANI, from: dani.id, target: objetivo.id, supportedFrom: marta.id, troops: 4 },
      ],
    });
    expect(byPos(r.tiles, 1, 1)).toMatchObject({ owner: MARTA, troops: 1, fortifiedUntil: null });
    expect(byPos(r.tiles, 2, 1)).toMatchObject({ owner: DANI, troops: 4 }); // el apoyo no sufre bajas
    const combate = r.events.find((e) => e.type === "combate");
    expect(combate).toMatchObject({ winner: MARTA, conquered: true });
  });

  it("Rebote: Pablo y Lucía entran a la vez con 5 y se repliegan con 2 cada uno", () => {
    const pablo = tile(0, 1, PABLO, 5);
    const vacia = tile(1, 1, null, 0);
    const lucia = tile(2, 1, LUCIA, 5);
    const r = resolveCampaign({
      resolution: 1,
      tiles: [pablo, vacia, lucia],
      orders: [
        { kind: "move", house: PABLO, from: pablo.id, to: vacia.id, troops: 5 },
        { kind: "move", house: LUCIA, from: lucia.id, to: vacia.id, troops: 5 },
      ],
    });
    expect(byPos(r.tiles, 1, 1)).toMatchObject({ owner: null, troops: 0 });
    expect(byPos(r.tiles, 0, 1).troops).toBe(2);
    expect(byPos(r.tiles, 2, 1).troops).toBe(2);
    expect(r.events.some((e) => e.type === "rebote")).toBe(true);
  });

  it("Apoyo cortado: Lucía ataca a Dani, Marta ataca sola (6 contra 9) y se repliega con 3", () => {
    const marta = tile(0, 1, MARTA, 6);
    const objetivo = tile(1, 1, DEFENSOR, 6, "campos", { fortifiedUntil: 2 });
    const dani = tile(2, 1, DANI, 4);
    const lucia = tile(3, 1, LUCIA, 2);
    const r = resolveCampaign({
      resolution: 1,
      tiles: [marta, objetivo, dani, lucia],
      orders: [
        { kind: "move", house: MARTA, from: marta.id, to: objetivo.id, troops: 6 },
        { kind: "support", house: DANI, from: dani.id, target: objetivo.id, supportedFrom: marta.id, troops: 4 },
        { kind: "move", house: LUCIA, from: lucia.id, to: dani.id, troops: 2 },
      ],
    });
    expect(r.events.some((e) => e.type === "apoyo_cortado")).toBe(true);
    expect(byPos(r.tiles, 0, 1)).toMatchObject({ owner: MARTA, troops: 3 });
    // El defensor resiste: 9 contra 6, conserva 6 x (1 - 6/9) = 2.
    expect(byPos(r.tiles, 1, 1)).toMatchObject({ owner: DEFENSOR, troops: 2 });
    // Dani resiste a Lucía: 4 x 1,25 = 5 contra 2, conserva 3. Lucía vuelve con 1.
    expect(byPos(r.tiles, 2, 1)).toMatchObject({ owner: DANI, troops: 3 });
    expect(byPos(r.tiles, 3, 1)).toMatchObject({ owner: LUCIA, troops: 1 });
  });
});

describe("Casos especiales", () => {
  it("En empate con el atacante gana el defensor y conserva 1", () => {
    const atacante = tile(0, 0, PABLO, 5);
    const defensa = tile(1, 0, MARTA, 4); // 4 x 1,25 = 5
    const r = resolveCampaign({
      resolution: 1,
      tiles: [atacante, defensa],
      orders: [{ kind: "move", house: PABLO, from: atacante.id, to: defensa.id, troops: 5 }],
    });
    expect(byPos(r.tiles, 1, 0)).toMatchObject({ owner: MARTA, troops: 1 });
    expect(byPos(r.tiles, 0, 0).troops).toBe(2);
  });

  it("Choque frontal: el ganador sigue y el perdedor pierde las tropas si su origen cae", () => {
    const a = tile(0, 0, PABLO, 6);
    const b = tile(1, 0, MARTA, 3);
    const r = resolveCampaign({
      resolution: 1,
      tiles: [a, b],
      orders: [
        { kind: "move", house: PABLO, from: a.id, to: b.id, troops: 6 },
        { kind: "move", house: MARTA, from: b.id, to: a.id, troops: 3 },
      ],
    });
    expect(r.events.some((e) => e.type === "choque_frontal")).toBe(true);
    expect(byPos(r.tiles, 1, 0)).toMatchObject({ owner: PABLO, troops: 3 });
    const repliegue = r.events.find((e) => e.type === "repliegue");
    expect(repliegue).toMatchObject({ house: MARTA, arrived: false });
  });

  it("Las fortalezas suman +50% y la ausencia +25% más", () => {
    const atacante = tile(0, 0, PABLO, 13);
    const fortaleza = tile(1, 0, MARTA, 6, "fortaleza"); // 6 x (1 + 0,25 + 0,5 + 0,25) = 12
    const r = resolveCampaign({
      resolution: 1,
      tiles: [atacante, fortaleza],
      orders: [{ kind: "move", house: PABLO, from: atacante.id, to: fortaleza.id, troops: 12 }],
      absentHouses: [MARTA],
    });
    expect(byPos(r.tiles, 1, 0).owner).toBe(MARTA); // 12 contra 12: gana el defensor
    expect(byPos(r.tiles, 0, 0).troops).toBe(1 + 6); // se quedó 1 y vuelven 6
  });

  it("Los castillos no se pueden atacar", () => {
    const atacante = tile(0, 0, PABLO, 10);
    const castillo = tile(1, 0, MARTA, 2, "castillo", { castleOf: MARTA });
    const r = resolveCampaign({
      resolution: 1,
      tiles: [atacante, castillo],
      orders: [{ kind: "move", house: PABLO, from: atacante.id, to: castillo.id, troops: 10 }],
    });
    expect(r.events[0]).toMatchObject({ type: "orden_invalida" });
    expect(byPos(r.tiles, 1, 0)).toMatchObject({ owner: MARTA, troops: 2 });
    expect(byPos(r.tiles, 0, 0).troops).toBe(10);
  });

  it("No se pueden ordenar más tropas de las que hay", () => {
    const origen = tile(0, 0, PABLO, 5);
    const destino = tile(1, 0, null, 0);
    const otro = tile(0, 1, null, 0);
    const r = resolveCampaign({
      resolution: 1,
      tiles: [origen, destino, otro],
      orders: [
        { kind: "move", house: PABLO, from: origen.id, to: destino.id, troops: 4 },
        { kind: "move", house: PABLO, from: origen.id, to: otro.id, troops: 4 },
      ],
    });
    expect(r.events.filter((e) => e.type === "orden_invalida")).toHaveLength(1);
    expect(byPos(r.tiles, 1, 0)).toMatchObject({ owner: PABLO, troops: 4 });
    expect(byPos(r.tiles, 0, 0).troops).toBe(1);
  });

  it("Los refuerzos propios se suman a la defensa", () => {
    const atacante = tile(0, 0, PABLO, 8);
    const defensa = tile(1, 0, MARTA, 2);
    const refuerzo = tile(2, 0, MARTA, 4);
    const r = resolveCampaign({
      resolution: 1,
      tiles: [atacante, defensa, refuerzo],
      orders: [
        { kind: "move", house: PABLO, from: atacante.id, to: defensa.id, troops: 8 },
        { kind: "move", house: MARTA, from: refuerzo.id, to: defensa.id, troops: 4 },
      ],
    });
    // Defensa: (2 + 4) x 1,25 = 7,5 contra 8: gana Pablo con ceil(8 x (1 - 7,5/8)) = 1.
    expect(byPos(r.tiles, 1, 0)).toMatchObject({ owner: PABLO, troops: 1 });
  });

  it("Es determinista y no modifica la entrada", () => {
    const tiles = [tile(0, 0, PABLO, 7), tile(1, 0, null, 4)];
    const orders: Order[] = [{ kind: "move", house: PABLO, from: tiles[0]!.id, to: tiles[1]!.id, troops: 7 }];
    const snapshot = JSON.stringify(tiles);
    const a = resolveCampaign({ resolution: 1, tiles, orders });
    const b = resolveCampaign({ resolution: 1, tiles, orders });
    expect(a).toEqual(b);
    expect(JSON.stringify(tiles)).toBe(snapshot);
  });
});

describe("survivors", () => {
  it("redondea hacia arriba con mínimo 1 y sin bajas si no hay rival", () => {
    expect(survivors(7, 7, 5)).toBe(2);
    expect(survivors(6, 10, 9)).toBe(1);
    expect(survivors(5, 5, 0)).toBe(5);
    expect(survivors(6, 9, 6)).toBe(2);
  });
});
