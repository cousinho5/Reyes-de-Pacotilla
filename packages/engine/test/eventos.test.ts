import { describe, expect, it } from "vitest";
import {
  EVENT_KEYS,
  EVENT_LINES,
  applyEventNow,
  applyUpkeep,
  auctionLots,
  dailyProduction,
  doubleLot,
  eventCombat,
  eventOfWeek,
  eventProduction,
  eventUpkeepFactor,
  lotLabel,
  productionEventWeek,
  resolveCampaign,
  type EventHouse,
  type Tile,
} from "../src";

const tile = (id: number, x: number, y: number, extra: Partial<Tile>): Tile => ({
  id,
  x,
  y,
  type: "campos",
  owner: null,
  troops: 4,
  fortifiedUntil: null,
  ...extra,
});
const res = (oro: number) => ({ pan: 10, madera: 10, piedra: 10, hierro: 10, oro });

describe("Eventos de la semana", () => {
  it("20 eventos, cada uno con dos líneas del cronista; ninguno se repite en 20 semanas", () => {
    expect(EVENT_KEYS).toHaveLength(20);
    for (const k of EVENT_KEYS) expect(EVENT_LINES[k].length).toBeGreaterThanOrEqual(2);
    const weeks = Array.from({ length: 20 }, (_, i) => eventOfWeek("semilla", i + 1).key);
    expect(new Set(weeks).size).toBe(20);
    expect(eventOfWeek("semilla", 3)).toEqual(eventOfWeek("semilla", 3));
  });

  it("la producción cambia de jueves a miércoles", () => {
    const plague = { key: "plaga_ratas" as const };
    expect(productionEventWeek(2)).toBeNull(); // primer miércoles: aún nada
    expect(productionEventWeek(3)).toBe(1); // jueves
    expect(productionEventWeek(9)).toBe(1); // miércoles siguiente
    expect(productionEventWeek(10)).toBe(2);
    expect(eventProduction(plague, 1, 2)).toBeNull();
    const levels = { granja: 2, aserradero: 1, cantera: 1, mina: 1, mercado: 1 } as const;
    const normal = dailyProduction({ ...levels }, []);
    const plagued = dailyProduction({ ...levels }, [], null, eventProduction(plague, 1, 3));
    expect(plagued.pan).toBe(3); // 4 x 0,75
    expect(plagued.madera).toBe(normal.madera);
    const feast = { key: "fiesta_san_aldric" as const };
    expect(dailyProduction({ ...levels }, [], null, eventProduction(feast, 1, 3)).pan).toBe(8);
    expect(eventProduction(feast, 1, 4)).toBeNull(); // solo el jueves
    const storm = eventProduction({ key: "tormenta_costa" }, 1, 5);
    expect(dailyProduction({ ...levels }, [{ type: "puerto" }], null, storm).oro).toBe(normal.oro);
  });

  it("combate: barro, fervor y la Paz del Rey", () => {
    const tiles = [
      tile(1, 0, 0, { owner: 1, troops: 6 }),
      tile(2, 1, 0, { owner: 2, troops: 4 }),
      tile(3, 0, 1, { troops: 4 }),
    ];
    const attack = [{ kind: "move" as const, house: 1, from: 1, to: 2, troops: 6 }];
    // 6 contra 4 x 1,25 = 5: gana. Con barro, 4 x 1,5 = 6: empate y resiste.
    expect(resolveCampaign({ resolution: 1, tiles, orders: attack }).tiles[1]!.owner).toBe(1);
    expect(resolveCampaign({ resolution: 1, tiles, orders: attack, ...eventCombat({ key: "caminos_embarrados" }) }).tiles[1]!.owner).toBe(2);
    const peace = resolveCampaign({ resolution: 1, tiles, orders: attack, ...eventCombat({ key: "paz_del_rey" }) });
    expect(peace.tiles[1]!.owner).toBe(2);
    expect(peace.tiles[0]!.troops).toBe(6);
    expect(peace.events).toContainEqual({ type: "paz", tile: 2, houses: [1] });
    // La paz no protege a las neutrales.
    const neutral = resolveCampaign({ resolution: 1, tiles, orders: [{ kind: "move", house: 1, from: 1, to: 3, troops: 6 }], peace: true });
    expect(neutral.tiles[2]!.owner).toBe(1);
  });

  it("repartos al momento", () => {
    const tiles = [
      tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 10 }),
      tile(2, 4, 0, { type: "castillo", owner: 2, castleOf: 2, troops: 3 }),
      tile(3, 1, 0, { owner: 1, troops: 1 }),
      tile(4, 2, 0, { owner: 1, troops: 2 }),
    ];
    const houses: EventHouse[] = [
      { house: 1, resources: res(100), prestige: 20, validTradesWeek: 3 },
      { house: 2, resources: res(50), prestige: 5, validTradesWeek: 1 },
      { house: 3, resources: res(10), prestige: 8, validTradesWeek: 0 },
    ];
    const tribute = applyEventNow({ key: "tributo_rey" }, tiles, houses, 1);
    expect(tribute.resources.get(1)).toEqual({ oro: -20 });
    expect(tribute.resources.get(2)).toEqual({ oro: -10 });
    expect(tribute.resources.get(3)).toEqual({ oro: 30 });
    expect(applyEventNow({ key: "llaves_rey" }, tiles, houses, 1).resources.get(1)).toEqual({ oro: 15 });
    expect(applyEventNow({ key: "torneo_real" }, tiles, houses, 1).resources.get(1)).toEqual({ oro: 20 });
    expect(applyEventNow({ key: "limosna_real" }, tiles, houses, 1).resources.get(2)).toEqual({ pan: 10, madera: 10, piedra: 10, hierro: 10, oro: 10 });
    expect(applyEventNow({ key: "levas_reales" }, tiles, houses, 1).castleTroops.get(3)).toBe(3);
    // Bandidos: la casa 1 tiene más casillas; atacan la más alejada de su castillo (la 4, con 2 tropas).
    const bandits = applyEventNow({ key: "bandidos" }, tiles, houses, 1);
    expect(bandits.log).toMatchObject({ house: 1, tile: 4, won: true });
    expect(bandits.tiles.find((t) => t.id === 4)).toMatchObject({ owner: null });
  });

  it("mantenimiento y subasta", () => {
    const tiles = [tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 9 })];
    expect(applyUpkeep(tiles, 1, 50, eventUpkeepFactor({ key: "paga_atrasada" })).cost).toBe(6);
    expect(applyUpkeep(tiles, 1, 50, eventUpkeepFactor({ key: "indulgencia_real" })).cost).toBe(0);
    const lots = auctionLots("s", 1).map(doubleLot);
    expect(lots[1]).toMatchObject({ kind: "card", count: 2 });
    expect(lotLabel(lots[1]!)).toMatch(/^2 cartas /);
  });
});
