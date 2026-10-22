// Bloque 8, solicitud 3: nombres solemnes, Fray Abundio y proyección de la cola con alianzas.
import { describe, expect, it } from "vitest";
import { PHRASES, allianceName, battleLine, isAllianceName, planNights, writeBulletin, type Alliance, type BulletinInput, type Tile } from "../src";

const houses = [
  { id: 1, name: "Casa del Nabo", motto: null, color: "azur", symbol: "nabo", prestige: 20 },
  { id: 2, name: "Los Pocapena", motto: null, color: "gules", symbol: "lobo", prestige: 12 },
  { id: 3, name: "Gallina Bélica", motto: null, color: "sinople", symbol: "torre", prestige: 8 },
];
const base: BulletinInput = {
  seed: "s",
  week: 2,
  totalWeeks: 6,
  houses,
  previousLeader: 1,
  facts: [],
  tileNames: new Map([[10, "Villa Mediocre"]]),
  trades: [],
  bribes: [],
  used: [],
};
const joint = {
  tile: 10,
  winner: 1,
  previousOwner: 3,
  conquered: true,
  allies: [2],
  sides: [
    { house: 3, role: "defensa", strength: 5, troops: 5, supporters: [] },
    { house: 1, role: "ataque", strength: 6, troops: 6, supporters: [], joint: [2] },
    { house: 2, role: "ataque", strength: 4, troops: 4, supporters: [], joint: [1] },
  ],
};
const text = (b: ReturnType<typeof writeBulletin>) => [b.headline, ...b.sections.flatMap((s) => s.lines)].join("\n");

describe("nombres de las alianzas", () => {
  it("Fray Abundio compone el nombre con la semilla, bien concordado, y solo los suyos valen", () => {
    expect(allianceName("a")).toBe(allianceName("a"));
    const names = new Set(Array.from({ length: 200 }, (_, i) => allianceName(`semilla-${i}`)));
    expect(names.size).toBeGreaterThan(100);
    for (const n of names) {
      expect(isAllianceName(n)).toBe(true);
      expect(n).toMatch(/^(Alianza|Liga|Hermandad|Concordia|Santa Unión|Entente) (de la|del) /);
      expect(n).not.toMatch(/de la (Puente|Roble|Juramento|Estandarte|Cáliz|Nabo|Yelmo|Río)\b/);
    }
    expect(isAllianceName("Liga de los Listos")).toBe(false);
    expect(isAllianceName("Alianza de la Roca Eterna")).toBe(true);
  });
});

describe("Fray Abundio y las alianzas", () => {
  it("el ataque conjunto tiene su frase, con las tropas de las dos casas", () => {
    const b = writeBulletin({ ...base, facts: [{ type: "combate", data: joint }] });
    expect(b.used.some((k) => k.startsWith("combate.conjunto."))).toBe(true);
    expect(text(b)).toMatch(/\b10\b/);
    expect(text(b)).toContain("los Pocapena");
    const line = battleLine(joint, (id) => houses.find((h) => h.id === id)?.name, "Villa Mediocre", "s");
    expect(PHRASES["combate.conjunto"].some((p) => line != null && p.slice(-20) === line.slice(-20))).toBe(true);
  });

  it("si la defensa aguanta un ataque conjunto, también", () => {
    const held = { ...joint, winner: 3, conquered: false, allies: undefined };
    const b = writeBulletin({ ...base, facts: [{ type: "combate", data: held }] });
    expect(b.used.some((k) => k.startsWith("combate.conjunto_resiste."))).toBe(true);
    expect(text(b)).not.toMatch(/\{[^}]+\}/);
  });

  it("pactos firmados, rotos y terminados, y tropas que vuelven a casa", () => {
    const name = "Alianza de la Roca Eterna";
    const b = writeBulletin({
      ...base,
      facts: [
        { type: "alianza", data: { name, a: 1, b: 2 } },
        { type: "alianza_rota", data: { name, a: 1, b: 2, by: 2, endsAt: 7 } },
        { type: "alianza_fin", data: { name, a: 1, b: 2 } },
        { type: "expulsion", data: { house: 1, from: 10, to: 11, troops: 3 } },
      ],
    });
    const section = b.sections.find((s) => s.title === "Pactos y traiciones");
    expect(section?.lines).toHaveLength(4);
    expect(section!.lines.join("\n")).toContain(name);
    expect(section!.lines.join("\n")).toContain("Villa Mediocre");
    expect(text(b)).not.toMatch(/\{[^}]+\}/);
    expect(b.headline).toBe("PACTO ROTO EN EL REINO");
    expect(b.mood).toBe("escandalizado");
  });

  it("el último boletín da el título de Traidor de la Corona", () => {
    const b = writeBulletin({ ...base, final: { objectives: [], patron: null, traitor: { house: 2, broken: 2 } } });
    expect(text(b)).toContain("Traidor de la Corona para los Pocapena, que ha roto 2 alianzas");
  });

  it("los avisos tienen sus frases, sin variables desconocidas", () => {
    for (const key of ["aviso.propuesta", "aviso.aceptada", "aviso.rota", "aviso.tropas_dentro", "aviso.ordenes_anuladas"] as const) {
      expect(PHRASES[key].length).toBeGreaterThanOrEqual(2);
      for (const p of PHRASES[key]) for (const v of p.match(/\{[^}]+\}/g) ?? []) expect(["{jugador}", "{pacto}", "{n}", "{día}"]).toContain(v);
    }
  });
});

describe("órdenes en cola con alianzas", () => {
  const field = (id: number, x: number, owner: number | null, troops: number): Tile => ({ id, x, y: 0, type: "campos", owner, troops });
  it("la marcha a una casilla aliada es una entrada en la proyección de la cola", () => {
    const tiles = [field(1, 0, 1, 6), field(2, 1, 2, 2)];
    const alliances: Alliance[] = [{ a: 1, b: 2, status: "active", endsAt: null, since: 1 }];
    const move = { kind: "move" as const, house: 1, from: 1, to: 2, troops: 4 };
    const allied = planNights(tiles, [[move]], 1, null, 1, alliances);
    expect(allied[0]!.tiles.find((t) => t.id === 2)).toMatchObject({ owner: 2, troops: 2, guests: [{ house: 1, troops: 4 }] });
    const enemy = planNights(tiles, [[move]], 1, null, 1);
    expect(enemy[0]!.tiles.find((t) => t.id === 2)!.owner).toBe(1);
  });
});
