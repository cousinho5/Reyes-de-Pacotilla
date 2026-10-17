import { describe, expect, it } from "vitest";
import { SHIELD_SHAPES, SHIELD_SYMBOLS, blazon, checkShield, freeShield, type Shield } from "../src";

const base: Shield = { color: "azur", shape: "espanol", division: "pleno", color2: null, symbol: "nabo", metal: "oro" };

describe("Escudos", () => {
  it("describe el escudo en lenguaje heráldico, con división y segundo color", () => {
    expect(blazon("azur", "nabo")).toBe("de azur con nabo de oro");
    expect(blazon("gules", "pato", "plata", "partido", "sinople")).toBe("partido de gules y sinople con pato de plata");
    expect(blazon("gules", "pato", "plata", "partido", null)).toBe("de gules con pato de plata");
  });

  it("acepta un escudo válido", () => {
    expect(checkShield(base, [])).toBeNull();
    expect(checkShield({ ...base, division: "tronchado", color2: "gules" }, [])).toBeNull();
  });

  it("rechaza valores inventados y divisiones sin segundo color o con el mismo", () => {
    expect(checkShield({ ...base, symbol: "unicornio" }, [])).toMatch(/símbolo/);
    expect(checkShield({ ...base, shape: "triangulo" }, [])).toMatch(/forma/);
    expect(checkShield({ ...base, metal: "bronce" }, [])).toMatch(/oro o de plata/);
    expect(checkShield({ ...base, division: "cortado", color2: null }, [])).toMatch(/segundo color/);
    expect(checkShield({ ...base, division: "cortado", color2: "azur" }, [])).toMatch(/distinto/);
    expect(checkShield({ ...base, color2: "gules" }, [])).toMatch(/pleno/);
  });

  it("no repite color ni la pareja forma y símbolo", () => {
    expect(checkShield(base, [{ color: "azur", shape: "rodela", symbol: "pato" }])).toMatch(/color/);
    expect(checkShield(base, [{ color: "gules", shape: "espanol", symbol: "nabo" }])).toMatch(/símbolo/);
    expect(checkShield(base, [{ color: "gules", shape: "rodela", symbol: "nabo" }])).toBeNull();
  });

  it("el primer escudo libre siempre es válido, también con la partida llena", () => {
    const others: Shield[] = [];
    for (let i = 0; i < 8; i++) {
      const s = freeShield(others);
      expect(checkShield(s, others)).toBeNull();
      others.push(s);
    }
    expect(SHIELD_SHAPES.length * SHIELD_SYMBOLS.length).toBe(80);
  });
});
