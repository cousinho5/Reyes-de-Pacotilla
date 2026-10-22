// Retoques del sistema de batalla (hoja de ruta, bloque 4). Se encienden uno a
// uno en rules.ts; aquí se comprueba que hacen lo que dicen, encendidos y apagados.
import { afterEach, describe, expect, it } from "vitest";
import { ANY_ORIGIN, BATTLE_TWEAKS, crossingRisks, resolveCampaign, type Tile } from "../src";

const defaults = { ...BATTLE_TWEAKS };

const X = 1;
const Y = 2;

afterEach(() => {
  Object.assign(BATTLE_TWEAKS, defaults);
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

  it("sin el retoque no chocan: cada uno entra en la casilla del otro", () => {
    BATTLE_TWEAKS.crossingClash = false;
    const r = resolveCampaign({ resolution: 1, tiles: tiles(), orders });
    expect(r.events.some((e) => e.type === "choque_frontal")).toBe(false);
    expect(r.tiles.find((t) => t.id === 1)).toMatchObject({ owner: Y, troops: 4 });
    expect(r.tiles.find((t) => t.id === 2)).toMatchObject({ owner: X, troops: 3 });
  });

  it("está encendido en el juego", () => {
    expect(BATTLE_TWEAKS.crossingClash).toBe(true);
  });

  it("chocan de frente por el camino, en la casilla de en medio", () => {
    const r = resolveCampaign({ resolution: 1, tiles: tiles(), orders });
    expect(r.events.find((e) => e.type === "choque_frontal")).toMatchObject({ winner: Y, tiles: [1, 3], via: 2 });
    // Gana Y (4 contra 3, sin carga en un choque) y sigue hasta A; X no llega a B.
    expect(r.tiles.find((t) => t.id === 2)).toMatchObject({ owner: Y });
    expect(r.tiles.find((t) => t.id === 1)).toMatchObject({ owner: Y, troops: 1 });
  });

  it("el ganador del cruce sigue hasta su destino con lo que le queda", () => {
    // Ahora X lleva 6: gana el choque (6 contra 4) y toma B; los jinetes no llegan a A.
    const t = tiles().map((x) => (x.id === 1 ? { ...x, troops: 6 } : x));
    const r = resolveCampaign({ resolution: 1, tiles: t, orders: [{ ...orders[0]!, troops: 6 }, orders[1]!] });
    expect(r.events.find((e) => e.type === "choque_frontal")).toMatchObject({ winner: X, via: 2 });
    expect(r.tiles.find((x) => x.id === 2)).toMatchObject({ owner: X });
    expect(r.tiles.find((x) => x.id === 1)).toMatchObject({ owner: X });
  });

  it("un cambio de casilla de toda la vida no lleva casilla de en medio", () => {
    const t: Tile[] = [
      { id: 1, x: 0, y: 0, type: "campos", owner: X, troops: 3 },
      { id: 2, x: 1, y: 0, type: "campos", owner: Y, troops: 2 },
    ];
    const r = resolveCampaign({
      resolution: 1,
      tiles: t,
      orders: [
        { kind: "move", house: X, from: 1, to: 2, troops: 3 },
        { kind: "move", house: Y, from: 2, to: 1, troops: 2 },
      ],
    });
    const clash = r.events.find((e) => e.type === "choque_frontal");
    expect(clash).toMatchObject({ winner: X });
    expect(clash && "via" in clash).toBe(false);
  });

  it("el aviso marca la marcha que unos jinetes a la vista pueden cruzar", () => {
    const risks = crossingRisks(tiles(), X, [orders[0]!]);
    expect(risks).toEqual([{ order: 0, by: [Y] }]);
  });

  it("sin jinetes que puedan cargar no hay aviso de cruce", () => {
    // Con Mesnada en C no hay carga de dos casillas ni camino: no se cruzan.
    const t = tiles().map((x) => (x.id === 3 ? { ...x, jinetes: 0 } : x));
    expect(crossingRisks(t, X, [orders[0]!])).toEqual([]);
    BATTLE_TWEAKS.crossingClash = false;
    expect(crossingRisks(tiles(), X, [orders[0]!])).toEqual([]);
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
