// Bloque 3: las casas que nombra el cronista, en su color y con su cuadradito en WhatsApp.
import { describe, expect, it } from "vitest";
import type { HouseInfo } from "../src/api";
import { splitByHouses, withSquares } from "../src/houseText";

const houses = [
  { id: 1, nombre: "Casa del Nabo", color: "azur", lema: null },
  { id: 2, nombre: "Los Pocapena", color: "gules", lema: null },
  { id: 3, nombre: "Casa del Nabo Real", color: "aguamarina", lema: null },
] as HouseInfo[];

describe("casas en el texto del cronista", () => {
  it("encuentra cada casa, con o sin mayúscula al principio, y la más larga primero", () => {
    const s = splitByHouses("La Casa del Nabo Real vence a los Pocapena y a la Casa del Nabo.", houses);
    expect(s.filter((x) => typeof x !== "string").map((x) => (x as { house: HouseInfo }).house.id)).toEqual([3, 2, 1]);
    expect(s.map((x) => (typeof x === "string" ? x : x.text)).join("")).toBe("La Casa del Nabo Real vence a los Pocapena y a la Casa del Nabo.");
  });

  it("no confunde un nombre con el principio de otra palabra", () => {
    const s = splitByHouses("Los Pocapenalandeses no existen.", houses);
    expect(s).toEqual(["Los Pocapenalandeses no existen."]);
  });

  it("pone el cuadradito del color delante de cada casa para WhatsApp", () => {
    expect(withSquares("Gana la Casa del Nabo; pierden los Pocapena.", houses)).toBe("Gana la 🟦Casa del Nabo; pierden 🟥los Pocapena.");
  });
});
