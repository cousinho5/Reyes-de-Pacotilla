import { describe, expect, it } from "vitest";
import { BATTLE_TWEAKS, FORTIFY_FOREVER, applyUpkeep, checkFortify, checkRecruit, checkUpgrade, lastPlace, projectForHouse, withRhythm, type Tile } from "../src";

const rich = { pan: 100, madera: 100, piedra: 100, hierro: 100, oro: 100 };
const poor = { pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 0 };
const levels = { granja: 2, aserradero: 2, cantera: 1, mina: 1, mercado: 5 } as const;

describe("Acciones", () => {
  it("mejorar: coste del siguiente nivel, sin pasar de 5 y sin recursos negativos", () => {
    expect(checkUpgrade({ ...levels }, "cantera", rich)).toEqual({
      ok: true,
      value: { cost: { madera: 17, piedra: 12, oro: 5 }, newLevel: 2 },
    });
    expect(checkUpgrade({ ...levels }, "mercado", rich).ok).toBe(false);
    expect(checkUpgrade({ ...levels }, "cantera", poor).ok).toBe(false);
  });

  it("reclutar: 2 Hierro y 2 Pan por tropa", () => {
    expect(checkRecruit(5, rich)).toEqual({ ok: true, value: { cost: { hierro: 10, pan: 10 } } });
    expect(checkRecruit(5, poor).ok).toBe(false);
    expect(checkRecruit(0, rich).ok).toBe(false);
  });

  it("fortificar: solo casillas propias, no castillos; dura hasta que la atacan", () => {
    const tile: Tile = { id: 1, x: 0, y: 0, type: "campos", owner: 1, troops: 3 };
    expect(checkFortify(tile, 1, 3, rich)).toMatchObject({ ok: true, value: { fortifiedUntil: FORTIFY_FOREVER } });
    expect(checkFortify({ ...tile, fortifiedUntil: FORTIFY_FOREVER }, 1, 3, rich).ok).toBe(false);
    expect(checkFortify(tile, 2, 3, rich).ok).toBe(false);
    expect(checkFortify({ ...tile, type: "castillo" }, 1, 3, rich).ok).toBe(false);
  });

  it("sin el retoque del bloque 4, fortificar dura cuatro resoluciones (dos con el ritmo antiguo)", () => {
    BATTLE_TWEAKS.fortifyUntilAttacked = false;
    const tile: Tile = { id: 1, x: 0, y: 0, type: "campos", owner: 1, troops: 3 };
    expect(checkFortify(tile, 1, 3, rich)).toMatchObject({ ok: true, value: { fortifiedUntil: 6 } });
    expect(checkFortify({ ...tile, fortifiedUntil: 6 }, 1, 3, rich).ok).toBe(false);
    expect(withRhythm({ days: [2, 6], fortify: 2 }, () => checkFortify(tile, 1, 3, rich))).toMatchObject({
      ok: true,
      value: { fortifiedUntil: 4 },
    });
    expect(checkFortify(tile, 2, 3, rich).ok).toBe(false);
    BATTLE_TWEAKS.fortifyUntilAttacked = true;
  });
});

describe("Mantenimiento del domingo", () => {
  const tiles: Tile[] = [
    { id: 1, x: 0, y: 0, type: "castillo", owner: 1, troops: 8, castleOf: 1 },
    { id: 2, x: 1, y: 0, type: "campos", owner: 1, troops: 4 },
    { id: 3, x: 2, y: 0, type: "bosque", owner: 1, troops: 4 },
  ];

  it("con Pan suficiente se paga y no deserta nadie", () => {
    expect(applyUpkeep(tiles, 1, 10)).toMatchObject({ cost: 6, paid: 6, deserted: 0 });
  });

  it("sin Pan desertan primero las tropas más alejadas del castillo", () => {
    const r = applyUpkeep(tiles, 1, 2); // 16 tropas cuestan 6; faltan 4 Pan: desertan 12 tropas
    expect(r).toMatchObject({ cost: 6, paid: 2, deserted: 12 });
    expect(r.tiles.map((t) => t.troops)).toEqual([4, 0, 0]);
  });
});

describe("Niebla de guerra", () => {
  it("solo se ven las tropas de las casillas propias y adyacentes", () => {
    const tiles: Tile[] = [
      { id: 1, x: 0, y: 0, type: "castillo", owner: 1, troops: 6, castleOf: 1 },
      { id: 2, x: 1, y: 0, type: "campos", owner: null, troops: 4 },
      { id: 3, x: 2, y: 0, type: "bosque", owner: 2, troops: 9, fortifiedUntil: 5 },
    ];
    const seen = projectForHouse(tiles, 1);
    expect(seen[1]).toMatchObject({ visible: true, troops: 4 });
    expect(seen[2]).toMatchObject({ visible: false, troops: null, fortifiedUntil: null, owner: 2 });
  });
});

describe("Último en Prestigio", () => {
  it("elige el menor total; en empate, la casa de menor id", () => {
    expect(lastPlace([{ house: 3, total: 5 }, { house: 2, total: 5 }, { house: 1, total: 9 }])).toBe(2);
  });
});
