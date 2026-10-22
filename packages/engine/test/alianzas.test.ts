// Alianzas (bloque 8, docs/alianzas.md): paso libre, tropas de paso, ataque
// conjunto, no agresión, aviso de ruptura y expulsión.
import { afterEach, describe, expect, it } from "vitest";
import {
  ALLIANCE,
  CAPTAIN,
  GLORY,
  applyUpkeep,
  attackSides,
  checkOrders,
  dismissTroops,
  expelGuests,
  gloryFromEvents,
  marchKind,
  projectForHouse,
  resolveCampaign,
  shareKept,
  type Alliance,
  type Order,
  type Tile,
} from "../src";

const A = 1;
const B = 2;
const C = 3;
const D = 4;

const active = (a: number, b: number, since = 1): Alliance => ({ a, b, status: "active", endsAt: null, since });
const breaking = (a: number, b: number, endsAt: number): Alliance => ({ a, b, status: "breaking", endsAt, since: 1 });
const field = (id: number, x: number, owner: number | null, troops: number, extra: Partial<Tile> = {}): Tile => ({
  id,
  x,
  y: 0,
  type: "campos",
  owner,
  troops,
  ...extra,
});
const tile = (tiles: Tile[], id: number) => tiles.find((t) => t.id === id)!;
const enabled = ALLIANCE.enabled;
afterEach(() => {
  ALLIANCE.enabled = enabled;
});

describe("paso libre", () => {
  const tiles = () => [field(1, 0, A, 5), field(2, 1, B, 2)];
  const enter: Order = { kind: "move", house: A, from: 1, to: 2, troops: 3 };

  it("A entra en una casilla de su aliada B sin combatir y sus tropas quedan de paso", () => {
    const r = resolveCampaign({ resolution: 1, tiles: tiles(), orders: [enter], alliances: [active(A, B)] });
    expect(r.events.some((e) => e.type === "combate")).toBe(false);
    expect(r.events).toContainEqual({ type: "movimiento", house: A, from: 1, to: 2, troops: 3, guest: true });
    expect(tile(r.tiles, 2)).toMatchObject({ owner: B, troops: 2, guests: [{ house: A, troops: 3 }] });
    expect(tile(r.tiles, 1)).toMatchObject({ owner: A, troops: 2 });
  });

  it("sin alianza, la misma orden es un ataque", () => {
    const r = resolveCampaign({ resolution: 1, tiles: tiles(), orders: [enter] });
    expect(r.events.find((e) => e.type === "combate")).toMatchObject({ winner: A, conquered: true });
  });

  it("con las alianzas apagadas en rules.ts, también", () => {
    ALLIANCE.enabled = false;
    const r = resolveCampaign({ resolution: 1, tiles: tiles(), orders: [enter], alliances: [active(A, B)] });
    expect(r.events.find((e) => e.type === "combate")).toMatchObject({ winner: A, conquered: true });
  });

  it("nunca en el castillo del aliado", () => {
    const t = [field(1, 0, A, 5), { ...field(2, 1, B, 2), type: "castillo" as const, castleOf: B }];
    const r = resolveCampaign({ resolution: 1, tiles: t, orders: [enter], alliances: [active(A, B)] });
    expect(r.events[0]).toMatchObject({ type: "orden_invalida", reason: "no se puede entrar en el castillo de un aliado" });
    expect(tile(r.tiles, 2).guests).toBeUndefined();
  });

  it("dos aliados que se cambian de casilla no chocan: cada uno queda de paso en la del otro", () => {
    const t = [field(1, 0, A, 3), field(2, 1, B, 3)];
    const r = resolveCampaign({
      resolution: 1,
      tiles: t,
      orders: [enter, { kind: "move", house: B, from: 2, to: 1, troops: 2 }],
      alliances: [active(A, B)],
    });
    expect(r.events.some((e) => e.type === "choque_frontal")).toBe(false);
    expect(tile(r.tiles, 1)).toMatchObject({ owner: A, troops: 0, guests: [{ house: B, troops: 2 }] });
    expect(tile(r.tiles, 2)).toMatchObject({ owner: B, troops: 1, guests: [{ house: A, troops: 3 }] });
  });

  it("las tropas de paso pueden seguir desde la casilla aliada y atacar a un tercero", () => {
    const t = [field(1, 1, B, 1, { guests: [{ house: A, troops: 4 }] }), field(2, 2, C, 1)];
    const r = resolveCampaign({
      resolution: 1,
      tiles: t,
      orders: [{ kind: "move", house: A, from: 1, to: 2, troops: 4, guest: true }],
      alliances: [active(A, B)],
    });
    expect(tile(r.tiles, 2)).toMatchObject({ owner: A });
    expect(tile(r.tiles, 1).guests).toBeUndefined();
  });

  it("una orden con tropas de paso que no tiene se rechaza", () => {
    const { invalid } = checkOrders(
      [field(1, 1, B, 5), field(2, 2, C, 1)],
      [{ kind: "move", house: A, from: 1, to: 2, troops: 1, guest: true }],
      1,
      [active(A, B)],
    );
    expect(invalid[0]?.reason).toBe("no hay tropas suficientes en la casilla");
  });

  it("la Tregua no detiene a un aliado que entra", () => {
    const r = resolveCampaign({ resolution: 1, tiles: tiles(), orders: [enter], alliances: [active(A, B)], truceTiles: [2] });
    expect(tile(r.tiles, 2).guests).toEqual([{ house: A, troops: 3 }]);
  });

  it("las casillas aliadas sirven de casilla de en medio para una carga", () => {
    const t = [field(1, 0, A, 2, { jinetes: 2 }), field(2, 1, B, 0), field(3, 2, C, 0)];
    const riders = { mesnada: 0, jinetes: 2, catapultas: 0 };
    expect(marchKind(t[0]!, t[2]!, t, A, riders)).toBeNull();
    expect(marchKind(t[0]!, t[2]!, t, A, riders, [B])).toBe("carga");
  });

  it("el Capitán puede ir solo a una casilla aliada", () => {
    const r = resolveCampaign({
      resolution: 1,
      tiles: tiles(),
      orders: [{ kind: "move", house: A, from: 1, to: 2, troops: 0, captain: true }],
      alliances: [active(A, B)],
      captains: [{ house: A, tile: 1 }],
    });
    expect(r.captains[0]?.tile).toBe(2);
  });
});

describe("tropas de paso que defienden", () => {
  it("C ataca una casilla de B con tropas de paso de A: defienden juntas y las bajas se reparten", () => {
    const t = [field(1, 0, C, 6), field(2, 1, B, 4, { guests: [{ house: A, troops: 4 }] })];
    const r = resolveCampaign({
      resolution: 1,
      tiles: t,
      orders: [{ kind: "move", house: C, from: 1, to: 2, troops: 6 }],
      alliances: [active(A, B)],
    });
    // Defensa: 8 x 1,25 = 10 contra 6. Quedan 4, dos para cada una.
    const fight = r.events.find((e) => e.type === "combate");
    expect(fight).toMatchObject({ winner: B, conquered: false, survivors: 4, allies: [A] });
    expect(tile(r.tiles, 2)).toMatchObject({ owner: B, troops: 2, guests: [{ house: A, troops: 2 }] });
    // Gloria para las dos.
    const glory = gloryFromEvents(r.events);
    if (GLORY.enabled) {
      expect(glory.get(B)).toBe(GLORY.perVictory);
      expect(glory.get(A)).toBe(GLORY.perVictory);
    }
  });

  it("si la casilla cae, las tropas de paso caen con ella y su Capitán queda preso", () => {
    const t = [field(1, 0, C, 9), field(2, 1, B, 1, { guests: [{ house: A, troops: 1 }] })];
    const r = resolveCampaign({
      resolution: 1,
      tiles: t,
      orders: [{ kind: "move", house: C, from: 1, to: 2, troops: 9 }],
      alliances: [active(A, B)],
      captains: [{ house: A, tile: 2 }],
    });
    expect(tile(r.tiles, 2)).toMatchObject({ owner: C });
    expect(tile(r.tiles, 2).guests).toBeUndefined();
    if (CAPTAIN.enabled) expect(r.captains[0]).toMatchObject({ house: A, tile: null, capturedBy: C });
  });

  it("A, aliada de B y de C, no lucha cuando C ataca a B: sus tropas se quedan a un lado", () => {
    const t = [field(1, 0, C, 6), field(2, 1, B, 2, { guests: [{ house: A, troops: 5 }] })];
    const r = resolveCampaign({
      resolution: 1,
      tiles: t,
      orders: [{ kind: "move", house: C, from: 1, to: 2, troops: 6 }],
      alliances: [active(A, B), active(A, C)],
    });
    // Solo defienden las 2 de B (2,5 contra 6): C toma la casilla y A sigue dentro, ahora de paso con C.
    expect(r.events.find((e) => e.type === "combate")).toMatchObject({ winner: C, aside: [A] });
    expect(tile(r.tiles, 2)).toMatchObject({ owner: C, guests: [{ house: A, troops: 5 }] });
  });

  it("si a un lado y la casilla cae en manos de quien no es su aliado, vuelven a casa", () => {
    const t = [field(1, 0, C, 6), field(2, 1, B, 2, { guests: [{ house: A, troops: 5 }] }), field(3, 3, A, 0), field(4, 2, D, 9)];
    const r = resolveCampaign({
      resolution: 1,
      tiles: t,
      orders: [
        { kind: "move", house: C, from: 1, to: 2, troops: 1 },
        { kind: "move", house: D, from: 4, to: 2, troops: 9 },
      ],
      alliances: [active(A, B), active(A, C)],
    });
    expect(tile(r.tiles, 2)).toMatchObject({ owner: D });
    expect(tile(r.tiles, 2).guests).toBeUndefined();
    expect(r.events).toContainEqual({ type: "expulsion", house: A, from: 2, to: 3, troops: 5 });
    expect(tile(r.tiles, 3).troops).toBe(5);
  });
});

describe("ataque conjunto", () => {
  // A en x0, la casilla de C en x1 y B en x2.
  const tiles = (a = 6, b = 4) => [field(1, 0, A, a), field(2, 1, C, 5), field(3, 2, B, b)];
  const orders = (a = 6, b = 4, atA = 2, atB = 1): Order[] => [
    { kind: "move", house: A, from: 1, to: 2, troops: a, at: atA },
    { kind: "move", house: B, from: 3, to: 2, troops: b, at: atB },
  ];

  it("A (6) y B (4) contra C (5): una batalla de 10 contra 6,25; la casilla es de A y B se queda de paso", () => {
    const r = resolveCampaign({ resolution: 1, tiles: tiles(), orders: orders(), alliances: [active(A, B)] });
    const fight = r.events.find((e) => e.type === "combate");
    // Quedan 4 de 10: 2,4 y 1,6 por restos mayores, 2 y 2.
    expect(fight).toMatchObject({ winner: A, conquered: true, survivors: 4, allies: [B], kept: [{ house: B, troops: 2 }, { house: A, troops: 2 }] });
    expect(tile(r.tiles, 2)).toMatchObject({ owner: A, troops: 2, guests: [{ house: B, troops: 2 }] });
    const glory = gloryFromEvents(r.events);
    if (GLORY.enabled) {
      expect(glory.get(A)).toBe(GLORY.perVictory);
      expect(glory.get(B)).toBe(GLORY.perVictory);
    }
  });

  it("sin alianza, cada uno choca por su cuenta y no entra ninguno", () => {
    const r = resolveCampaign({ resolution: 1, tiles: tiles(), orders: orders() });
    expect(tile(r.tiles, 2)).toMatchObject({ owner: C });
  });

  it("con las mismas tropas, la casilla es de quien dio antes la orden", () => {
    const r = resolveCampaign({ resolution: 1, tiles: tiles(5, 5), orders: orders(5, 5, 2, 1), alliances: [active(A, B)] });
    expect(tile(r.tiles, 2).owner).toBe(B);
    const r2 = resolveCampaign({ resolution: 1, tiles: tiles(5, 5), orders: orders(5, 5, 1, 2), alliances: [active(A, B)] });
    expect(tile(r2.tiles, 2).owner).toBe(A);
  });

  it("también contra una guarnición neutral", () => {
    const t = tiles().map((x) => (x.id === 2 ? { ...x, owner: null } : x));
    const r = resolveCampaign({ resolution: 1, tiles: t, orders: orders(), alliances: [active(A, B)] });
    expect(tile(r.tiles, 2)).toMatchObject({ owner: A, guests: [{ house: B, troops: 2 }] });
  });

  it("si pierden, cada uno se repliega a su casilla", () => {
    const r = resolveCampaign({ resolution: 1, tiles: tiles(3, 2), orders: orders(3, 2), alliances: [active(A, B)] });
    expect(tile(r.tiles, 2).owner).toBe(C);
    expect(r.events.filter((e) => e.type === "repliegue").map((e) => e.house).sort()).toEqual([A, B]);
  });

  it("durante el aviso de ruptura no hay ataque conjunto", () => {
    const r = resolveCampaign({ resolution: 1, tiles: tiles(), orders: orders(), alliances: [breaking(A, B, 2)] });
    expect(tile(r.tiles, 2).owner).toBe(C);
  });

  it("A, aliada de B y de C (que no lo son), ataca con la alianza más antigua", () => {
    expect(attackSides([A, B, C], [active(A, C, 5), active(A, B, 2)])).toEqual([[A, B], [C]]);
    expect(attackSides([A, B, C], [active(A, C, 1), active(A, B, 2)])).toEqual([[A, C], [B]]);
    expect(attackSides([A, B, C], [active(A, B), active(B, C), active(A, C)])).toEqual([[A, B, C]]);
  });
});

describe("no agresión", () => {
  const tiles = () => [field(1, 0, A, 5), { ...field(2, 1, B, 2), type: "fortaleza" as const }, field(3, 2, C, 3)];

  it("no se puede sitiar ni apoyar un ataque contra un aliado", () => {
    const { invalid } = checkOrders(
      tiles(),
      [
        { kind: "siege", house: A, from: 1, target: 2, troops: 3 },
        { kind: "support", house: A, from: 1, target: 2, supportedFrom: 3, troops: 1 },
      ],
      1,
      [active(A, B)],
    );
    expect(invalid.map((x) => x.reason)).toEqual(["no puedes sitiar a un aliado", "no puedes apoyar un ataque contra un aliado"]);
  });

  it("A aliada de B y B de C: A y C no lo son, y A puede atacar a C", () => {
    const t = [field(1, 0, A, 5), field(2, 1, C, 1)];
    const r = resolveCampaign({
      resolution: 1,
      tiles: t,
      orders: [{ kind: "move", house: A, from: 1, to: 2, troops: 5 }],
      alliances: [active(A, B), active(B, C)],
    });
    expect(r.events.find((e) => e.type === "combate")).toMatchObject({ winner: A, conquered: true });
  });

  it("las tropas de paso pueden sitiar y apoyar desde la casilla aliada", () => {
    const t = [field(1, 0, B, 1, { guests: [{ house: A, troops: 4 }] }), { ...field(2, 1, C, 2), type: "fortaleza" as const }];
    const r = resolveCampaign({
      resolution: 1,
      tiles: t,
      orders: [{ kind: "siege", house: A, from: 1, target: 2, troops: 3, guest: true }],
      alliances: [active(A, B)],
    });
    expect(r.events.find((e) => e.type === "asedio")).toMatchObject({ house: A, tile: 2 });
    expect(tile(r.tiles, 2).besiegedBy).toBe(A);
  });
});

describe("ruptura y expulsión", () => {
  // A en x0; B en x1 (con tropas de paso de A) y x2.
  const tiles = () => [field(1, 0, A, 2), field(2, 1, B, 1, { guests: [{ house: A, troops: 3 }] }), field(3, 2, B, 1, { guests: [{ house: A, troops: 2 }] })];

  it("durante el aviso se puede salir pero no entrar", () => {
    const { valid, invalid } = checkOrders(
      tiles(),
      [
        { kind: "move", house: A, from: 2, to: 1, troops: 3, guest: true },
        { kind: "move", house: A, from: 3, to: 2, troops: 2, guest: true },
        { kind: "move", house: A, from: 1, to: 2, troops: 1 },
        { kind: "move", house: A, from: 2, to: 3, troops: 1, guest: true },
      ],
      1,
      [breaking(A, B, 3)],
    );
    expect(valid).toHaveLength(2);
    expect(invalid.map((x) => x.reason)).toEqual([
      "durante el aviso no se puede entrar en las casillas de esa casa",
      // Ir de x1 a x2 aleja de la salida.
      "durante el aviso no se puede entrar en las casillas de esa casa",
    ]);
  });

  it("durante el aviso las tropas de paso solo pueden salir: ni apoyar ni sitiar", () => {
    const { invalid } = checkOrders(tiles(), [{ kind: "support", house: A, from: 2, target: 1, supportedFrom: null, troops: 1, guest: true }], 1, [
      breaking(A, B, 3),
    ]);
    expect(invalid[0]?.reason).toBe("durante el aviso, las tropas de paso solo pueden salir de las casillas de esa casa");
  });

  it("durante el aviso siguen sin poder atacarse", () => {
    const { invalid } = checkOrders(tiles(), [{ kind: "move", house: A, from: 1, to: 2, troops: 1 }], 1, [breaking(A, B, 3)]);
    expect(invalid).toHaveLength(1);
  });

  it("al terminar el aviso, las tropas que siguen dentro vuelven a la casilla propia más cercana", () => {
    const r = resolveCampaign({ resolution: 3, tiles: tiles(), orders: [], alliances: [breaking(A, B, 3)], captains: [{ house: A, tile: 3 }] });
    expect(r.events.filter((e) => e.type === "expulsion")).toEqual([
      { type: "expulsion", house: A, from: 2, to: 1, troops: 3 },
      { type: "expulsion", house: A, from: 3, to: 1, troops: 2 },
    ]);
    expect(tile(r.tiles, 1).troops).toBe(7);
    expect(r.tiles.every((t) => !t.guests)).toBe(true);
    expect(r.captains[0]?.tile).toBe(1);
  });

  it("antes de la última noche del aviso, siguen dentro", () => {
    const r = resolveCampaign({ resolution: 2, tiles: tiles(), orders: [], alliances: [breaking(A, B, 3)] });
    expect(r.events.some((e) => e.type === "expulsion")).toBe(false);
  });

  it("expelGuests no modifica la entrada", () => {
    const t = tiles();
    const copy = JSON.parse(JSON.stringify(t));
    expelGuests(t, [], 1);
    expect(t).toEqual(copy);
  });
});

describe("mantenimiento, mercenarios y niebla", () => {
  it("las tropas de paso comen y desertan las primeras", () => {
    const t = [
      { ...field(1, 0, A, 6), type: "castillo" as const, castleOf: A },
      field(2, 1, B, 1, { guests: [{ house: A, troops: 6 }] }),
    ];
    const r = applyUpkeep(t, A, 2);
    expect(r.cost).toBe(4);
    expect(r.deserted).toBe(6);
    expect(tile(r.tiles, 2).guests).toBeUndefined();
    expect(tile(r.tiles, 1).troops).toBe(6);
  });

  it("los mercenarios que se van salen de las tropas de paso al final", () => {
    const t = [{ ...field(1, 0, A, 2), castleOf: A }, field(2, 1, A, 1), field(3, 2, B, 0, { guests: [{ house: A, troops: 4 }] })];
    const r = dismissTroops(t, A, 5);
    expect(r.removed).toBe(5);
    expect(tile(r.tiles, 3).guests).toEqual([{ house: A, troops: 2 }]);
  });

  it("se ve la casilla aliada donde están las tropas de paso, y las de paso ajenas solo si se ve la casilla", () => {
    const t = [field(1, 0, A, 1), field(2, 5, B, 1, { guests: [{ house: A, troops: 2 }, { house: C, troops: 3 }] }), field(3, 9, B, 1, { guests: [{ house: C, troops: 1 }] })];
    const seen = projectForHouse(t, A);
    expect(seen[1]).toMatchObject({ visible: true, guests: [{ house: A, troops: 2 }, { house: C, troops: 3 }] });
    expect(seen[2]!.visible).toBe(false);
    expect(seen[2]!.guests).toBeUndefined();
    // Visión compartida: el aliado se pasa como casa espiada.
    expect(projectForHouse(t, A, [B])[2]).toMatchObject({ visible: true, guests: [{ house: C, troops: 1 }] });
  });
});

describe("reparto de bajas", () => {
  it("en proporción, por restos mayores; en empate pierde una más el de detrás", () => {
    expect(shareKept([6, 4], 4)).toEqual([2, 2]);
    expect(shareKept([5, 5], 3)).toEqual([2, 1]);
    expect(shareKept([3, 1], 4)).toEqual([3, 1]);
    expect(shareKept([0, 0], 0)).toEqual([0, 0]);
  });
});
