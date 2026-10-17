import { describe, expect, it } from "vitest";
import { PHRASES, blazon, bulletinText, houseInSentence, writeBulletin, type BulletinInput } from "../src";

const houses = [
  { id: 1, name: "Casa del Nabo", motto: "Jamás retroceder", color: "azur", symbol: "nabo", prestige: 20 },
  { id: 2, name: "Los Pocapena", motto: null, color: "gules", symbol: "gallina", prestige: 12 },
  { id: 3, name: "Gallina Bélica", motto: "Cacarea fuerte", color: "sinople", symbol: "lobo", prestige: 8 },
];

const base: BulletinInput = {
  seed: "s",
  week: 2,
  totalWeeks: 6,
  houses,
  previousLeader: 1,
  facts: [
    {
      type: "combate",
      data: {
        tile: 10,
        winner: 2,
        previousOwner: 1,
        conquered: true,
        sides: [
          { house: 1, role: "defensa", strength: 5, troops: 4, supporters: [] },
          { house: 2, role: "ataque", strength: 9, troops: 9, supporters: [] },
        ],
      },
    },
    {
      type: "combate",
      data: {
        tile: 11,
        winner: 3,
        previousOwner: null,
        conquered: true,
        sides: [
          { house: null, role: "defensa", strength: 5, troops: 4, supporters: [] },
          { house: 3, role: "ataque", strength: 7, troops: 7, supporters: [] },
        ],
      },
    },
    { type: "subasta", data: { slot: 1, lot: "30 de Hierro", winner: 3, price: 12 } },
  ],
  tileNames: new Map([
    [10, "Villa Mediocre"],
    [11, "La Vega Regular"],
  ]),
  trades: [{ a: 1, b: 2 }],
  bribes: [{ house: 2, template: 3, amount: 10 }],
  used: [],
};

describe("Boletín de Fray Abundio", () => {
  it("cifras exactas, nombres con artículo y sin variables sin rellenar", () => {
    const b = writeBulletin(base);
    const all = [b.headline, ...b.sections.flatMap((s) => s.lines), ...b.margin, ...b.sponsors].join("\n");
    expect(all).not.toMatch(/\{[^}]+\}/);
    expect(all).toContain("Villa Mediocre");
    expect(all).toMatch(/\b9\b/); // tropas del ganador
    expect(all).toContain("30 de Hierro");
    expect(all).toContain("12 de Oro");
    expect(b.sections[0]!.lines[0]).toContain("20"); // Prestigio del líder
    expect(b.headline).toBe("1 CASILLA CAMBIA DE BANDERA");
    // El lema de la Casa del Nabo ("Jamás retroceder") contra la realidad: ha perdido una casilla.
    expect(all).toContain("Jamás retroceder");
    // Soborno: la frase comprada y el pie de patrocinio.
    const bought = PHRASES["soborno.frase"][3].replace("{jugador}", "los Pocapena");
    expect(all).toContain(bought.charAt(0).toUpperCase() + bought.slice(1));
    expect(b.sponsors.join(" ")).toContain("10 de Oro");
  });

  it("no repite frases ya usadas y es determinista", () => {
    const a = writeBulletin(base);
    expect(writeBulletin(base)).toEqual(a);
    const b = writeBulletin({ ...base, used: a.used });
    for (const k of b.used.filter((k) => !k.startsWith("soborno"))) {
      const [cat] = k.split(/\.(?=\d+$)/);
      const total = PHRASES[cat as keyof typeof PHRASES].length;
      if (total > 2) expect(a.used).not.toContain(k);
    }
  });

  it("cambio de líder, presentación de las casas y semana tranquila", () => {
    const first = writeBulletin({ ...base, week: 1, previousLeader: null, facts: [], trades: [], bribes: [] });
    expect(first.sections.map((s) => s.title)).toContain("Los pretendientes");
    expect(first.sections.find((s) => s.title === "Los pretendientes")!.lines).toHaveLength(4); // 3 casas + la gallina
    expect(first.headline).toBe("SEMANA TRANQUILA EN ALDRICIA");
    const changed = writeBulletin({ ...base, previousLeader: 2 });
    expect(changed.sections[0]!.title).toBe("Nuevo favorito");
    expect(changed.headline).toMatch(/^NUEVO FAVORITO/);
  });

  it("la cara de Fray Abundio va con lo que cuenta", () => {
    expect(writeBulletin(base).mood).toBe("escandalizado");
    expect(writeBulletin({ ...base, previousLeader: 2 }).mood).toBe("adulador");
    expect(writeBulletin({ ...base, facts: [], trades: [] }).mood).toBe("dormido");
    expect(writeBulletin({ ...base, facts: base.facts.slice(1) }).mood).toBe("solemne");
  });

  it("presenta los escudos con su división", () => {
    const b = writeBulletin({
      ...base,
      week: 1,
      previousLeader: null,
      houses: [{ ...houses[0]!, division: "partido", color2: "gules" }, houses[1]!, houses[2]!],
    });
    expect(b.sections.flatMap((s) => s.lines).join("\n")).toContain("partido de azur y gules con nabo de oro");
  });

  it("el último boletín revela los objetivos y el Mecenas de la Mentira", () => {
    const b = writeBulletin({
      ...base,
      week: 6,
      final: {
        objectives: [
          { house: 1, text: "Terminar con 150 de Oro o más en el tesoro.", met: true },
          { house: 2, text: "Controlar 5 casillas o más al final.", met: false },
          { house: 3, text: "Ganar 3 lotes de la Gran Subasta.", met: false },
        ],
        patron: { house: 2, gold: 30 },
      },
    });
    const veils = b.sections.find((s) => s.title === "Se levantan los velos")!;
    expect(veils.lines).toHaveLength(4);
    expect(veils.lines.join(" ")).toContain("terminar con 150 de Oro");
    expect(veils.lines[3]).toContain("Mecenas de la Mentira");
    expect(b.headline).toMatch(/^FIN DEL INTERREGNO/);
  });

  it("concuerda el género de edificios y lotes", () => {
    for (let i = 0; i < 8; i++) {
      const b = writeBulletin({
        ...base,
        seed: `g${i}`,
        facts: [
          { type: "mejora", data: { house: 1, edificio: "granja", nivel: 4 } },
          { type: "subasta", data: { slot: 2, lot: "la carta Tregua", winner: 2, price: 7 } },
        ],
      });
      const all = b.sections.flatMap((x) => x.lines).join(" ");
      expect(all).not.toMatch(/el Granja|Nuevo Granja|es suyo/);
      expect(all).not.toMatch(/\. [a-z]/);
    }
  });

  it("textos de apoyo: escudo, artículos y versión para WhatsApp", () => {
    expect(blazon("purpura", "dragon", "plata")).toBe("de púrpura con dragón de plata");
    expect(houseInSentence("Casa del Nabo")).toBe("la Casa del Nabo");
    expect(houseInSentence("Los Pocapena")).toBe("los Pocapena");
    const text = bulletinText(writeBulletin(base), "Primer interregno");
    expect(text).toMatch(/^\*1 CASILLA CAMBIA DE BANDERA\*/);
    expect(text).toContain("Fray Abundio");
  });
});
