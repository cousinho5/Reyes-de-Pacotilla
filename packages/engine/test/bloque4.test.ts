// Retoques del sistema de batalla (hoja de ruta, bloque 4). Se encienden uno a
// uno en rules.ts; aquí se comprueba que hacen lo que dicen, encendidos y apagados.
import { afterEach, describe, expect, it } from "vitest";
import { ANY_ORIGIN, BATTLE_TWEAKS, BOT_TWEAKS, CAPTAIN, RANSOM, botPaysRansom, botRansomPrice, FORTIFY_FOREVER, FORTIFY_UPKEEP, applyFortifyUpkeep, checkFortify, checkRecruit, crossingRisks, recruitCost, resolveCampaign, type Tile } from "../src";

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
  const rich = { pan: 50, madera: 50, piedra: 50, hierro: 50, oro: 50 };

  it("está encendida, con 2 de Piedra de mantenimiento", () => {
    expect(BATTLE_TWEAKS.fortifyUntilAttacked).toBe(true);
    expect(FORTIFY_UPKEEP).toEqual({ piedra: 2 });
  });

  it("fortificar dura hasta que la atacan, y sin ataques sigue defendiendo semanas después", () => {
    const tile: Tile = { id: 2, x: 1, y: 0, type: "campos", owner: Y, troops: 5 };
    const check = checkFortify(tile, Y, 3, rich);
    expect(check).toMatchObject({ ok: true, value: { fortifiedUntil: FORTIFY_FOREVER } });
    const r = resolveCampaign({
      resolution: 40,
      tiles: [
        { id: 1, x: 0, y: 0, type: "campos", owner: X, troops: 6 },
        { ...tile, fortifiedUntil: FORTIFY_FOREVER },
      ],
      orders: [{ kind: "move", house: X, from: 1, to: 2, troops: 6 }],
    });
    // 6 contra 5 x 1,25 = 6,25: la fortificación aguanta el ataque, y lo gasta.
    expect(r.tiles.find((t) => t.id === 2)).toMatchObject({ owner: Y, fortifiedUntil: null });
  });

  it("el domingo se pagan 2 de Piedra por casilla; si no llega, se desmantelan las que no se pagan", () => {
    const tiles: Tile[] = [
      { id: 1, x: 0, y: 0, type: "campos", owner: X, troops: 1, fortifiedUntil: FORTIFY_FOREVER },
      { id: 2, x: 1, y: 0, type: "campos", owner: X, troops: 1, fortifiedUntil: FORTIFY_FOREVER },
      { id: 3, x: 2, y: 0, type: "campos", owner: Y, troops: 1, fortifiedUntil: FORTIFY_FOREVER },
    ];
    const paid = applyFortifyUpkeep(tiles, X, { ...rich, piedra: 4 }, 8);
    expect(paid.cost.piedra).toBe(4);
    expect(paid.dropped).toBe(0);
    const short = applyFortifyUpkeep(tiles, X, { ...rich, piedra: 3 }, 8);
    expect(short.cost.piedra).toBe(2);
    expect(short.dropped).toBe(1);
    expect(short.tiles.filter((t) => t.owner === X && t.fortifiedUntil != null)).toHaveLength(1);
    // Las de otra casa no se tocan.
    expect(short.tiles.find((t) => t.id === 3)!.fortifiedUntil).toBe(FORTIFY_FOREVER);
  });

  it("un ataque que fracasa también gasta la fortificación", () => {
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
  it("está encendido, y los bots lo llevan solo al frente", () => {
    expect(BATTLE_TWEAKS.captainAlone).toBe(true);
    expect(BOT_TWEAKS.captain).toBe("solo");
  });

  it("va solo a una casilla propia", () => {
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

  it("también a una casilla vacía, pero no a una ajena", () => {
    const tiles: Tile[] = [
      { id: 1, x: 0, y: 0, type: "campos", owner: X, troops: 2 },
      { id: 2, x: 1, y: 0, type: "campos", owner: X, troops: 0 },
      { id: 3, x: 0, y: 1, type: "campos", owner: Y, troops: 0 },
    ];
    const captains = [{ house: X, tile: 1, capturedBy: null, freeAt: null }];
    const ok = resolveCampaign({ resolution: 1, tiles, orders: [{ kind: "move", house: X, from: 1, to: 2, troops: 0, captain: true }], captains });
    expect(ok.captains[0]).toMatchObject({ tile: 2 });
    const no = resolveCampaign({ resolution: 1, tiles, orders: [{ kind: "move", house: X, from: 1, to: 3, troops: 0, captain: true }], captains });
    expect(no.events.find((e) => e.type === "orden_invalida")).toBeTruthy();
    expect(no.captains[0]).toMatchObject({ tile: 1 });
  });

  it("si atacan la casilla donde está solo, cae preso", () => {
    const r = resolveCampaign({
      resolution: 3,
      tiles: [
        { id: 1, x: 0, y: 0, type: "campos", owner: X, troops: 0 },
        { id: 2, x: 1, y: 0, type: "campos", owner: Y, troops: 4 },
      ],
      orders: [{ kind: "move", house: Y, from: 2, to: 1, troops: 4 }],
      captains: [{ house: X, tile: 1, capturedBy: null, freeAt: null }],
    });
    // Defiende solo él: 2 x 1,25 = 2,5 contra 4.
    expect(r.tiles.find((t) => t.id === 1)).toMatchObject({ owner: Y });
    expect(r.captains[0]).toMatchObject({ tile: null, capturedBy: Y, freeAt: 3 + CAPTAIN.escapeAfter });
  });

  it("una orden del Capitán solo no hace nada si él ya no está en la casilla", () => {
    const r = resolveCampaign({
      resolution: 1,
      tiles: [
        { id: 1, x: 0, y: 0, type: "campos", owner: X, troops: 2 },
        { id: 2, x: 1, y: 0, type: "campos", owner: X, troops: 4 },
      ],
      orders: [{ kind: "move", house: X, from: 1, to: 2, troops: 0, captain: true }],
      captains: [{ house: X, tile: 2, capturedBy: null, freeAt: null }],
    });
    expect(r.captains[0]).toMatchObject({ tile: 2 });
    expect(r.events.some((e) => e.type === "movimiento")).toBe(false);
  });
});

describe("Rescate del Capitán (bots)", () => {
  it("piden menos cuanto más cerca está la fuga, y nunca menos del mínimo", () => {
    expect(botRansomPrice(CAPTAIN.escapeAfter)).toBe(RANSOM.botAsk);
    expect(botRansomPrice(3)).toBeLessThan(RANSOM.botAsk);
    expect(botRansomPrice(0)).toBe(RANSOM.botMin);
  });

  it("pagan si no es mucho de su Oro y aún falta para la fuga", () => {
    expect(botPaysRansom(20, 100, 5)).toBe(true);
    expect(botPaysRansom(20, 40, 5)).toBe(false);
    expect(botPaysRansom(20, 100, 1)).toBe(false);
  });
});

describe("Mesnada frente a jinetes", () => {
  it("el jinete cuesta 3 de Hierro, 2 de Pan y 3 de Oro", () => {
    expect(recruitCost(2, "jinetes")).toEqual({ hierro: 6, pan: 4, oro: 6 });
  });

  it("si falta Oro, el aviso da las cifras de verdad", () => {
    const r = checkRecruit(1, { pan: 10, madera: 0, piedra: 0, hierro: 10, oro: 2 }, "jinetes");
    expect(r).toEqual({ ok: false, error: "Para jinetes hacen falta 3 de Hierro, 2 de Pan y 3 de Oro cada uno." });
  });
});
