// Retoques del sistema de batalla en estudio (hoja de ruta, bloque 4). Están
// apagados por defecto; aquí se comprueba que, encendidos, hacen lo que dicen.
import { afterEach, describe, expect, it } from "vitest";
import { ANY_ORIGIN, BATTLE_TWEAKS, resolveCampaign, type Tile } from "../src";

const X = 1;
const Y = 2;

afterEach(() => {
  BATTLE_TWEAKS.supportAnyOrigin = false;
  BATTLE_TWEAKS.crossingClash = false;
  BATTLE_TWEAKS.fortifyUntilAttacked = false;
  BATTLE_TWEAKS.captainAlone = false;
});

describe("Jinetes que se cruzan por el camino", () => {
  // A B C en fila: X tiene 3 Mesnadas en A; Y tiene B (vacía) y 4 jinetes en C.
  // X va de A a B; los jinetes de Y cargan de C a A pasando por B.
  const tiles = (): Tile[] => [
    { id: 1, x: 0, y: 0, type: "campos", owner: X, troops: 3 },
    { id: 2, x: 1, y: 0, type: "campos", owner: Y, troops: 0 },
    { id: 3, x: 2, y: 0, type: "campos", owner: Y, troops: 4, jinetes: 4 },
  ];
  const orders = [
    { kind: "move" as const, house: X, from: 1, to: 2, troops: 3 },
    { kind: "move" as const, house: Y, from: 3, to: 1, troops: 4, jinetes: 4 },
  ];

  it("hoy no chocan: cada uno entra en la casilla del otro", () => {
    const r = resolveCampaign({ resolution: 1, tiles: tiles(), orders });
    expect(r.events.some((e) => e.type === "choque_frontal")).toBe(false);
    expect(r.tiles.find((t) => t.id === 1)).toMatchObject({ owner: Y, troops: 4 });
    expect(r.tiles.find((t) => t.id === 2)).toMatchObject({ owner: X, troops: 3 });
  });

  it("con crossingClash chocan de frente por el camino", () => {
    BATTLE_TWEAKS.crossingClash = true;
    const r = resolveCampaign({ resolution: 1, tiles: tiles(), orders });
    expect(r.events.find((e) => e.type === "choque_frontal")).toMatchObject({ winner: Y });
    // Gana Y (4 contra 3, sin carga en un choque) y sigue hasta A; X no llega a B.
    expect(r.tiles.find((t) => t.id === 2)).toMatchObject({ owner: Y });
    expect(r.tiles.find((t) => t.id === 1)).toMatchObject({ owner: Y });
  });
});

describe("Apoyo al ataque sin elegir origen", () => {
  // X ataca la casilla 3 de Y con 4 tropas desde la 1; la 2 de X apoya con 3.
  const tiles = (): Tile[] => [
    { id: 1, x: 0, y: 0, type: "campos", owner: X, troops: 4 },
    { id: 2, x: 0, y: 1, type: "campos", owner: X, troops: 3 },
    { id: 3, x: 1, y: 0, type: "campos", owner: Y, troops: 5 },
  ];

  it("con supportAnyOrigin el apoyo vale aunque no diga de dónde viene el ataque", () => {
    BATTLE_TWEAKS.supportAnyOrigin = true;
    const r = resolveCampaign({
      resolution: 1,
      tiles: tiles(),
      orders: [
        { kind: "move", house: X, from: 1, to: 3, troops: 4 },
        { kind: "support", house: X, from: 2, target: 3, supportedFrom: ANY_ORIGIN, troops: 3 },
      ],
    });
    // 4 + 3 = 7 contra 5 x 1,25 = 6,25: X toma la casilla.
    expect(r.tiles.find((t) => t.id === 3)).toMatchObject({ owner: X });
  });

  it("sin el retoque, un apoyo sin origen no es válido", () => {
    const r = resolveCampaign({
      resolution: 1,
      tiles: tiles(),
      orders: [{ kind: "support", house: X, from: 2, target: 3, supportedFrom: ANY_ORIGIN, troops: 3 }],
    });
    expect(r.events.find((e) => e.type === "orden_invalida")).toBeTruthy();
  });

  it("con dos ataques de la misma casa, el apoyo suma una sola vez", () => {
    BATTLE_TWEAKS.supportAnyOrigin = true;
    const t = [...tiles(), { id: 4, x: 2, y: 0, type: "campos" as const, owner: X, troops: 1 }];
    const r = resolveCampaign({
      resolution: 1,
      tiles: t,
      orders: [
        { kind: "move", house: X, from: 1, to: 3, troops: 1 },
        { kind: "move", house: X, from: 4, to: 3, troops: 1 },
        { kind: "support", house: X, from: 2, target: 3, supportedFrom: ANY_ORIGIN, troops: 3 },
      ],
    });
    const combate = r.events.find((e) => e.type === "combate");
    expect(combate && combate.type === "combate" && combate.sides.find((s) => s.role === "ataque")?.strength).toBe(5);
  });
});

describe("Fortificación hasta que la atacan", () => {
  it("un ataque que fracasa también gasta la fortificación", () => {
    BATTLE_TWEAKS.fortifyUntilAttacked = true;
    const r = resolveCampaign({
      resolution: 1,
      tiles: [
        { id: 1, x: 0, y: 0, type: "campos", owner: X, troops: 2 },
        { id: 2, x: 1, y: 0, type: "campos", owner: Y, troops: 5, fortifiedUntil: 1000 },
      ],
      orders: [{ kind: "move", house: X, from: 1, to: 2, troops: 2 }],
    });
    expect(r.tiles.find((t) => t.id === 2)).toMatchObject({ owner: Y, fortifiedUntil: null });
  });
});

describe("Capitán que se mueve solo", () => {
  it("con captainAlone va solo a una casilla propia", () => {
    BATTLE_TWEAKS.captainAlone = true;
    const r = resolveCampaign({
      resolution: 1,
      tiles: [
        { id: 1, x: 0, y: 0, type: "campos", owner: X, troops: 2 },
        { id: 2, x: 1, y: 0, type: "campos", owner: X, troops: 4 },
      ],
      orders: [{ kind: "move", house: X, from: 1, to: 2, troops: 0, captain: true }],
      captains: [{ house: X, tile: 1, capturedBy: null, freeAt: null }],
    });
    expect(r.captains[0]).toMatchObject({ tile: 2 });
    expect(r.tiles.find((t) => t.id === 1)).toMatchObject({ troops: 2 });
  });
});
